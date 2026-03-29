"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"

const steps = [
  {
    number: "01",
    title: "Open a session",
    description:
      "The agent deposits USDC into an on-chain escrow. Funds are locked, isolated per session, and immediately start earning Aave V3 yield.",
  },
  {
    number: "02",
    title: "Stream vouchers",
    description:
      "Every action the agent takes generates a signed voucher off-chain. No gas, no block confirmation, no latency. The service provider receives it and delivers instantly.",
  },
  {
    number: "03",
    title: "Settle once",
    description:
      "At session end, the final voucher hits the chain. The contract verifies the signature, pays the provider, returns unspent funds to the agent, and distributes yield to both sides.",
  },
]

const DURATION = 4000

export function HowItWorksSection() {
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    setProgress(0)
    const start = performance.now()

    const tick = (now: number) => {
      const elapsed = now - start
      const pct = Math.min(elapsed / DURATION, 1)
      setProgress(pct)
      if (pct < 1) {
        raf = requestAnimationFrame(tick)
      } else {
        setActive((prev) => (prev + 1) % steps.length)
      }
    }

    let raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [active])

  return (
    <section id="how-it-works" className="px-6 py-32">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-20"
        >
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">HOW IT WORKS</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-zinc-100">
            Three steps. One settlement.
          </h2>
        </motion.div>

        <div className="relative min-h-[260px] flex items-center justify-center">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -24 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="text-center w-full"
            >
              <span className="text-8xl font-bold text-zinc-800 leading-none select-none">
                {steps[active].number}
              </span>
              <h3 className="text-2xl md:text-3xl font-semibold text-zinc-100 mt-4 mb-4">
                {steps[active].title}
              </h3>
              <p className="text-zinc-500 text-base md:text-lg leading-relaxed max-w-xl mx-auto">
                {steps[active].description}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-3 mt-12 justify-center">
          {steps.map((step, i) => (
            <button
              key={i}
              onClick={() => setActive(i)}
              className="group flex flex-col items-center gap-2"
              aria-label={step.title}
            >
              <div className="relative h-0.5 w-16 bg-zinc-800 rounded-full overflow-hidden">
                {i === active && (
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-zinc-300 rounded-full"
                    style={{ width: `${progress * 100}%` }}
                  />
                )}
                {i < active && (
                  <div className="absolute inset-0 bg-zinc-500 rounded-full" />
                )}
              </div>
              <span className={`text-xs transition-colors ${i === active ? "text-zinc-300" : "text-zinc-600"}`}>
                {step.title}
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}
