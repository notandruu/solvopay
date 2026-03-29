"use client"

import type { ReactNode } from "react"

interface LenisProviderProps {
  children: ReactNode
}

export function LenisProvider({ children }: LenisProviderProps) {
  return <>{children}</>
}
