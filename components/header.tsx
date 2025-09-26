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

      <header className="border-b border-border bg-white">
        <div className="container mx-auto max-w-[1200px] flex h-16 items-center justify-between px-6">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-full border border-transparent px-3 py-1.5 text-lg font-medium text-foreground transition-all duration-200 ease-out hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label="返回首页"
          >
            <ShieldCheck className="h-6 w-6 text-primary transition-transform duration-200 group-hover:scale-110" />
            <span>文书校验</span>
          </Link>

          <nav className="flex items-center gap-6">
            {items.map((item) => (
              <Button
                key={item.href}
                variant="ghost"
                className={cn(
                  "text-sm font-medium px-3",
                  navInteractiveClasses,
                  item.isActive
                    ? "text-primary bg-primary/10"
                    : "text-muted-foreground hover:text-primary",
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
