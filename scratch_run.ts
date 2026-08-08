import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { generateMissingProjectVoice } from "./src/app/(user)/projects/[id]/voice-actions";
import { createAdminClient } from "./src/utils/supabase/admin";

async function main() {
    console.log("Starting script...");
    const projectId = "8761cb65-94bd-4d79-a15c-0cee5967576b";
    const supabase = createAdminClient();
    try {
        const result = await generateMissingProjectVoice(projectId, undefined, true, supabase);
        console.log("Result:", result);
    } catch (err) {
        console.error("Script error:", err);
    }
}
main();
