const fs = require('fs');
const path = require('path');

const loginPagePath = path.resolve(process.cwd(), 'src/app/login/page.tsx');
const homePagePath = path.resolve(process.cwd(), 'src/app/page.tsx');

const loginContent = `"use client"

import { useState, useEffect, Suspense } from "react"
import { motion } from "framer-motion"
import { Video, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { login, signup } from "./actions"
import { useSearchParams } from "next/navigation"

function LoginForm() {
  const searchParams = useSearchParams()
  const [isLogin, setIsLogin] = useState(searchParams.get("tab") !== "register")
  const [isLoading, setIsLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (searchParams.get("tab") === "register") {
      setIsLogin(false)
    }
  }, [searchParams])

  async function onSubmit(formData: FormData) {
    setIsLoading(true)
    setErrorMsg("")
    const res = isLogin ? await login(formData) : await signup(formData)
    if (res?.error) {
      setErrorMsg(res.error)
      setIsLoading(false)
    }
  }

  return (
    <Card className="border-0 shadow-xl dark:border dark:border-slate-800">
      <CardHeader className="space-y-1 pb-6 text-center">
        <CardTitle className="text-2xl font-semibold">
          {isLogin ? "Welcome back" : "Create an account"}
        </CardTitle>
        <CardDescription>
          {isLogin ? "Enter your email and password to sign in" : "Enter your email and password to get started"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="name@example.com"
              required
              autoComplete="email"
              className="h-11"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              {isLogin && (
                <a href="#" className="text-xs font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  Forgot password?
                </a>
              )}
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              required
              autoComplete={isLogin ? "current-password" : "new-password"}
              className="h-11"
            />
          </div>

          {errorMsg && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-500 dark:bg-red-900/50 dark:text-red-200">
              {errorMsg}
            </div>
          )}

          <Button type="submit" className="h-11 w-full bg-blue-600 hover:bg-blue-700 text-white" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isLogin ? "Signing in..." : "Creating account..."}
              </>
            ) : (
              isLogin ? "Sign in" : "Sign up"
            )}
          </Button>
        </form>
        
        <div className="mt-6 text-center text-sm">
          <span className="text-muted-foreground">
            {isLogin ? "Don't have an account?" : "Already have an account?"}
          </span>
          <button 
            type="button" 
            onClick={() => { setIsLogin(!isLogin); setErrorMsg(""); }} 
            className="ml-1 font-medium text-blue-600 hover:text-blue-500"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4 dark:bg-slate-950">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="mb-8 flex flex-col items-center justify-center space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-lg">
            <Video className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            TaoVideo
          </h1>
        </div>

        <Suspense fallback={<div className="flex justify-center p-8"><Loader2 className="animate-spin text-blue-600" /></div>}>
          <LoginForm />
        </Suspense>

        <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          By continuing, you agree to our Terms of Service and Privacy Policy.
        </p>
      </motion.div>
    </div>
  )
}
`;

const homeContent = `import Link from "next/link"
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
          <Link href="/login?tab=register">
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
          <Link href="/login?tab=register">
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
`;

try {
  fs.writeFileSync(loginPagePath, loginContent, 'utf8');
  console.log('[OK] Patched src/app/login/page.tsx');
  
  fs.writeFileSync(homePagePath, homeContent, 'utf8');
  console.log('[OK] Patched src/app/page.tsx');
  
  console.log("\\n🎉 Auth UI patched successfully. You can now register new accounts!");
} catch (err) {
  console.error('[ERROR] Failed to patch:', err.message);
  console.log("Make sure you are running this in an elevated Administrator terminal.");
}
