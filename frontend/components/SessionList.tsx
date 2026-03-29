"use client";

import { useReadContract } from "wagmi";
import { formatUnits } from "viem";
import type { Address } from "viem";
import { AUSDC_ADDRESS, ERC20_ABI, SESSION_ESCROW_ABI } from "@/lib/contracts";

const STATUS_LABELS = ["Active", "Settled", "Refunded"] as const;
const STATUS_STYLES = [
  "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
  "bg-zinc-800 text-zinc-400",
  "bg-red-500/10 text-red-400 border border-red-500/20",
] as const;

interface SessionCardProps {
  sessionId: string;
  escrowAddress: Address;
}

function SessionCard({ sessionId, escrowAddress }: SessionCardProps) {
  const { data: status } = useReadContract({
    address: escrowAddress,
    abi: SESSION_ESCROW_ABI,
    functionName: "status",
    query: { refetchInterval: 5000 },
  });

  const { data: deposit } = useReadContract({
    address: escrowAddress,
    abi: SESSION_ESCROW_ABI,
    functionName: "deposit",
  });

  const { data: aTokenBalance } = useReadContract({
    address: AUSDC_ADDRESS,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [escrowAddress],
    query: { refetchInterval: 4000 },
  });

  const statusIndex = status !== undefined ? Number(status) : 0;
  const depositFormatted = deposit ? formatUnits(deposit, 6) : "—";
  const currentBalance = aTokenBalance ? formatUnits(aTokenBalance, 6) : "—";
  const yieldEarned =
    deposit && aTokenBalance && aTokenBalance > deposit
      ? formatUnits(aTokenBalance - deposit, 6)
      : "0.000000";

  const shortId = `${sessionId.slice(0, 6)}...${sessionId.slice(-4)}`;
  const shortEscrow = `${escrowAddress.slice(0, 6)}...${escrowAddress.slice(-4)}`;

  return (
    <div className="group border border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-300 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="font-mono text-sm text-zinc-300">{shortId}</span>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${STATUS_STYLES[statusIndex]}`}>
          {STATUS_LABELS[statusIndex]}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-zinc-500 text-xs mb-1">Deposit</p>
          <p className="text-zinc-100 font-medium text-sm">{depositFormatted} USDC</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs mb-1">aUSDC balance</p>
          <p className="text-zinc-100 font-medium text-sm">{currentBalance}</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs mb-1">Yield earned</p>
          <p className="text-emerald-400 font-medium text-sm">+{yieldEarned} USDC</p>
        </div>
        <div>
          <p className="text-zinc-500 text-xs mb-1">Escrow</p>
          <p className="font-mono text-zinc-500 text-xs">{shortEscrow}</p>
        </div>
      </div>
    </div>
  );
}

interface SessionListProps {
  sessions: Array<{ sessionId: string; escrowAddress: Address }>;
}

export function SessionList({ sessions }: SessionListProps) {
  if (sessions.length === 0) {
    return (
      <div className="text-center py-24 border border-zinc-800/50 rounded-2xl">
        <p className="text-zinc-600 text-sm">No sessions yet. Open one to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {sessions.map((s) => (
        <SessionCard key={s.sessionId} sessionId={s.sessionId} escrowAddress={s.escrowAddress} />
      ))}
    </div>
  );
}
