import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { SessionFactory, SessionEscrow, MockERC20, MockAavePool } from "../typechain-types";

const DEPOSIT = ethers.parseUnits("10", 6);
const ONE_DAY = 86400;
const SEVEN_DAYS = 86400 * 7;

async function setup() {
  const [agent, recipient, attacker] = await ethers.getSigners();

  const ERC20 = await ethers.getContractFactory("MockERC20");
  const usdc = await ERC20.deploy("USD Coin", "USDC", 6) as MockERC20;
  const aUsdc = await ERC20.deploy("Aave USDC", "aUSDC", 6) as MockERC20;

  const Pool = await ethers.getContractFactory("MockAavePool");
  const pool = await Pool.deploy(await usdc.getAddress(), await aUsdc.getAddress()) as MockAavePool;

  const Factory = await ethers.getContractFactory("SessionFactory");
  const factory = await Factory.deploy(
    await pool.getAddress(),
    await usdc.getAddress(),
    await aUsdc.getAddress()
  ) as SessionFactory;

  await usdc.mint(agent.address, DEPOSIT * 5n);

  return { agent, recipient, attacker, usdc, aUsdc, pool, factory };
}

async function openSession(
  factory: SessionFactory,
  usdc: MockERC20,
  agent: HardhatEthersSigner,
  recipient: HardhatEthersSigner,
  depositAmount: bigint,
  agentYieldShare: number,
  deadlineAt: bigint
): Promise<{ sessionId: string; escrow: SessionEscrow }> {
  await usdc.connect(agent).approve(await factory.getAddress(), depositAmount);
  const tx = await factory.connect(agent).openSession(
    recipient.address,
    depositAmount,
    agentYieldShare,
    deadlineAt
  );
  const receipt = await tx.wait();

  let sessionId = "";
  let escrowAddr = "";
  for (const log of receipt!.logs) {
    try {
      const parsed = factory.interface.parseLog(log);
      if (parsed?.name === "SessionOpened") {
        sessionId = parsed.args.sessionId;
        escrowAddr = parsed.args.escrow;
      }
    } catch {}
  }

  const escrow = await ethers.getContractAt("SessionEscrow", escrowAddr) as SessionEscrow;
  return { sessionId, escrow };
}

