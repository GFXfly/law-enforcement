"use client"

import { useMemo } from "react"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { useProgressBar } from "@/components/progress-bar-context"

const NAV_ITEMS = [
  { label: "文档检查", href: "/" },
  { label: "检查结果", href: "/results" },
  { label: "审查记录", href: "/records" },
]

export function Header() {
  const router = useRouter()
  const pathname = usePathname()
  const { isVisible } = useProgressBar()

  const items = useMemo(
    () =>
      NAV_ITEMS.map((item) => ({
        ...item,
        isActive: pathname === item.href,
      })),
    [pathname],
  )

  return (
    <>
      <div className={cn("top-progress-bar", isVisible && "active")} />

      <header className="border-b border-border bg-white">
        <div className="container mx-auto max-w-[1200px] flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-medium text-foreground">文书校验</span>
          </div>

          <nav className="flex items-center gap-6">
            {items.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "text-sm font-medium transition-colors",
                  item.isActive ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
                aria-current={item.isActive ? "page" : undefined}
                onClick={() => {
                  if (!item.isActive) {
                    router.push(item.href)
                  }
                }}
              >
                {item.label}
              </Button>
            ))}
          </nav>
        </div>
      </header>
    </>
  )
}
