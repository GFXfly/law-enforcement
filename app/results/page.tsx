import { Suspense } from "react"

import ResultsPageClient from "./results-page-client"

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default function ResultsPage() {
  return (
    <Suspense fallback={null}>
      <ResultsPageClient />
    </Suspense>
  )
}
