"use client"

import { Shield } from "lucide-react"
import Link from "next/link"

export function ResultsHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-white">
      <div className="container mx-auto max-w-[1200px] flex h-16 items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold text-foreground">文书校验</span>
          </div>
        </div>

        <nav className="flex items-center gap-6">
          <Link href="/results" className="text-sm font-medium text-foreground hover:text-primary transition-colors">
            检查结果
          </Link>
          <Link
            href="/records"
            className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            审查记录
          </Link>
          <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors">
            文档检查
          </Link>
        </nav>
      </div>
    </header>
  )
}
