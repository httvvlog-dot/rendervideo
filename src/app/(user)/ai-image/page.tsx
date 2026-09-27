import { AIImageClient } from "./client"
import { getCurrentUser } from "@/utils/auth-service"
import { redirect } from "next/navigation"

export default async function AIImagePage() {
  const user = await getCurrentUser()
  if (!user) return redirect("/login")

  return (
    <div className="flex flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Ảnh</h1>
        <p className="text-muted-foreground">Tạo ảnh chân dung chuyên nghiệp bằng AI.</p>
      </div>
      <AIImageClient userId={user.id} />
    </div>
  )
}
