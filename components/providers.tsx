"use client"

import type { ReactNode } from "react"
import { ProgressBarProvider } from "@/components/progress-bar-context"

export function Providers({ children }: { children: ReactNode }) {
  return <ProgressBarProvider>{children}</ProgressBarProvider>
}
