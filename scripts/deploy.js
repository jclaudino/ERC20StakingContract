const hre = require("hardhat");
async function main(){

    const TestToken = await hre.ethers.getContractFactory("TestToken");
    const testToken = await TestToken.deploy();  // deploy with constructor values

    //After successful deployment print the address of the Token
    console.log(`TestToken is deployed at address: ${await testToken.target}`)

    const StakingContract = await hre.ethers.getContractFactory("ERC20StakingContract");
    const stakingContract = await StakingContract.deploy(testToken.target, 1000n);

    console.log(`StakingContract is deployed at address: ${await stakingContract.target}`)

}
main().catch((error)=>{
    console.log(error);
    process.exitCode = 1;
})