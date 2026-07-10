"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { createClient } from "@/utils/supabase/server"
import { getCurrentUser } from "@/utils/auth-service"

export async function login(formData: FormData) {
  const supabase = await createClient()
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }
  const { error } = await supabase.auth.signInWithPassword(data)
  if (error) {
    return { error: error.message }
  }
  
  const user = await getCurrentUser()
  if (user?.role === "admin") {
    revalidatePath("/admin/dashboard")
    redirect("/admin/dashboard")
  }
  revalidatePath("/dashboard")
  redirect("/dashboard")
}

export async function signup(formData: FormData) {
  const supabase = await createClient()
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  }
  const { data: signUpData, error } = await supabase.auth.signUp(data)
  if (error) {
    return { error: error.message }
  }
  
  if (signUpData?.user && !signUpData?.session) {
    return { error: "Đăng ký thành công! Vui lòng kiểm tra hộp thư email của bạn để xác nhận tài khoản." }
  }
  
  revalidatePath("/dashboard")
  redirect("/dashboard")
}
