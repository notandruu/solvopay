import { ethers, network } from "hardhat";

const ADDRESSES: Record<number, { aavePool: string; usdc: string; aUsdc: string }> = {
  8453: {
    aavePool: "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5",
    usdc: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    aUsdc: "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB",
  },
  84532: {
    aavePool: "0x8bAB6d1b75f19e9eD9fCe8b9BD338844fF79aE27",
    usdc: "0xba50Cd2A20f6DA35D788639E581bca8d0B5d4D5f",
    aUsdc: "0x10F1A9D11CDf50041f3f8cB7191CBE2f31750ACC",
  },
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const chainId = Number((await ethers.provider.getNetwork()).chainId);
  const addrs = ADDRESSES[chainId];

  if (!addrs) {
    throw new Error(`No address config for chain ${chainId}. Add it to the ADDRESSES map.`);
  }

  console.log(`Network:  ${network.name} (chain ${chainId})`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`Aave Pool: ${addrs.aavePool}`);
  console.log(`USDC:      ${addrs.usdc}`);
  console.log(`aUSDC:     ${addrs.aUsdc}`);

  const SessionFactory = await ethers.getContractFactory("SessionFactory");
  const factory = await SessionFactory.deploy(addrs.aavePool, addrs.usdc, addrs.aUsdc);
  await factory.waitForDeployment();

  const address = await factory.getAddress();
  console.log(`\nSessionFactory deployed to: ${address}`);
  console.log(`\nAdd to .env:\nSESSION_FACTORY_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
