import { ethers } from "hardhat";

const AAVE_POOL = "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27";
const USDC = "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f";
const A_USDC = "0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const SessionFactory = await ethers.getContractFactory("SessionFactory");
  const factory = await SessionFactory.deploy(AAVE_POOL, USDC, A_USDC);
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log("SessionFactory deployed to:", address);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
