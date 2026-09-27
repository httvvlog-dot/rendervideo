import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function runTest() {
  console.log("Creating test image job...")
  
  // Need a user id
  const { data: user } = await supabase.from("profiles").select("id").limit(1).single()
  
  const { data: job, error } = await supabase.from('image_jobs').insert({
    user_id: user ? user.id : 'system',
    status: 'PENDING',
    original_prompt: 'A portrait of a person in Fashion style. Outfit: Vest. Background: Studio.',
    num_images: 4,
    provider: 'fal',
    model: 'fal-ai/flux-pro'
  }).select().single()

  if (error) {
    console.error("Error creating job", error)
    return
  }

  console.log("Job created:", job.id)
  console.log("Waiting for worker...")

  // Wait
  for (let i = 0; i < 20; i++) {
    await new Promise(r => setTimeout(r, 5000))
    const { data: check } = await supabase.from('image_jobs').select('*').eq('id', job.id).single()
    console.log(`Status: ${check.status}`)
    if (check.status === 'COMPLETED') {
       console.log("SUCCESS:", check.output_images)
       break
    }
    if (check.status === 'FAILED') {
       console.log("FAILED:", check.last_error)
       break
    }
  }
}

runTest().catch(console.error)
