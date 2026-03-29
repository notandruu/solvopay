"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { parseUnits, parseEventLogs } from "viem";
import type { Address } from "viem";
import {
  FACTORY_ADDRESS,
  USDC_ADDRESS,
  SESSION_FACTORY_ABI,
  ERC20_ABI,
} from "@/lib/contracts";

interface NewSessionFormProps {
  onSessionOpened: (sessionId: string, escrowAddress: Address) => void;
}

const inputClass =
  "w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600 transition-colors";

const labelClass = "text-xs text-zinc-500 mb-1.5 block";

export function NewSessionForm({ onSessionOpened }: NewSessionFormProps) {
  const { address } = useAccount();
  const [recipient, setRecipient] = useState("");
  const [depositAmount, setDepositAmount] = useState("10");
  const [yieldShare, setYieldShare] = useState("80");
  const [hoursUntilDeadline, setHoursUntilDeadline] = useState("24");
  const [step, setStep] = useState<"idle" | "approving" | "opening" | "done">("idle");

  const { writeContractAsync } = useWriteContract();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!address) return;

    try {
      const amount = parseUnits(depositAmount, 6);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + Number(hoursUntilDeadline) * 3600);

      setStep("approving");
      await writeContractAsync({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [FACTORY_ADDRESS, amount],
      });

      setStep("opening");
      const openTx = await writeContractAsync({
        address: FACTORY_ADDRESS,
        abi: SESSION_FACTORY_ABI,
        functionName: "openSession",
        args: [recipient as Address, amount, BigInt(yieldShare), deadline],
      });

      const receipt = await fetch(`/api/tx?hash=${openTx}`).then((r) => r.json());

      if (receipt?.logs) {
        const logs = parseEventLogs({
          abi: SESSION_FACTORY_ABI,
          eventName: "SessionOpened",
          logs: receipt.logs,
        });
        if (logs[0]) {
          onSessionOpened(logs[0].args.sessionId as string, logs[0].args.escrow as Address);
        }
      }

      setStep("done");
      setTimeout(() => setStep("idle"), 2000);
    } catch (err) {
      console.error(err);
      setStep("idle");
    }
  };

  const isLoading = step !== "idle" && step !== "done";

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div>
        <label className={labelClass}>Service provider address</label>
        <input
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          placeholder="0x..."
          required
          className={`${inputClass} font-mono`}
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Deposit (USDC)</label>
          <input
            type="number"
            value={depositAmount}
            onChange={(e) => setDepositAmount(e.target.value)}
            min="1"
            step="0.01"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Your yield share (%)</label>
          <input
            type="number"
            value={yieldShare}
            onChange={(e) => setYieldShare(e.target.value)}
            min="0"
            max="100"
            required
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Deadline (hours)</label>
          <input
            type="number"
            value={hoursUntilDeadline}
            onChange={(e) => setHoursUntilDeadline(e.target.value)}
            min="1"
            required
            className={inputClass}
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading || !address}
        className="w-full rounded-full bg-zinc-100 text-zinc-900 text-sm font-medium py-2.5 hover:bg-zinc-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {step === "idle" && "Open Session"}
        {step === "approving" && "Approving USDC..."}
        {step === "opening" && "Opening Session..."}
        {step === "done" && "Session Opened ✓"}
      </button>
    </form>
  );
}
