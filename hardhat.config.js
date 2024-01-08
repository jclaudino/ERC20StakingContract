require("@nomicfoundation/hardhat-toolbox");
require('solidity-docgen');

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.20",
  networks: {
    localhost: {
      url: "http://127.0.0.1:8545", // URL of your local Ethereum node
      chainId: 31337, // Chain ID of your local network (E.g., Hardhat Network)
    },
  },
  docgen: {}
};
