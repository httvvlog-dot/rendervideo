import { createClient } from "@/utils/supabase/server"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"

async function performLogout(request: Request) {
  try {
    const supabase = await createClient()
    await supabase.auth.signOut()
  } catch (error) {
    console.error("[LOGOUT] Supabase signOut error:", error)
  }

  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()
  for (const cookie of allCookies) {
    if (cookie.name.startsWith("sb-")) {
      cookieStore.delete(cookie.name)
    }
  }

  const loginUrl = new URL("/login", request.url)
  const response = NextResponse.redirect(loginUrl, { status: 303 })
  for (const cookie of allCookies) {
    if (cookie.name.startsWith("sb-")) {
      response.cookies.delete(cookie.name)
    }
  }
  return response
}

export async function GET(request: Request) {
  return performLogout(request)
}

export async function POST(request: Request) {
  return performLogout(request)
}
