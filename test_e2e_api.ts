import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function testRenderApi() {
  const projectId = "4e3f9bcf-9bd1-4507-90ff-ba3c92204794";
  console.log(`[Test] Calling /api/render for project ${projectId}`);
  
  try {
    const res = await fetch("http://localhost:3000/api/render", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ projectId })
    });
    
    const data = await res.json();
    console.log("[Test] API Response:", data);
    
    if (data.jobId) {
      console.log(`[Test] Successfully queued render job. ID: ${data.jobId}`);
      // Now poll the API just like the UI does
      const interval = setInterval(async () => {
        const pollRes = await fetch(`http://localhost:3000/api/render/${data.jobId}`);
        const pollData = await pollRes.json();
        
        if (pollData.job) {
          console.log(`[Status] ${pollData.job.status} - Progress: ${pollData.job.progress}%`);
          if (pollData.job.status === 'completed') {
             console.log(`✅ [Test SUCCESS] URL: ${pollData.job.output_url}`);
             clearInterval(interval);
             process.exit(0);
          } else if (pollData.job.status === 'failed') {
             console.log(`❌ [Test FAILED] ${pollData.job.error_message}`);
             clearInterval(interval);
             process.exit(1);
          }
        }
      }, 2000);
    } else {
      console.log("[Test] Failed to get jobId from response.");
    }
  } catch (err) {
    console.error("[Test] Fetch error:", err);
  }
}

testRenderApi();
