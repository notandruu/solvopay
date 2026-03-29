import { Check } from "lucide-react"
import Link from "next/link"

const plans = [
  {
    name: "Agent",
    description: "For autonomous agents running tasks",
    price: "$0",
    period: "/ session overhead",
    features: ["Open session with USDC deposit", "Sign vouchers off-chain", "Self-refund after deadline"],
    cta: "View SDK →",
    highlighted: false,
  },
  {
    name: "Service Provider",
    description: "For APIs and tools accepting agent payments",
    price: "Pay",
    period: "-per-use",
    features: [
      "Receive signed vouchers",
      "Submit final voucher on-chain",
      "Earn yield share at settlement",
    ],
    cta: "Read the Docs →",
    highlighted: true,
  },
  {
    name: "Protocol",
    description: "For builders extending the primitive",
    price: "Custom",
    period: "",
    features: [
      "Fork SessionEscrow",
      "Configure yield splits",
      "Deploy on any Base-compatible chain",
    ],
    cta: "View on GitHub →",
    highlighted: false,
  },
]

export function PricingSection() {
  return (
    <section id="protocol" className="px-6 py-24">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">PROTOCOL</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-100 mb-4">
            Open. Composable. On-chain.
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto text-balance text-lg">
            No hidden fees. No subscriptions. Pay per session, settle once.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`p-8 rounded-2xl border flex flex-col h-full ${
                plan.highlighted ? "bg-zinc-100 border-zinc-100" : "bg-zinc-900/50 border-zinc-800/50"
              }`}
            >
              {/* Plan Header */}
              <div className="mb-6">
                <h3
                  className={`font-heading text-xl font-semibold mb-2 ${
                    plan.highlighted ? "text-zinc-900" : "text-zinc-100"
                  }`}
                >
                  {plan.name}
                </h3>
                <p className={`text-sm ${plan.highlighted ? "text-zinc-600" : "text-zinc-500"}`}>{plan.description}</p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span
                  className={`font-display text-4xl font-bold ${plan.highlighted ? "text-zinc-900" : "text-zinc-100"}`}
                >
                  {plan.price}
                </span>
                <span className={`text-sm ${plan.highlighted ? "text-zinc-600" : "text-zinc-500"}`}>{plan.period}</span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check className={`w-5 h-5 shrink-0 ${plan.highlighted ? "text-zinc-900" : "text-zinc-400"}`} />
                    <span className={`text-sm ${plan.highlighted ? "text-zinc-700" : "text-zinc-400"}`}>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href="#"
                className={`block w-full py-3 px-6 text-center rounded-full font-medium text-sm transition-colors mt-auto ${
                  plan.highlighted
                    ? "bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                    : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
