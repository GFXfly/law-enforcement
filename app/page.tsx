import { Header } from "@/components/header"
import { FileUploadSection } from "@/components/file-upload-section"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto max-w-[1200px] px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight text-foreground text-balance">
            执法文书校验系统
          </h1>
          <p className="mt-6 text-lg text-muted-foreground leading-relaxed">智能检查，精准定位</p>

          <div className="mt-16">
            <FileUploadSection />
          </div>
        </div>
      </main>

      <footer className="border-t border-border/50 bg-muted/20 py-8">
        <div className="container mx-auto max-w-[1200px] px-6 text-center text-sm font-light text-muted-foreground">
          © 2025 执法文书校验系统 · 语义 + 规则双引擎 | 浙ICP备2025160577号-2
        </div>
      </footer>
    </div>
  )
}
