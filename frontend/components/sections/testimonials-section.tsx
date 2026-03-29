"use client"

import { motion } from "motion/react"
import { TestimonialsColumn } from "@/components/ui/testimonials-column"

const testimonials = [
  {
    text: "we were literally just hardcoding api keys and hoping our agent didn't blow through our budget. solvopay was the first thing that made us feel like we had actual control over what the agent was spending.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face",
    name: "Marcus Diallo",
    role: "Founding Engineer, Stealth AI Infra",
  },
  {
    text: "the thing that got me was the yield. our agents hold sessions open for like 20-40 minutes at a time. that capital was just sitting there doing nothing. now it isn't.",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
    name: "Priya Nair",
    role: "ML Engineer, Series A Company",
  },
  {
    text: "i spent two weeks trying to figure out how to handle micropayments between my agent and the apis it was calling. solvopay solved it in an afternoon. the sdk is really clean.",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
    name: "Jared Johnson",
    role: "Solo Dev, AI Coding Assistant",
  },
  {
    text: "the escrow model clicked for me immediately. it's basically a state channel. i didn't have to learn anything new, i just had to trust the primitive. and the primitive is solid.",
    image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&h=150&fit=crop&crop=face",
    name: "Lena Hoffmann",
    role: "Backend Engineer, European Fintech",
  },
  {
    text: "our clients kept asking us how billing worked for agent actions. we had no good answer. now we do. solvopay is the answer we give them.",
    image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&h=150&fit=crop&crop=face",
    name: "Raj Patel",
    role: "CTO, AI Agent Platform",
  },
  {
    text: "built a full agent payment flow in 6 hours at a hackathon. judges loved it because they could actually see the on-chain settlement happen live. that demo moment was clean.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
    name: "Devon Clarke",
    role: "Hackathon Builder, ETHGlobal",
  },
  {
    text: "we process thousands of agent actions per session. the idea of doing one on-chain transaction per action is insane. one settlement at the end is the only thing that makes sense at our scale.",
    image: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=150&h=150&fit=crop&crop=face",
    name: "Erica Hoffman",
    role: "Product Engineer, Data Pipeline",
  },
  {
    text: "looked at the contracts. the voucher verification logic is tight. nonce enforcement, sig recovery, liquidity index math for yield, all done right. i've seen projects cut corners here. solvopay didn't.",
    image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150&h=150&fit=crop&crop=face",
    name: "Arjun Mehta",
    role: "Smart Contract Dev, Base",
  },
  {
    text: "i don't know aave internals. i don't care about aave internals. i opened a session, deposited usdc, and my locked funds just... earned yield. that's insane for something i set up in like 30 minutes.",
    image: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=150&h=150&fit=crop&crop=face",
    name: "Tyler Brooks",
    role: "Indie Hacker, AI Workflow Tools",
  },
  {
    text: "the intent / settlement separation is the right mental model for agent payments. off-chain vouchers for speed, on-chain settlement for finality. this is how you actually build payments infrastructure for autonomous systems.",
    image: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150&h=150&fit=crop&crop=face",
    name: "Nia Okonkwo",
    role: "Researcher, Web3 x AI",
  },
]

const firstColumn = testimonials.slice(0, 3)
const secondColumn = testimonials.slice(3, 6)
const thirdColumn = testimonials.slice(6, 9)

const logos = ["Base", "Aave", "Ethereum", "Web3", "AI Infra", "Crypto"]

export function TestimonialsSection() {
  return (
    <section id="testimonials" className="px-6 py-24 bg-zinc-900/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-xl mx-auto mb-12"
        >
          <div className="border border-zinc-800 py-1.5 px-4 rounded-full text-sm text-zinc-400">Testimonials</div>

          <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-100 mt-6 text-center tracking-tight">
            Builders trust SolvoPay
          </h2>
          <p className="text-center mt-4 text-zinc-500 text-lg text-balance">
            From indie hackers to enterprise teams, here's what builders are saying about agent payments at machine speed.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_25%,black_75%,transparent)] max-h-[740px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>

        <div className="mt-16 pt-16 border-t border-zinc-800/50">
          <p className="text-center text-sm text-zinc-500 mb-8">Built in public across the web3 ecosystem</p>
          <div className="relative overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_20%,black_80%,transparent)]">
            <motion.div
              className="flex gap-12 md:gap-16"
              animate={{
                x: ["0%", "-50%"],
              }}
              transition={{
                x: {
                  duration: 20,
                  repeat: Number.POSITIVE_INFINITY,
                  ease: "linear",
                },
              }}
            >
              {/* Duplicate logos for seamless loop */}
              {[...logos, ...logos].map((logo, index) => (
                <span
                  key={`${logo}-${index}`}
                  className="text-xl font-semibold text-zinc-700 whitespace-nowrap flex-shrink-0"
                >
                  {logo}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
