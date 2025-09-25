"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, FileText } from "lucide-react"

interface DocumentTypeErrorModalProps {
  isOpen: boolean
  onClose: () => void
  onRetry: () => void
}

export function DocumentTypeErrorModal({ isOpen, onClose, onRetry }: DocumentTypeErrorModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            文档类型错误
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 border-2 border-destructive/20">
              <FileText className="h-8 w-8 text-destructive" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">检测到非行政处罚决定书</h3>
            <p className="text-sm text-muted-foreground mb-4">本系统仅支持审查行政处罚决定书，请上传正确的文档类型。</p>
            <div className="bg-muted/50 rounded-lg p-3 text-left">
              <p className="text-xs text-muted-foreground mb-2">支持的文档类型：</p>
              <ul className="text-xs text-foreground space-y-1">
                <li>• 行政处罚决定书</li>
                <li>• 格式：DOCX</li>
                <li>• 大小：最大 10MB</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={onClose}>
              取消
            </Button>
            <Button onClick={onRetry} className="bg-primary">
              重新上传
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
