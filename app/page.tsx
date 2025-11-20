import { Header } from "@/components/header"
import { FileUploadSection } from "@/components/file-upload-section"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 container mx-auto max-w-[1200px] px-6 flex flex-col justify-center relative">
        {/* Background Glow Effect */}
        <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary/5 blur-[100px] rounded-full opacity-50" />
          <div className="absolute bottom-0 right-0 w-[800px] h-[600px] bg-blue-100/20 blur-[120px] rounded-full opacity-30" />
        </div>

        <div className="mx-auto max-w-4xl text-center animate-fade-in-up">
          <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-foreground text-balance mb-12 drop-shadow-sm">
            执法文书<span className="text-gradient">智能校验</span>系统
          </h1>

          <div className="relative z-10">
            <FileUploadSection />
          </div>
        </div>
      </main>

      <footer className="border-t border-border/40 bg-white/50 backdrop-blur-sm py-6 mt-auto">
        <div className="container mx-auto max-w-[1200px] px-6 text-center text-sm font-light text-muted-foreground">
          © 2025 执法文书校验系统 · 语义 + 规则双引擎 |{" "}
          <a
            href="https://beian.miit.gov.cn/"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-primary transition-colors underline decoration-transparent hover:decoration-primary/30 underline-offset-4"
          >
            浙ICP备2025160577号
          </a>
        </div>
      </footer>
    </div>
  )
}
