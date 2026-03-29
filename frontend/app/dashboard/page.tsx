"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import type { Address } from "viem";
import { SessionList } from "@/components/SessionList";
import { NewSessionForm } from "@/components/NewSessionForm";

interface SessionEntry {
  sessionId: string;
  escrowAddress: Address;
}

export default function DashboardPage() {
  const { isConnected } = useAccount();
  const [sessions, setSessions] = useState<SessionEntry[]>([]);
  const [showForm, setShowForm] = useState(false);

  const handleSessionOpened = (sessionId: string, escrowAddress: Address) => {
    setSessions((prev) => [{ sessionId, escrowAddress }, ...prev]);
    setShowForm(false);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header — matches landing page navbar style */}
      <header className="fixed top-0 left-0 right-0 z-40 p-4">
        <nav className="max-w-5xl mx-auto flex items-center justify-between h-12 px-6 rounded-full bg-zinc-900/70 border border-zinc-800/50 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <Link href="/" className="font-display text-lg font-semibold text-zinc-100">
              SolvoPay
            </Link>
            <span className="text-zinc-700 text-sm">/</span>
            <span className="text-sm text-zinc-500">Dashboard</span>
          </div>
          <ConnectButton />
        </nav>
      </header>

      <main className="max-w-5xl mx-auto px-6 pt-32 pb-20">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center py-40 gap-6">
            <p className="text-zinc-500 text-sm">Connect your wallet to manage sessions</p>
            <ConnectButton />
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-10">
              <div>
                <h1 className="font-display text-2xl font-bold text-zinc-100">Sessions</h1>
                <p className="text-sm text-zinc-500 mt-1">
                  {sessions.length} session{sessions.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setShowForm((v) => !v)}
                className="px-5 py-2 rounded-full bg-zinc-100 text-zinc-900 text-sm font-medium hover:bg-zinc-200 transition-colors"
              >
                {showForm ? "Cancel" : "+ New Session"}
              </button>
            </div>

            {showForm && (
              <div className="mb-8 border border-zinc-800/50 bg-zinc-900/50 rounded-2xl p-6">
                <h3 className="text-sm font-medium text-zinc-300 mb-5">Open a new session</h3>
                <NewSessionForm onSessionOpened={handleSessionOpened} />
              </div>
            )}

            <SessionList sessions={sessions} />
          </>
        )}
      </main>
    </div>
  );
}
