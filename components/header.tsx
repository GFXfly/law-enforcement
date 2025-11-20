"use client"

import { useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ShieldCheck } from "lucide-react"
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

  const navInteractiveClasses =
    "transition-all duration-200 ease-out hover:-translate-y-0.5 focus-visible:-translate-y-0.5 hover:shadow-lg focus-visible:shadow-lg hover:bg-primary/10 focus-visible:bg-primary/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"

  return (
    <>
      <div className={cn("top-progress-bar", isVisible && "active")} />

      <header className="sticky top-0 z-50 w-full border-b border-border/40 glass transition-all duration-300">
        <div className="container mx-auto max-w-[1200px] flex h-16 items-center justify-between px-6">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-lg font-semibold tracking-tight text-foreground transition-all duration-200 ease-out hover:bg-secondary/50"
            aria-label="返回首页"
          >
            <div className="relative flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <span className="bg-gradient-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">文书校验</span>
          </Link>

          <nav className="flex items-center gap-1">
            {items.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "relative h-9 px-4 text-sm font-medium transition-all duration-200",
                  item.isActive
                    ? "text-primary bg-primary/10 hover:bg-primary/15"
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/80",
                )}
                aria-current={item.isActive ? "page" : undefined}
                onClick={() => {
                  if (!item.isActive) {
                    router.push(item.href)
                  }
                }}
              >
                {item.label}
                {item.isActive && (
                  <span className="absolute inset-x-0 -bottom-[13px] h-[2px] bg-primary rounded-t-full" />
                )}
              </Button>
            ))}
          </nav>
        </div>
      </header>
    </>
  )
}
