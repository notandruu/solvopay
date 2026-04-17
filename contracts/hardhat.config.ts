import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      evmVersion: "cancun",
    },
  },
  networks: {
    hardhat: {
      forking: {
        url: process.env.ALCHEMY_BASE_MAINNET_RPC ?? "",
        enabled: !!process.env.ALCHEMY_BASE_MAINNET_RPC,
      },
      chainId: 8453,
    },
    base: {
      url: process.env.ALCHEMY_BASE_MAINNET_RPC ?? "",
      chainId: 8453,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
    "base-sepolia": {
      url: process.env.ALCHEMY_BASE_SEPOLIA_RPC ?? "",
      chainId: 84532,
      accounts: process.env.DEPLOYER_PRIVATE_KEY
        ? [process.env.DEPLOYER_PRIVATE_KEY]
        : [],
    },
  },
};

export default config;
