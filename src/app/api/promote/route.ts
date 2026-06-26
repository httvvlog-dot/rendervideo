import { createClient } from "@/utils/supabase/server"
import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const supabase = await createClient()
  
  // Get current logged in user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError || !user) {
    return NextResponse.json({ error: "You must be logged in first to promote yourself!" }, { status: 401 })
  }

  // Update their profile role to admin
  const { error: updateError } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', user.id)

  if (updateError) {
    return NextResponse.json({ error: "Failed to promote: " + updateError.message }, { status: 500 })
  }

  // Also update email just in case it wasn't synced
  if (user.email === 'acc792003@gmail.com') {
     console.log("Promoted acc792003@gmail.com to Admin");
  }

  return NextResponse.json({ 
    success: true, 
    message: `Successfully promoted ${user.email} to Admin!`,
    action: "Please click the logout button or clear cookies, then log back in to refresh your session."
  })
}
