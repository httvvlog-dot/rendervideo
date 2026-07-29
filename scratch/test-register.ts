import { MediaService } from "../src/utils/media/MediaService";
import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.worker" }); // To get DB url and key

async function run() {
  try {
    const result = await MediaService.register(
      "test-object-key-1234",
      "https://test.url/file.mp4",
      "video/mp4",
      1024,
      "test-hash-xyz-123",
      "invalid-user-id", // test what happens
      "RENDER"
    );
    console.log("Success:", result);
  } catch (error: any) {
    console.error("=== MEDIA REGISTER ERROR ===");
    console.error("Error name:", error?.name);
    console.error("Error message:", error?.message);
    console.error("Error cause:", error?.cause);
    if (error?.code) console.error("Error code:", error.code);
    if (error?.details) console.error("Error details:", error.details);
    if (error?.hint) console.error("Error hint:", error.hint);
    console.error(error);
  }
}
run();
