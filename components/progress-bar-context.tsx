"use client"

import { createContext, useContext, useMemo, useState } from "react"

interface ProgressBarContextValue {
  isVisible: boolean
  setIsVisible: (visible: boolean) => void
}

const ProgressBarContext = createContext<ProgressBarContextValue | undefined>(undefined)

export function ProgressBarProvider({ children }: { children: React.ReactNode }) {
  const [isVisible, setIsVisible] = useState(false)

  const value = useMemo<ProgressBarContextValue>(
    () => ({ isVisible, setIsVisible }),
    [isVisible],
  )

  return <ProgressBarContext.Provider value={value}>{children}</ProgressBarContext.Provider>
}

export function useProgressBar() {
  const context = useContext(ProgressBarContext)
  if (!context) {
    throw new Error("useProgressBar must be used within ProgressBarProvider")
  }
  return context
}
