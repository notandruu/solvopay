import Link from "next/link"
import { Github, Twitter, Linkedin } from "lucide-react"

const footerLinks = {
  product: [
    { label: "How It Works", href: "#how-it-works" },
    { label: "SDK", href: "#" },
    { label: "Contracts", href: "#" },
    { label: "Changelog", href: "#" },
  ],
  protocol: [
    { label: "SessionEscrow", href: "#" },
    { label: "VoucherLib", href: "#" },
    { label: "SessionFactory", href: "#" },
    { label: "Aave Integration", href: "#" },
  ],
  links: [
    { label: "GitHub", href: "#" },
    { label: "Devpost", href: "#" },
    { label: "BlockVault", href: "#" },
    { label: "Contact", href: "#" },
  ],
}

export function FooterSection() {
  return (
    <footer className="px-6 py-16 border-t border-zinc-900">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="font-display text-xl font-semibold text-zinc-100">
              SolvoPay
            </Link>
            <p className="mt-4 text-sm text-zinc-500 max-w-xs">
              On-chain payment sessions for AI agents. The escrow primitive for machine-speed payments.
            </p>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-zinc-100 mb-4">Product</h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Protocol Links */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-zinc-100 mb-4">Protocol</h4>
            <ul className="space-y-3">
              {footerLinks.protocol.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-zinc-100 mb-4">Links</h4>
            <ul className="space-y-3">
              {footerLinks.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-600">© {new Date().getFullYear()} SolvoPay. Built on Base.</p>
          <div className="flex items-center gap-4">
            <Link href="#" className="text-zinc-500 hover:text-zinc-300 transition-colors" aria-label="GitHub">
              <Github className="w-5 h-5" />
            </Link>
            <Link href="#" className="text-zinc-500 hover:text-zinc-300 transition-colors" aria-label="Twitter">
              <Twitter className="w-5 h-5" />
            </Link>
            <Link href="#" className="text-zinc-500 hover:text-zinc-300 transition-colors" aria-label="LinkedIn">
              <Linkedin className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
