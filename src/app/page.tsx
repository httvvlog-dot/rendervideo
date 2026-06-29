import Link from "next/link"
import { Video, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function Home() {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50">
      <header className="flex items-center justify-between px-6 py-4 border-b bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <Video className="h-6 w-6 text-indigo-600" />
          <span className="font-bold text-xl tracking-tight">TaoVideo</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium hover:text-indigo-600 transition-colors">
            Log in
          </Link>
          <Link href="/login">
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-full px-6">
              Sign up
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 py-20">
        <div className="mb-8 flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-2xl">
          <Video className="h-10 w-10" />
        </div>
        
        <h1 className="mb-4 text-5xl font-extrabold tracking-tight sm:text-7xl max-w-4xl">
          Generate YouTube Videos with AI
        </h1>
        
        <p className="mb-10 text-xl text-slate-600 dark:text-slate-400 max-w-2xl">
          The ultimate AI-powered video creation studio. Transform your text ideas into fully produced, voice-overed, and edited videos with just a few clicks.
        </p>

        <div className="flex items-center space-x-4 mb-20">
          <Link href="/login">
            <Button size="lg" className="h-14 px-8 text-lg bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all">
              Start Creating for Free <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        {/* Pricing Section (Coming Soon) */}
        <div className="w-full max-w-5xl text-left">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Simple, transparent pricing</h2>
            <p className="text-muted-foreground mt-2">Start for free, upgrade when you need more power.</p>
            <div className="inline-block mt-4 px-3 py-1 bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200 rounded-full text-xs font-bold uppercase tracking-wider">
              Coming Soon (Sprint 5)
            </div>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 opacity-60 grayscale cursor-not-allowed">
            {[
              { name: "Starter", price: "$0", desc: "Perfect for testing the waters." },
              { name: "Pro", price: "$29", desc: "For serious content creators." },
              { name: "Agency", price: "$99", desc: "High volume production." }
            ].map(plan => (
              <div key={plan.name} className="border bg-card rounded-2xl p-8 shadow-sm">
                <h3 className="text-xl font-bold">{plan.name}</h3>
                <div className="mt-4 flex items-baseline text-4xl font-extrabold">
                  {plan.price}
                  <span className="ml-1 text-xl font-medium text-muted-foreground">/mo</span>
                </div>
                <p className="mt-4 text-sm text-muted-foreground">{plan.desc}</p>
                <ul className="mt-8 space-y-4">
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-indigo-500 mr-3 shrink-0" /> <span className="text-sm">720p Resolution</span></li>
                  <li className="flex items-center"><CheckCircle2 className="h-5 w-5 text-indigo-500 mr-3 shrink-0" /> <span className="text-sm">Standard Voices</span></li>
                </ul>
                <Button variant="outline" className="w-full mt-8 rounded-full" disabled>Coming Soon</Button>
              </div>
            ))}
          </div>
        </div>
      </main>

      <footer className="py-6 border-t text-center text-sm text-slate-500">
        © 2026 TaoVideo. All rights reserved.
      </footer>
    </div>
  )
}
