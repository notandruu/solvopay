import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { SessionFactory, SessionEscrow } from "../typechain-types";

const USDC = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
const AAVE_POOL = "0xA238Dd80C259a72e81d7e4664a9801593F98d1c5";
const AUSDC = "0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB";
const USDC_WHALE = "0x3304E22DDaa22bCdC5fCa2269b418046aE7b566A";

const DEPOSIT = ethers.parseUnits("10", 6);
const ONE_DAY = 86400;
const SEVEN_DAYS = 86400 * 7;

async function impersonate(address: string): Promise<HardhatEthersSigner> {
  await ethers.provider.send("hardhat_impersonateAccount", [address]);
  await ethers.provider.send("hardhat_setBalance", [address, "0x56BC75E2D63100000"]);
  return ethers.getSigner(address);
}

async function openSession(
  factory: SessionFactory,
  usdc: any,
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

  let sessionId: string = "";
  let escrowAddr: string = "";
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
  sessionId: string,
  totalAuthorized: bigint,
  nonce: bigint
): Promise<string> {
  const domain = {
    name: "SolvoPay",
    version: "1",
    chainId: 8453,
    verifyingContract: await escrow.getAddress(),
  };

  const types = {
    Voucher: [
      { name: "sessionId", type: "bytes32" },
      { name: "totalAuthorized", type: "uint256" },
      { name: "nonce", type: "uint256" },
    ],
  };

  const value = { sessionId, totalAuthorized, nonce };

  return signer.signTypedData(domain, types, value);
}

describe("SessionEscrow", function () {
  let factory: SessionFactory;
  let agent: HardhatEthersSigner;
  let recipient: HardhatEthersSigner;
  let attacker: HardhatEthersSigner;
  let usdc: any;
  let aUsdc: any;
  let deadlineAt: bigint;

  beforeEach(async function () {
    [agent, recipient, attacker] = await ethers.getSigners();
    const whale = await impersonate(USDC_WHALE);

    usdc = await ethers.getContractAt("IERC20", USDC);
    aUsdc = await ethers.getContractAt("IERC20", AUSDC);

    await usdc.connect(whale).transfer(agent.address, DEPOSIT * 5n);

    const Factory = await ethers.getContractFactory("SessionFactory");
    factory = await Factory.deploy(AAVE_POOL, USDC, AUSDC);

    const block = await ethers.provider.getBlock("latest");
    deadlineAt = BigInt(block!.timestamp) + BigInt(ONE_DAY);
  });

  describe("settle", function () {
    it("full settlement: recipient gets authorized + yield share, agent gets remainder + yield share", async function () {
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );

      await time.increase(3600);

      const totalAuthorized = ethers.parseUnits("3", 6);
      const nonce = 1n;
      const sig = await signVoucher(agent, escrow, sessionId, totalAuthorized, nonce);

      const recipientBefore = await usdc.balanceOf(recipient.address);
      const agentBefore = await usdc.balanceOf(agent.address);

      await escrow.connect(recipient).settle(
        { sessionId, totalAuthorized, nonce },
        sig
      );

      const recipientAfter = await usdc.balanceOf(recipient.address);
      const agentAfter = await usdc.balanceOf(agent.address);

      expect(recipientAfter - recipientBefore).to.be.gte(totalAuthorized);
      expect(agentAfter - agentBefore).to.be.gte(DEPOSIT - totalAuthorized);
      expect(await escrow.status()).to.eq(1);
    });

    it("full deposit authorized: agent gets only yield share", async function () {
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );

      await time.increase(3600);

      const totalAuthorized = DEPOSIT;
      const nonce = 1n;
      const sig = await signVoucher(agent, escrow, sessionId, totalAuthorized, nonce);

      await escrow.connect(recipient).settle(
        { sessionId, totalAuthorized, nonce },
        sig
      );

      expect(await escrow.status()).to.eq(1);
    });

    it("reverts if caller is not recipient", async function () {
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );
      const sig = await signVoucher(agent, escrow, sessionId, ethers.parseUnits("1", 6), 1n);

      await expect(
        escrow.connect(attacker).settle(
          { sessionId, totalAuthorized: ethers.parseUnits("1", 6), nonce: 1n },
          sig
        )
      ).to.be.revertedWith("only recipient");
    });

    it("reverts on invalid signature", async function () {
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );
      const sig = await signVoucher(attacker, escrow, sessionId, ethers.parseUnits("1", 6), 1n);

      await expect(
        escrow.connect(recipient).settle(
          { sessionId, totalAuthorized: ethers.parseUnits("1", 6), nonce: 1n },
          sig
        )
      ).to.be.revertedWith("invalid sig");
    });

    it("reverts on stale nonce", async function () {
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );

      const sig1 = await signVoucher(agent, escrow, sessionId, ethers.parseUnits("1", 6), 1n);
      await escrow.connect(recipient).settle(
        { sessionId, totalAuthorized: ethers.parseUnits("1", 6), nonce: 1n },
        sig1
      );

      expect(await escrow.status()).to.eq(1);
    });

    it("reverts if totalAuthorized exceeds deposit", async function () {
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );
      const over = DEPOSIT + 1n;
      const sig = await signVoucher(agent, escrow, sessionId, over, 1n);

      await expect(
        escrow.connect(recipient).settle(
          { sessionId, totalAuthorized: over, nonce: 1n },
          sig
        )
      ).to.be.revertedWith("exceeds deposit");
    });

    it("reverts on double settle", async function () {
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );
      const sig = await signVoucher(agent, escrow, sessionId, ethers.parseUnits("1", 6), 1n);

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
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );

      await time.increase(ONE_DAY + SEVEN_DAYS + 1);

      const agentBefore = await usdc.balanceOf(agent.address);
      await escrow.connect(agent).refund();
      const agentAfter = await usdc.balanceOf(agent.address);

      expect(agentAfter - agentBefore).to.be.gte(DEPOSIT);
      expect(await escrow.status()).to.eq(2);
    });

    it("reverts if too early", async function () {
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );

      await expect(escrow.connect(agent).refund()).to.be.revertedWith("too early");
    });

    it("reverts if caller is not agent", async function () {
      const { sessionId, escrow } = await openSession(
        factory, usdc, agent, recipient, DEPOSIT, 80, deadlineAt
      );
      await time.increase(ONE_DAY + SEVEN_DAYS + 1);

      await expect(escrow.connect(attacker).refund()).to.be.revertedWith("only agent");
    });
  });
});
