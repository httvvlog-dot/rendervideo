import Link from "next/link"
import { Video, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 text-center px-4">
      <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-2xl">
        <Video className="h-10 w-10" />
      </div>
      
      <h1 className="mb-4 text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white sm:text-6xl">
        Welcome to TaoVideo
      </h1>
      
      <p className="mb-8 text-lg text-slate-600 dark:text-slate-400 max-w-2xl">
        The ultimate AI-powered YouTube video generator. Transform your ideas into fully produced videos with just a few clicks.
      </p>

      <div className="flex items-center space-x-4">
        <Link href="/dashboard">
          <Button size="lg" className="h-12 px-8 text-base bg-blue-600 hover:bg-blue-700 text-white rounded-full">
            Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  )
}
