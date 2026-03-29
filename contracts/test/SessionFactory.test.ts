import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { SessionFactory, SessionEscrow } from "../typechain-types";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const AAVE_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
const AUSDC = "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB";

const USDC_WHALE = "0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A";
const DEPOSIT = ethers.parseUnits("10", 6);
const ONE_DAY = 86400n;

async function impersonate(address: string): Promise<HardhatEthersSigner> {
  await ethers.provider.send("hardhat_impersonateAccount", [address]);
  await ethers.provider.send("hardhat_setBalance", [address, "0x56BC75E2D63100000"]);
  return ethers.getSigner(address);
}

describe("SessionFactory", function () {
  let factory: SessionFactory;
  let agent: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;
  let whale: HardhatEthersSigner;
  let usdc: any;
  let aUsdc: any;
  let deadlineAt: bigint;

  beforeEach(async function () {
    [agent, recipient] = await ethers.getSigners();
    whale = await impersonate(USDC_WHALE);

    usdc = await ethers.getContractAt("IERC20", USDC);
    aUsdc = await ethers.getContractAt("IERC20", AUSDC);

    await usdc.connect(whale).transfer(agent.address, DEPOSIT * 3n);

    const Factory = await ethers.getContractFactory("SessionFactory");
    factory = await Factory.deploy(AAVE_POOL, USDC, AUSDC);

    const block = await ethers.provider.getBlock("latest");
    deadlineAt = BigInt(block!.timestamp) + ONE_DAY;
  });

  it("opens a session and deposits to Aave", async function () {
    await usdc.connect(agent).approve(await factory.getAddress(), DEPOSIT);

    const tx = await factory.connect(agent).openSession(
      recipient.address,
      DEPOSIT,
      80,
      deadlineAt
    );
    const receipt = await tx.wait();

    const event = receipt!.logs.find((log: any) => {
      try {
        const parsed = factory.interface.parseLog(log);
        return parsed?.name === "SessionOpened";
      } catch {
        return false;
      }
    });
    expect(event).to.not.be.undefined;

    const parsed = factory.interface.parseLog(event!);
    const sessionId = parsed!.args.sessionId;
    const escrowAddr = parsed!.args.escrow;

    expect(await factory.sessions(sessionId)).to.eq(escrowAddr);

    const aBalance = await aUsdc.balanceOf(escrowAddr);
    expect(aBalance).to.be.gte(DEPOSIT - 1n);
  });

  it("reverts on zero deposit", async function () {
    await expect(
      factory.connect(agent).openSession(recipient.address, 0, 80, deadlineAt)
    ).to.be.revertedWith("zero deposit");
  });

  it("reverts on past deadline", async function () {
    const block = await ethers.provider.getBlock("latest");
    const past = BigInt(block!.timestamp) - 1n;
    await usdc.connect(agent).approve(await factory.getAddress(), DEPOSIT);
    await expect(
      factory.connect(agent).openSession(recipient.address, DEPOSIT, 80, past)
    ).to.be.revertedWith("deadline in past");
  });

  it("reverts on yield share > 100", async function () {
    await usdc.connect(agent).approve(await factory.getAddress(), DEPOSIT);
    await expect(
      factory.connect(agent).openSession(recipient.address, DEPOSIT, 101, deadlineAt)
    ).to.be.revertedWith("yield share > 100");
  });
});
