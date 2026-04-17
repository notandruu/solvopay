import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { SessionFactory, MockERC20, MockAavePool } from "../typechain-types";

const DEPOSIT = ethers.parseUnits("10", 6);
const ONE_DAY = 86400n;

describe("SessionFactory", function () {
  let factory: SessionFactory;
  let agent: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;
  let usdc: MockERC20;
  let aUsdc: MockERC20;
  let pool: MockAavePool;
  let deadlineAt: bigint;

  beforeEach(async function () {
    [agent, recipient] = await ethers.getSigners();

    const ERC20 = await ethers.getContractFactory("MockERC20");
    usdc = await ERC20.deploy("USD Coin", "USDC", 6) as MockERC20;
    aUsdc = await ERC20.deploy("Aave USDC", "aUSDC", 6) as MockERC20;

    const Pool = await ethers.getContractFactory("MockAavePool");
    pool = await Pool.deploy(await usdc.getAddress(), await aUsdc.getAddress()) as MockAavePool;

    await aUsdc.mint(await pool.getAddress(), 0);

    const Factory = await ethers.getContractFactory("SessionFactory");
    factory = await Factory.deploy(
      await pool.getAddress(),
      await usdc.getAddress(),
      await aUsdc.getAddress()
    ) as SessionFactory;

    await usdc.mint(agent.address, DEPOSIT * 3n);

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

  it("reverts on zero recipient", async function () {
    await usdc.connect(agent).approve(await factory.getAddress(), DEPOSIT);
    await expect(
      factory.connect(agent).openSession(ethers.ZeroAddress, DEPOSIT, 80, deadlineAt)
    ).to.be.revertedWith("zero recipient");
  });
});
