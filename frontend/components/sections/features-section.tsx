"use client"

import { motion } from "framer-motion"
import { Zap, Shield, Layers, ArrowRight, Lock } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export function FeaturesSection() {
  return (
    <section id="features" className="px-6 py-24">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">FEATURES</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
            Everything you need to pay at scale
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto text-balance">
            Primitives designed to make autonomous agent payments actually work.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Card 1 - Analytics (wider - 3 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-3"
          >
            <Card className="group h-full overflow-hidden border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-300 rounded-2xl">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center"
                    whileHover={{ rotate: [0, -10, 10, 0] }}
                    transition={{ duration: 0.5 }}
                  >
                    <Lock className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  </motion.div>
                  <p className="font-heading font-semibold text-zinc-100">Session Escrow</p>
                </div>
                <p className="text-zinc-500 text-sm mb-5">
                  Every session deposits USDC on-chain. Funds are isolated, tracked, and auto-returned.
                </p>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 overflow-hidden">
                  {/* Session Flow Visualization */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-xs text-zinc-500 font-mono">Session #0x8f3a...2b1c</span>
                    <motion.div 
                      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                      animate={{ opacity: [0.7, 1, 0.7] }}
                      transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="text-xs text-emerald-400">Active</span>
                    </motion.div>
                  </div>
                  {/* Escrow Amount */}
                  <div className="bg-zinc-900/50 rounded-lg p-3 mb-4">
                    <p className="text-zinc-500 text-xs mb-1">Locked Amount</p>
                    <div className="flex items-baseline gap-2">
                      <motion.span 
                        className="text-2xl font-display font-bold text-zinc-100"
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                      >
                        250.00
                      </motion.span>
                      <span className="text-zinc-400 text-sm">USDC</span>
                    </div>
                  </div>
                  {/* Flow Steps */}
                  <div className="flex items-center gap-2">
                    {[
                      { label: "Deposit", done: true },
                      { label: "Active", done: true },
                      { label: "Vouchers", done: false },
                      { label: "Settle", done: false },
                    ].map((step, i) => (
                      <motion.div
                        key={step.label}
                        className="flex-1"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        <div className={`h-1.5 rounded-full mb-1.5 ${step.done ? 'bg-zinc-400' : 'bg-zinc-800'}`} />
                        <span className={`text-xs ${step.done ? 'text-zinc-400' : 'text-zinc-600'}`}>{step.label}</span>
                      </motion.div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 2 - Performance (narrower - 2 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="md:col-span-2"
          >
            <Card className="group h-full overflow-hidden border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-300 rounded-2xl">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
                  >
                    <Zap className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  </motion.div>
                  <p className="font-heading font-semibold text-zinc-100">Zero-Gas Vouchers</p>
                </div>
                <p className="text-zinc-500 text-sm mb-5">Signed off-chain at machine speed.</p>
                <div className="mt-auto">
                  <div className="flex items-baseline gap-2 mb-3">
                    <motion.span
                      className="text-4xl font-display font-bold text-zinc-100"
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                    >
                      &lt;1ms
                    </motion.span>
                    <span className="text-zinc-500 text-sm">voucher latency</span>
                  </div>
                  <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-gradient-to-r from-zinc-500 to-zinc-300 rounded-full"
                      initial={{ width: "0%" }}
                      whileInView={{ width: "100%" }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.5, delay: 0.3, ease: "easeOut" }}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 3 - EIP-712 Signatures (narrower - 2 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="md:col-span-2"
          >
            <Card className="group h-full overflow-hidden border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-300 rounded-2xl">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center"
                    whileHover={{ y: -2 }}
                  >
                    <Shield className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  </motion.div>
                  <p className="font-heading font-semibold text-zinc-100">EIP-712 Signatures</p>
                </div>
                <p className="text-zinc-500 text-sm mb-5">Every voucher is cryptographically verifiable.</p>
                <div className="mt-auto rounded-lg border border-zinc-800 bg-zinc-950 p-3">
                  <div className="font-mono text-xs text-zinc-500 space-y-1">
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 }}
                    >
                      <span className="text-zinc-600">{"{"}</span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.4 }}
                      className="pl-3"
                    >
                      <span className="text-zinc-400">&quot;amount&quot;</span>: <span className="text-zinc-300">25.00</span>,
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.5 }}
                      className="pl-3"
                    >
                      <span className="text-zinc-400">&quot;nonce&quot;</span>: <span className="text-zinc-300">42</span>,
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.6 }}
                      className="pl-3"
                    >
                      <span className="text-zinc-400">&quot;sig&quot;</span>: <span className="text-emerald-400">&quot;0x8f3a...&quot;</span>
                    </motion.div>
                    <motion.div
                      initial={{ opacity: 0 }}
                      whileInView={{ opacity: 1 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.7 }}
                    >
                      <span className="text-zinc-600">{"}"}</span>
                    </motion.div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Card 4 - Aave V3 Yield (wider - 3 cols) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="md:col-span-3"
          >
            <Card className="group h-full overflow-hidden border-zinc-800/50 bg-zinc-900/50 hover:border-zinc-700/50 transition-all duration-300 rounded-2xl">
              <CardContent className="p-6 flex flex-col h-full">
                <div className="flex items-center gap-3 mb-3">
                  <motion.div
                    className="w-10 h-10 rounded-xl bg-zinc-800 flex items-center justify-center"
                    whileHover={{ rotate: 180 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Layers className="w-5 h-5 text-zinc-400 group-hover:text-zinc-200 transition-colors" />
                  </motion.div>
                  <p className="font-heading font-semibold text-zinc-100">Aave V3 Yield</p>
                </div>
                <p className="text-zinc-500 text-sm mb-5">Idle funds earn yield while locked in escrow.</p>
                <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 mt-auto">
                  {/* Yield Stats */}
                  <div className="grid grid-cols-3 gap-3 mb-4">
                    {[
                      { label: "Current APY", value: "3.2%", color: "text-emerald-400" },
                      { label: "Total Deposited", value: "$1.2M", color: "text-zinc-100" },
                      { label: "Yield Earned", value: "$38.4K", color: "text-zinc-100" },
                    ].map((stat, i) => (
                      <motion.div
                        key={stat.label}
                        className="bg-zinc-900/50 rounded-lg p-2.5"
                        initial={{ opacity: 0, y: 10 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.3 + i * 0.1 }}
                      >
                        <p className="text-zinc-500 text-xs mb-1">{stat.label}</p>
                        <span className={`font-semibold text-sm ${stat.color}`}>{stat.value}</span>
                      </motion.div>
                    ))}
                  </div>
                  {/* Yield Flow */}
                  <div className="flex items-center gap-2 text-xs text-zinc-500">
                    <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400">USDC</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-400">aUSDC</span>
                    <ArrowRight className="w-3 h-3" />
                    <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">Yield</span>
                  </div>
                </div>
                <motion.button
                  whileHover={{ x: 6 }}
                  className="mt-4 flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                >
                  View contracts on Base <ArrowRight className="w-4 h-4" />
                </motion.button>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
