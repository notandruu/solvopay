"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"

const navLinks = [
  { href: "#features", label: "Features" },
  { href: "#how-it-works", label: "How It Works" },
  { href: "#testimonials", label: "Testimonials" },
  { href: "#protocol", label: "Protocol" },
]

function handleSmoothScroll(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  if (!href.startsWith("#")) return
  e.preventDefault()
  const id = href.slice(1)
  const el = document.getElementById(id)
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
}

export function Navbar() {
  const [open, setOpen] = useState(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-40 p-4">
      <nav className="max-w-5xl mx-auto flex items-center justify-between h-12 px-5 rounded-full bg-zinc-900/70 border border-zinc-800/50 backdrop-blur-md">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <Image src="/logo.png" alt="SolvoPay" width={28} height={28} className="rounded-md" />
          <span className="font-display text-lg font-semibold text-zinc-100">SolvoPay</span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => handleSmoothScroll(e, link.href)}
              className="px-3 py-1.5 text-sm rounded-full transition-colors text-zinc-400 hover:text-zinc-100 cursor-pointer whitespace-nowrap"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="https://github.com/notandruu/solvopay"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-2 px-4 py-1.5 text-sm rounded-full bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors whitespace-nowrap"
          >
            GitHub
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="md:hidden p-1.5 text-zinc-400 hover:text-zinc-100 transition-colors"
          aria-label="Toggle menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {/* Mobile dropdown */}
      {open && (
        <div className="md:hidden max-w-5xl mx-auto mt-2 rounded-2xl bg-zinc-900/95 border border-zinc-800/50 backdrop-blur-md px-4 py-3 flex flex-col gap-1">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={(e) => { handleSmoothScroll(e, link.href); setOpen(false) }}
              className="px-3 py-2 text-sm rounded-xl text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50 transition-colors cursor-pointer"
            >
              {link.label}
            </a>
          ))}
          <Link
            href="https://github.com/notandruu/solvopay"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setOpen(false)}
            className="mt-1 px-3 py-2 text-sm rounded-xl bg-zinc-100 text-zinc-900 font-medium hover:bg-zinc-200 transition-colors text-center"
          >
            GitHub
          </Link>
        </div>
      )}
    </header>
  )
}
