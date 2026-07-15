async function testRender() {
  try {
    const res = await fetch("http://localhost:3000/api/render", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId: "4e3f9bcf-9bd1-4507-90ff-ba3c92204794" })
    });
    const text = await res.text();
    console.log("Status:", res.status);
    console.log("Body:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}
testRender();
