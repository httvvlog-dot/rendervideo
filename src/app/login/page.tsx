"use client"

import { useState, useEffect, Suspense } from "react"
import { motion } from "framer-motion"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { login, signup } from "./actions"
import { HataraLogo } from "@/components/hatara-logo"
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
          <div className="flex items-center justify-center">
            <HataraLogo className="h-12 w-12" />
          </div>
          <div className="flex flex-col items-center">
            <h1 className="text-3xl font-extrabold tracking-tight">
              <span className="bg-gradient-to-br from-purple-500 via-fuchsia-500 to-blue-500 bg-clip-text text-transparent">Hatara</span>
              <span className="text-slate-900 dark:text-slate-50 ml-2">Studio</span>
            </h1>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mt-1">
              AI Creative Platform
            </span>
          </div>
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
