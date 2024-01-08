const { expect } = require("chai")
const { ethers } = require("hardhat")
const { time } = require("@nomicfoundation/hardhat-network-helpers")
const { evm } = network

describe("ERC20StakingContract", function () {
    let owner
    let user1
    let user2
    let testToken
    let stakingContract

    beforeEach(async () => {
        [owner, user1, user2] = await ethers.getSigners()

        // Deploy TestToken
        const TestToken = await ethers.getContractFactory("TestToken")
        testToken = await TestToken.deploy() // Deploy with constructor values
        console.log(`TestToken is deployed at address: ${testToken.target}`)

        // Deploy ERC20StakingContract and pass the address of the deployed TestToken
        const StakingContract = await ethers.getContractFactory("ERC20StakingContract")
        stakingContract = await StakingContract.deploy(testToken.target, 1000n)
        console.log(`ERC20StakingContract is deployed at address: ${stakingContract.target}`)

        await testToken.connect(owner).transfer(user1.address, ethers.parseEther("1000000"))
        await testToken.connect(owner).transfer(user2.address, ethers.parseEther("2000000"))
    })

    it("Should allow owner to add rewards", async function () {
        const amountToDeposit1 = ethers.parseEther("10000000")
        const amountToDeposit2 = ethers.parseEther("30004000")

        // Approve staking contract to spend test tokens on behalf of the owner
        await testToken.connect(owner).approve(stakingContract.target, amountToDeposit1 + amountToDeposit2)

        // Deposit in two transactions
    	await stakingContract.connect(owner).depositRewards(amountToDeposit1)
    	await stakingContract.connect(owner).depositRewards(amountToDeposit2)

    	// Check the reward balance is equal to what was deposited
    	const stakingRewardBalance = await stakingContract.rewardBalance()
    	expect(stakingRewardBalance).to.equal(amountToDeposit1 + amountToDeposit2)
    })

    it("Should allow owner to withdraw rewards", async function () {
        const ownerStartingBalance = await testToken.balanceOf(owner.address)
        const amountToDeposit1 = ethers.parseEther("10000000")
        const amountToDeposit2 = ethers.parseEther("30004000")

        // Approve staking contract to spend test tokens on behalf of the owner
        await testToken.connect(owner).approve(stakingContract.target, amountToDeposit1 + amountToDeposit2)

        // Deposit in two transactions
        await stakingContract.connect(owner).depositRewards(amountToDeposit1)
        await stakingContract.connect(owner).depositRewards(amountToDeposit2)

        // Withdraw rewards
        await stakingContract.connect(owner).disableStaking()
        await stakingContract.connect(owner).withdrawRewards()

        // Check the reward balance on the staking contract is 0
        stakingContractRewardBalance = await stakingContract.rewardBalance()
        expect(stakingContractRewardBalance).to.equal(0)

        // Check the owner balance is equal to the starting value
        const ownerFinalBalance = await testToken.balanceOf(owner.address)
        expect(ownerFinalBalance).to.equal(ownerStartingBalance)
    })

    it("Should allow users to stake tokens", async function () {
		const amountToStake = ethers.parseEther("100")
        
        // Approve staking contract to spend test tokens on behalf of the user
        await testToken.connect(user1).approve(stakingContract.target, amountToStake)

        // User1 stakes tokens
        await stakingContract.connect(user1).stake(amountToStake)

        // Check user1's staked balance
        const user1StakedBalance = await stakingContract.stakedBalances(user1.address)
        expect(user1StakedBalance).to.equal(amountToStake)
    })

    it("Should not allow users to stake when staking is disabled", async function () {
        await stakingContract.connect(owner).disableStaking()

        const amountToStake = ethers.parseEther("1")
        
        // Approve staking contract to spend test tokens on behalf of the user
        await testToken.connect(user1).approve(stakingContract.target, amountToStake)

        // User1 tries to stake tokens when staking is disabled
        await expect(stakingContract.connect(user1).stake(amountToStake)).to.be.revertedWith("Staking is currently disabled")
    })

    it("Should allow users to unstake tokens", async function () {
        const amountToStake = ethers.parseEther("1000")
        
        // Approve staking contract to spend test tokens on behalf of the user
        await testToken.connect(user1).approve(stakingContract.target, amountToStake)

        // User1 stakes tokens
        await stakingContract.connect(user1).stake(amountToStake)

        // Disable staking. This should not interfere with unstaking
        await stakingContract.connect(owner).disableStaking()

        // User1 unstakes tokens
        await stakingContract.connect(user1).unstake(amountToStake)

        // Check user1's staked balance (should be 0 after unstaking)
        const user1StakedBalance = await stakingContract.stakedBalances(user1.address)
        expect(user1StakedBalance).to.equal(ethers.parseEther("0"))
    })

    it("Should not allow users to unstake more tokens than their staked balance", async function () {
        const amountToStake = ethers.parseEther("1000")

        // Approve staking contract to spend test tokens on behalf of the user
        await testToken.connect(user1).approve(stakingContract.target, amountToStake)

        // User1 stakes tokens
        await stakingContract.connect(user1).stake(amountToStake)

        // Disable staking. This should not interfere with unstaking
        await stakingContract.connect(owner).disableStaking()

        // User1 tries to unstake more tokens than their staking balance
        const amountToUnstake = amountToStake + ethers.parseEther("1")
        await expect(stakingContract.connect(user1).unstake(amountToUnstake)).to.be.revertedWith("Insufficient balance to unstake")
    })

    it("Should allow users to claim rewards", async function() {
        const amountToDepositAsRewards = ethers.parseEther("10000000000")
        const user1InitialBalance = await testToken.balanceOf(user1.address)
        const amountToStake = user1InitialBalance

        // Deposit rewards into the staking contract
        await testToken.connect(owner).approve(stakingContract.target, amountToDepositAsRewards)
    	await stakingContract.connect(owner).depositRewards(amountToDepositAsRewards)

        // User1 stakes tokens
        await testToken.connect(user1).approve(stakingContract.target, amountToStake)
        await stakingContract.connect(user1).stake(amountToStake)

        // Increase the timestamp to simulate 1 year passing
        const oneYear = 365 * 24 * 60 * 60
        const currentBlockNum = await ethers.provider.getBlockNumber();
        const currentTime = await ethers.provider.getBlock(currentBlockNum);
        await time.setNextBlockTimestamp(currentTime.timestamp + oneYear);

        // User1 claims rewards
        await stakingContract.connect(user1).claimRewards()

        // Check user1's token balance reflects the expected rewards
        const apr = await stakingContract.apr();
        const expectedUser1Rewards = amountToStake * apr / 10000n
        const user1FinalBalance = await testToken.balanceOf(user1.address)
        expect(user1FinalBalance).to.equal(expectedUser1Rewards)
    })

    it("Should allow users to claim partial rewards", async function() {
        const amountToDepositAsRewards = ethers.parseEther("1")
        const user1InitialBalance = await testToken.balanceOf(user1.address)
        const amountToStake = user1InitialBalance

        // Deposit rewards into the staking contract
        await testToken.connect(owner).approve(stakingContract.target, amountToDepositAsRewards)
        await stakingContract.connect(owner).depositRewards(amountToDepositAsRewards)

        // User1 stakes tokens
        await testToken.connect(user1).approve(stakingContract.target, amountToStake)
        await stakingContract.connect(user1).stake(amountToStake)

        // Increase the timestamp to simulate 1 year passing
        const oneYear = 365 * 24 * 60 * 60
        const currentBlockNum = await ethers.provider.getBlockNumber();
        const currentTime = await ethers.provider.getBlock(currentBlockNum);
        await time.setNextBlockTimestamp(currentTime.timestamp + oneYear);

        // User1 claims rewards
        await stakingContract.connect(user1).claimRewards()

        // Check user1's token balance reflects the expected rewards
        const apr = await stakingContract.apr();
        const expectedUser1Rewards = amountToDepositAsRewards
        const user1FinalBalance = await testToken.balanceOf(user1.address)
        expect(user1FinalBalance).to.equal(expectedUser1Rewards)

        // Check the staking has been disabled since the rewards were depleted
        const stakingEnabled = await stakingContract.stakingEnabled()
        expect(stakingEnabled).to.equal(false)
    })

   it("Should not allow users to claim rewards when rewards are depleted", async function() {
        const amountToDepositAsRewards = ethers.parseEther("1")
        const user1InitialBalance = await testToken.balanceOf(user1.address)
        const user2InitialBalance = await testToken.balanceOf(user2.address)

        // Deposit rewards into the staking contract
        await testToken.connect(owner).approve(stakingContract.target, amountToDepositAsRewards)
        await stakingContract.connect(owner).depositRewards(amountToDepositAsRewards)

        // User1 stakes tokens
        await testToken.connect(user1).approve(stakingContract.target, user1InitialBalance)
        await stakingContract.connect(user1).stake(user1InitialBalance)

        // User2 stakes tokens
        await testToken.connect(user2).approve(stakingContract.target, user2InitialBalance)
        await stakingContract.connect(user2).stake(user2InitialBalance)

        // Increase the timestamp to simulate 1 year passing
        const oneYear = 365 * 24 * 60 * 60
        const currentBlockNum = await ethers.provider.getBlockNumber();
        const currentTime = await ethers.provider.getBlock(currentBlockNum);
        await time.setNextBlockTimestamp(currentTime.timestamp + oneYear);

        // User1 claims rewards. This will deplete the reward balance and disable staking
        await stakingContract.connect(user1).claimRewards()

        // User2 should be unable to claim rewards
        await expect(stakingContract.connect(user2).claimRewards()).to.be.revertedWith("Staking is currently disabled")
    })

   it("Should allow users to unstake and claim rewards", async function() {
        const amountToDepositAsRewards = ethers.parseEther("10000000000")
        const user1InitialBalance = await testToken.balanceOf(user1.address)
        const amountToStake = user1InitialBalance

        // Deposit rewards into the staking contract
        await testToken.connect(owner).approve(stakingContract.target, amountToDepositAsRewards)
    	await stakingContract.connect(owner).depositRewards(amountToDepositAsRewards)

        // User1 stakes tokens
        await testToken.connect(user1).approve(stakingContract.target, amountToStake)
        await stakingContract.connect(user1).stake(amountToStake)

        // Increase the timestamp to simulate 1 year passing
        const oneYear = 365 * 24 * 60 * 60
        const currentBlockNum = await ethers.provider.getBlockNumber();
        const currentTime = await ethers.provider.getBlock(currentBlockNum);
        await time.setNextBlockTimestamp(currentTime.timestamp + oneYear);

        // User1 claims rewards
        await stakingContract.connect(user1).unstakeAndClaimRewards()

        // Check user1's token balance reflects the expected unstaked tokens and rewards
        const apr = await stakingContract.apr();
        const expectedUser1Rewards = amountToStake * apr / 10000n
        const expectedUser1FinalBalance = user1InitialBalance + expectedUser1Rewards
        const user1FinalBalance = await testToken.balanceOf(user1.address)
        expect(user1FinalBalance).to.equal(expectedUser1FinalBalance)
    })

   it("Should allow users to claim partial rewards", async function() {
        const amountToDepositAsRewards = ethers.parseEther("1")
        const user1InitialBalance = await testToken.balanceOf(user1.address)
        const amountToStake = user1InitialBalance

        // Deposit rewards into the staking contract
        await testToken.connect(owner).approve(stakingContract.target, amountToDepositAsRewards)
        await stakingContract.connect(owner).depositRewards(amountToDepositAsRewards)

        // User1 stakes tokens
        await testToken.connect(user1).approve(stakingContract.target, amountToStake)
        await stakingContract.connect(user1).stake(amountToStake)

        // Increase the timestamp to simulate 1 year passing
        const oneYear = 365 * 24 * 60 * 60
        const currentBlockNum = await ethers.provider.getBlockNumber();
        const currentTime = await ethers.provider.getBlock(currentBlockNum);
        await time.setNextBlockTimestamp(currentTime.timestamp + oneYear);

        // User1 claims rewards
        await stakingContract.connect(user1).unstakeAndClaimRewards()

        // Check user1's token balance reflects the expected rewards
        const apr = await stakingContract.apr();
        const expectedUser1Rewards = amountToDepositAsRewards
        const expectedUser1FinalBalance = user1InitialBalance + expectedUser1Rewards
        const user1FinalBalance = await testToken.balanceOf(user1.address)
        expect(user1FinalBalance).to.equal(expectedUser1FinalBalance)

        // Check the staking has been disabled since the rewards were depleted
        const stakingEnabled = await stakingContract.stakingEnabled()
        expect(stakingEnabled).to.equal(false)
  })

  it("Should allow users to calculate rewards", async function() {
        const amountToDepositAsRewards = ethers.parseEther("10000000000")
        const user1InitialBalance = await testToken.balanceOf(user1.address)
        const amountToStake = user1InitialBalance

        // Deposit rewards into the staking contract
        await testToken.connect(owner).approve(stakingContract.target, amountToDepositAsRewards)
    	await stakingContract.connect(owner).depositRewards(amountToDepositAsRewards)

        // User1 stakes tokens
        await testToken.connect(user1).approve(stakingContract.target, amountToStake)
        await stakingContract.connect(user1).stake(amountToStake)

        // Increase the timestamp to simulate 1 year passing
        const oneYear = 365 * 24 * 60 * 60
        const currentBlockNum = await ethers.provider.getBlockNumber();
        const currentTime = await ethers.provider.getBlock(currentBlockNum);
        await time.setNextBlockTimestamp(currentTime.timestamp + oneYear);

        // Mine the next block so the time change takes effect
        await network.provider.send("evm_mine");

        // User1 calculates rewards
        const calculatedRewards = await stakingContract.calculateCurrentRewards(user1.address)

        // Check user1's token balance reflects the expected rewards
        const apr = await stakingContract.apr();
        const expectedUser1Rewards = amountToStake * apr / 10000n
        const user1FinalBalance = await testToken.balanceOf(user1.address)
        expect(calculatedRewards).to.equal(expectedUser1Rewards)
    })
})
