# Solidity API

## ERC20StakingContract

This contract allows users to stake and earn rewards in the same ERC20 token.

_The owner must supply tokens to be used as the reward. The APR, withdrawal period, and early withdrawal
     penalty are configurable by the owner._

### SECONDS_IN_A_YEAR

```solidity
uint256 SECONDS_IN_A_YEAR
```

### stakingToken

```solidity
contract IERC20 stakingToken
```

### apr

```solidity
uint256 apr
```

### stakingEnabled

```solidity
bool stakingEnabled
```

### stakedBalances

```solidity
mapping(address => uint256) stakedBalances
```

### lastUpdateTime

```solidity
mapping(address => uint256) lastUpdateTime
```

### rewards

```solidity
mapping(address => uint256) rewards
```

### constructor

```solidity
constructor(address _stakingToken) public
```

### depositRewards

```solidity
function depositRewards(uint256 amount) external
```

Deposits a specified amount of tokens into the contract to be used as rewards.

_This function increases the reward balance and transfers the specified amount of tokens
     from the owner's address to the contract. The `transferFrom` function of the ERC20 token
     is used for transfer, which requires that the contract must have been given an allowance
     by the owner for at least `amount` tokens.
     Can only be called by the contract owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of tokens to deposit as rewards. |

### withdrawRewards

```solidity
function withdrawRewards() external
```

Allows the contract owner to withdraw all remaining reward tokens from the contract.

_This function transfers the remaining reward balance to the owner's address.
     It can only be called when staking is disabled to prevent interfering with ongoing staking rewards.
     Requires staking to be disabled (stakingEnabled = false).
     Can only be called by the contract owner._

### updateAPR

```solidity
function updateAPR(uint256 newAPR) external
```

Updates the APR (Annual Percentage Rate) for the staking contract.

_Sets the APR for reward calculation, represented in basis points.
     Can only be called by the contract owner._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| newAPR | uint256 | The new APR value in basis points (1% = 100 basis points). |

### enableStaking

```solidity
function enableStaking() external
```

Enables staking functionality in the contract.

_Sets the `stakingEnabled` flag to true, allowing users to stake tokens.
     Can only be called by the contract owner.
     Requires that the reward balance is greater than zero_

### disableStaking

```solidity
function disableStaking() external
```

Disables staking functionality in the contract.

_Sets the `stakingEnabled` flag to false, preventing any further staking of tokens.
     Unstaking can always be performed, regardless of this flag
     Can only be called by the contract owner._

### stake

```solidity
function stake(uint256 amount) external
```

Allows a user to stake a specified amount of tokens in the contract.

_Transfers the specified amount of tokens from the user's address to this contract
     using the ERC20 `transferFrom` method. The caller must have already set a sufficient
     allowance for this contract to transfer the tokens. Staked tokens begin accruing rewards
     immediately based on the current APR. 
     This function can only be executed when staking is enabled._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The number of tokens the user wishes to stake. |

### unstake

```solidity
function unstake(uint256 amount) external
```

Allows a user to unstake a specified amount of tokens.

_Transfers the specified amount of tokens from the contract back to the user's address.
     Requires that the user has at least 'amount' of tokens staked._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| amount | uint256 | The amount of tokens to be unstaked. |

### claimRewards

```solidity
function claimRewards() external
```

Allows a user to claim their accumulated staking rewards.

_Transfers the accumulated rewards to the user's address.
     Disables staking if the reward pool is depleted.
     Requires that staking is enabled
     Requires that there are rewards left to distribute
     Requires that the user has rewards available to claim._

### unstakeAndClaimRewards

```solidity
function unstakeAndClaimRewards() external
```

Allows a user to unstake all their staked tokens and claim their rewards in one transaction.

_Unstakes all tokens staked by the user, updates their reward, and transfers both the staked tokens
     and the rewards back to the user. 
     Disables staking if the reward pool is depleted.
     Requires that staking is enabled
     Requires that there are rewards left to distribute
     Requires that the user has tokens staked._

### updateRewards

```solidity
function updateRewards(address user) internal
```

Updates the reward for a given user.

_Calculates and accrues rewards for the user based on the staked amount and time staked.
     Rewards are calculated using the current APR and the time elapsed since the last reward update._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user for whom to update rewards. |

### calculateCurrentRewards

```solidity
function calculateCurrentRewards(address user) public view returns (uint256)
```

Calculates the current accrued rewards for a given user.

_Computes the rewards accrued since the last update, adds them to the user's current rewards balance,
     and returns the total. The calculation is based on the staked amount, APR, and time elapsed._

#### Parameters

| Name | Type | Description |
| ---- | ---- | ----------- |
| user | address | The address of the user for whom to calculate current rewards. |

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total accrued rewards for the given user. |

### totalStaked

```solidity
function totalStaked() public view returns (uint256)
```

Returns the total amount of tokens staked in the contract.

_Provides the sum of all tokens staked by all users in the contract._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The total staked tokens. |

### rewardBalance

```solidity
function rewardBalance() public view returns (uint256)
```

Returns the current balance of reward tokens in the contract.

_Provides the total amount of reward tokens available for distribution to stakers._

#### Return Values

| Name | Type | Description |
| ---- | ---- | ----------- |
| [0] | uint256 | The balance of reward tokens in the contract. |

## IERC20

### totalSupply

```solidity
function totalSupply() external view returns (uint256)
```

### balanceOf

```solidity
function balanceOf(address account) external view returns (uint256)
```

### allowance

```solidity
function allowance(address owner, address spender) external view returns (uint256)
```

### transfer

```solidity
function transfer(address recipient, uint256 amount) external returns (bool)
```

### approve

```solidity
function approve(address spender, uint256 amount) external returns (bool)
```

### transferFrom

```solidity
function transferFrom(address sender, address recipient, uint256 amount) external returns (bool)
```

### Transfer

```solidity
event Transfer(address from, address to, uint256 value)
```

### Approval

```solidity
event Approval(address owner, address spender, uint256 value)
```

## SafeMath

### sub

```solidity
function sub(uint256 a, uint256 b) internal pure returns (uint256)
```

### add

```solidity
function add(uint256 a, uint256 b) internal pure returns (uint256)
```

## TestToken

### name

```solidity
string name
```

### symbol

```solidity
string symbol
```

### decimals

```solidity
uint8 decimals
```

### totalSupply

```solidity
uint256 totalSupply
```

### balances

```solidity
mapping(address => uint256) balances
```

### allowed

```solidity
mapping(address => mapping(address => uint256)) allowed
```

### constructor

```solidity
constructor() public
```

### balanceOf

```solidity
function balanceOf(address tokenOwner) public view returns (uint256)
```

### transfer

```solidity
function transfer(address receiver, uint256 numTokens) public returns (bool)
```

### approve

```solidity
function approve(address delegate, uint256 numTokens) public returns (bool)
```

### allowance

```solidity
function allowance(address owner, address delegate) public view returns (uint256)
```

### transferFrom

```solidity
function transferFrom(address owner, address buyer, uint256 numTokens) public returns (bool)
```

