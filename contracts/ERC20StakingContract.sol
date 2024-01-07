// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @author Baboolian
/// @title Staking Contract
/// @notice This contract allows users to stake and earn rewards in the same ERC20 token.
/// @dev The owner must supply tokens to be used as the reward. The APR, withdrawal period, and early withdrawal
///      penalty are configurable by the owner.
contract ERC20StakingContract is Ownable, ReentrancyGuard {
    uint256 constant SECONDS_IN_A_YEAR = 365 * 24 * 60 * 60;

    IERC20 public stakingToken;
    uint256 public apr; // Annual Percentage Rate (APR) in basis points. 1000 == 10% APR
    bool public stakingEnabled = true;

    mapping(address => uint256) public stakedBalances;
    mapping(address => uint256) public lastUpdateTime;
    mapping(address => uint256) public rewards;

    uint256 private _totalStaked;
    uint256 private _rewardBalance;

    constructor(address _stakingToken) {
        stakingToken = IERC20(_stakingToken);
        apr = 1000; // 10% APR in basis points
    }

    /// @notice Deposits a specified amount of tokens into the contract to be used as rewards.
    /// @dev This function increases the reward balance and transfers the specified amount of tokens
    ///      from the owner's address to the contract. The `transferFrom` function of the ERC20 token
    ///      is used for transfer, which requires that the contract must have been given an allowance
    ///      by the owner for at least `amount` tokens.
    ///      Can only be called by the contract owner.
    /// @param amount The amount of tokens to deposit as rewards.
    function depositRewards(uint256 amount) external onlyOwner {
        _rewardBalance += amount;
        stakingToken.transferFrom(msg.sender, address(this), amount);
    }

    /// @notice Allows the contract owner to withdraw all remaining reward tokens from the contract.
    /// @dev This function transfers the remaining reward balance to the owner's address.
    ///      It can only be called when staking is disabled to prevent interfering with ongoing staking rewards.
    ///      Requires staking to be disabled (stakingEnabled = false).
    ///      Can only be called by the contract owner.
    function withdrawRewards() external onlyOwner {
        require(!stakingEnabled, "Staking must be disabled to withdraw rewards");
        uint256 remainingRewards = _rewardBalance;
        _rewardBalance = 0;
        stakingToken.transfer(msg.sender, remainingRewards);
    }

    /// @notice Updates the APR (Annual Percentage Rate) for the staking contract.
    /// @dev Sets the APR for reward calculation, represented in basis points.
    ///      Can only be called by the contract owner.
    /// @param newAPR The new APR value in basis points (1% = 100 basis points).
    function updateAPR(uint256 newAPR) external onlyOwner {
        apr = newAPR;
    }

    /// @notice Enables staking functionality in the contract.
    /// @dev Sets the `stakingEnabled` flag to true, allowing users to stake tokens.
    ///      Can only be called by the contract owner.
    ///      Requires that the reward balance is greater than zero
    function enableStaking() external onlyOwner {
        require(_rewardBalance > 0, "Deposit reward tokens before enabling staking");
        stakingEnabled = true;
    }

    /// @notice Disables staking functionality in the contract.
    /// @dev Sets the `stakingEnabled` flag to false, preventing any further staking of tokens.
    ///      Unstaking can always be performed, regardless of this flag
    ///      Can only be called by the contract owner.
    function disableStaking() external onlyOwner {
        stakingEnabled = false;
    }

    /// @notice Allows a user to stake a specified amount of tokens in the contract.
    /// @dev Transfers the specified amount of tokens from the user's address to this contract
    ///      using the ERC20 `transferFrom` method. The caller must have already set a sufficient
    ///      allowance for this contract to transfer the tokens. Staked tokens begin accruing rewards
    ///      immediately based on the current APR. 
    ///      This function can only be executed when staking is enabled.
    /// @param amount The number of tokens the user wishes to stake.
    function stake(uint256 amount) external nonReentrant {
        require(stakingEnabled, "Staking is currently disabled");
        updateRewards(msg.sender);
        stakedBalances[msg.sender] += amount;
        _totalStaked += amount;
        stakingToken.transferFrom(msg.sender, address(this), amount);
    }

    /// @notice Allows a user to unstake a specified amount of tokens.
    /// @dev Transfers the specified amount of tokens from the contract back to the user's address.
    ///      Requires that the user has at least 'amount' of tokens staked.
    /// @param amount The amount of tokens to be unstaked.
    function unstake(uint256 amount) external nonReentrant {
        require(stakedBalances[msg.sender] >= amount, "Insufficient balance to unstake");
        updateRewards(msg.sender);
        stakedBalances[msg.sender] -= amount;
        _totalStaked -= amount;
        stakingToken.transfer(msg.sender, amount);
    }

    /// @notice Allows a user to claim their accumulated staking rewards.
    /// @dev Transfers the accumulated rewards to the user's address.
    ///      Disables staking if the reward pool is depleted.
    ///      Requires that staking is enabled
    ///      Requires that there are rewards left to distribute
    ///      Requires that the user has rewards available to claim.
    function claimRewards() external nonReentrant {
        require(stakingEnabled, "Staking is currently disabled");
        require(_rewardBalance > 0, "There are no rewards left to distribute");
        updateRewards(msg.sender);
        uint256 reward = rewards[msg.sender];
        require(reward > 0, "No rewards available");

        if (_rewardBalance < reward) {
            reward = _rewardBalance; // Adjust the reward to the remaining balance
            stakingEnabled = false; // Disable staking if the reward pool is depleted
        }

        rewards[msg.sender] = 0;
        _rewardBalance -= reward;
        stakingToken.transfer(msg.sender, reward);
    }

    /// @notice Allows a user to unstake all their staked tokens and claim their rewards in one transaction.
    /// @dev Unstakes all tokens staked by the user, updates their reward, and transfers both the staked tokens
    ///      and the rewards back to the user. 
    ///      Disables staking if the reward pool is depleted.
    function unstakeAndClaimRewards() external nonReentrant {
        uint256 stakedAmount = stakedBalances[msg.sender];
        require(stakedAmount > 0, "No tokens to unstake");

        // Update rewards before making any transfers
        updateRewards(msg.sender);

        // Calculate rewards
        uint256 reward = rewards[msg.sender];
        if (_rewardBalance < reward) {
            reward = _rewardBalance; // Adjust the reward to the remaining balance
            stakingEnabled = false; // Disable staking if the reward pool is depleted
        }

        // Update the state
        stakedBalances[msg.sender] = 0;
        _totalStaked -= stakedAmount;
        rewards[msg.sender] = 0;
        _rewardBalance -= reward;

        // Transfer unstaked and reward tokens
        stakingToken.transfer(msg.sender, stakedAmount + reward);
    }

    /// @notice Updates the reward for a given user.
    /// @dev Calculates and accrues rewards for the user based on the staked amount and time staked.
    ///      Rewards are calculated using the current APR and the time elapsed since the last reward update.
    /// @param user The address of the user for whom to update rewards.
    function updateRewards(address user) internal {
        uint256 staked = stakedBalances[user];
        if (staked > 0) {
            uint256 timeDiff = block.timestamp - lastUpdateTime[user];
            uint256 reward = staked * apr * timeDiff / SECONDS_IN_A_YEAR / 10000;
            rewards[user] += reward;
        }
        lastUpdateTime[user] = block.timestamp;
    }

    /// @notice Calculates the current accrued rewards for a given user.
    /// @dev Computes the rewards accrued since the last update, adds them to the user's current rewards balance,
    ///      and returns the total. The calculation is based on the staked amount, APR, and time elapsed.
    /// @param user The address of the user for whom to calculate current rewards.
    /// @return The total accrued rewards for the given user.
    function calculateCurrentRewards(address user) public view returns (uint256) {
        uint256 staked = stakedBalances[user];
        if (staked == 0) {
            return rewards[user];
        }
        uint256 timeDiff = block.timestamp - lastUpdateTime[user];
        uint256 accruedRewards = staked * apr * timeDiff / SECONDS_IN_A_YEAR / 10000; 
        return rewards[user] + accruedRewards;
    }

    /// @notice Returns the total amount of tokens staked in the contract.
    /// @dev Provides the sum of all tokens staked by all users in the contract.
    /// @return The total staked tokens.
    function totalStaked() public view returns (uint256) {
        return _totalStaked;
    }

    /// @notice Returns the current balance of reward tokens in the contract.
    /// @dev Provides the total amount of reward tokens available for distribution to stakers.
    /// @return The balance of reward tokens in the contract.
    function rewardBalance() public view returns (uint256) {
        return _rewardBalance;
    }
}