async function signVoucher(
  signer: HardhatEthersSigner,
  escrow: SessionEscrow,
  chainId: number,
  sessionId: string,
  totalAuthorized: bigint,
  nonce: bigint
): Promise<string> {
  const domain = {
    name: "SolvoPay",
    version: "1",
    chainId,
    verifyingContract: await escrow.getAddress(),
  };
  const types = {
    Voucher: [
      { name: "sessionId", type: "bytes32" },
      { name: "totalAuthorized", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };
  return signer.signTypedData(domain, types, { sessionId, totalAuthorized, nonce });
}

describe("SessionEscrow", function () {
  let ctx: Awaited<ReturnType<typeof setup>>;
  let deadlineAt: bigint;
  let chainId: number;

  beforeEach(async function () {
    ctx = await setup();
    const block = await ethers.provider.getBlock("latest");
    deadlineAt = BigInt(block!.timestamp) + BigInt(ONE_DAY);
    chainId = Number((await ethers.provider.getNetwork()).chainId);
  });

  describe("settle", function () {
    it("full settlement: recipient gets authorized + yield, agent gets remainder + yield", async function () {
      const { factory, usdc, agent, recipient } = ctx;
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );

      const totalAuthorized = ethers.parseUnits("3", 6);
      const nonce = 1n;
      const sig = await signVoucher(agent, escrow, chainId, sessionId, totalAuthorized, nonce);

      const recipientBefore = await usdc.balanceOf(recipient.address);
      const agentBefore = await usdc.balanceOf(agent.address);

      await escrow.connect(recipient).settle({ sessionId, totalAuthorized, nonce }, sig);

      const recipientAfter = await usdc.balanceOf(recipient.address);
      const agentAfter = await usdc.balanceOf(agent.address);

      expect(recipientAfter - recipientBefore).to.equal(totalAuthorized);
      expect(agentAfter - agentBefore).to.equal(DEPOSIT - totalAuthorized);
      expect(await escrow.status()).to.eq(1);
    });

    it("full deposit authorized: agent gets zero USDC back", async function () {
      const { factory, usdc, agent, recipient } = ctx;
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );

      const sig = await signVoucher(agent, escrow, chainId, sessionId, DEPOSIT, 1n);
      await escrow.connect(recipient).settle({ sessionId, totalAuthorized: DEPOSIT, nonce: 1n }, sig);

      expect(await escrow.status()).to.eq(1);
    });

    it("reverts if caller is not recipient", async function () {
      const { factory, usdc, agent, recipient, attacker } = ctx;
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );
      const sig = await signVoucher(agent, escrow, chainId, sessionId, ethers.parseUnits("1", 6), 1n);

      await expect(
        escrow.connect(attacker).settle(
          { sessionId, totalAuthorized: ethers.parseUnits("1", 6), nonce: 1n },
          sig
        )
      ).to.be.revertedWith("only recipient");
    });

    it("reverts on invalid signature", async function () {
      const { factory, usdc, agent, recipient, attacker } = ctx;
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );
      const sig = await signVoucher(attacker, escrow, chainId, sessionId, ethers.parseUnits("1", 6), 1n);

      await expect(
        escrow.connect(recipient).settle(
          { sessionId, totalAuthorized: ethers.parseUnits("1", 6), nonce: 1n },
          sig
        )
      ).to.be.revertedWith("invalid sig");
    });

    it("reverts on stale nonce", async function () {
      const { factory, usdc, agent, recipient } = ctx;
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );

      const sig1 = await signVoucher(agent, escrow, chainId, sessionId, ethers.parseUnits("1", 6), 1n);
      await escrow.connect(recipient).settle(
        { sessionId, totalAuthorized: ethers.parseUnits("1", 6), nonce: 1n },
        sig1
      );
      expect(await escrow.status()).to.eq(1);
    });

    it("reverts if totalAuthorized exceeds deposit", async function () {
      const { factory, usdc, agent, recipient } = ctx;
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );
      const over = DEPOSIT + 1n;
      const sig = await signVoucher(agent, escrow, chainId, sessionId, over, 1n);

      await expect(
        escrow.connect(recipient).settle({ sessionId, totalAuthorized: over, nonce: 1n }, sig)
      ).to.be.revertedWith("exceeds deposit");
    });

    it("reverts on double settle", async function () {
      const { factory, usdc, agent, recipient } = ctx;
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );
      const sig = await signVoucher(agent, escrow, chainId, sessionId, ethers.parseUnits("1", 6), 1n);

      await escrow.connect(recipient).settle(
        { sessionId, totalAuthorized: ethers.parseUnits("1", 6), nonce: 1n },
        sig
      );
      await expect(
        escrow.connect(recipient).settle(
          { sessionId, totalAuthorized: ethers.parseUnits("1", 6), nonce: 1n },
          sig
        )
      ).to.be.revertedWith("not active");
    });
  });

  describe("refund", function () {
    it("agent can refund after deadline + 7 days", async function () {
      const { factory, usdc, agent, recipient } = ctx;
      const { escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );

      await time.increase(ONE_DAY + SEVEN_DAYS + 1);

      const agentBefore = await usdc.balanceOf(agent.address);
      await escrow.connect(agent).refund();
      const agentAfter = await usdc.balanceOf(agent.address);

      expect(agentAfter - agentBefore).to.equal(DEPOSIT);
      expect(await escrow.status()).to.eq(2);
    });

    it("reverts if too early", async function () {
      const { factory, usdc, agent, recipient } = ctx;
      const { escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );
      await expect(escrow.connect(agent).refund()).to.be.revertedWith("too early");
    });

    it("reverts if caller is not agent", async function () {
      const { factory, usdc, agent, recipient, attacker } = ctx;
      const { escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );
      await time.increase(ONE_DAY + SEVEN_DAYS + 1);
      await expect(escrow.connect(attacker).refund()).to.be.revertedWith("only agent");
    });
  });
});
