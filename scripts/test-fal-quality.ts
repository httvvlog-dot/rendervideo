import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import path from 'path';
import { FalClient } from '../src/utils/provider-runtime/adapters/fal-client';

const FAL_KEY = process.env.FAL_KEY || process.env.IMAGE_PROVIDER_API_KEY;
if (!FAL_KEY) {
  console.error("Missing FAL_KEY in .env.local");
  process.exit(1);
}

const client = new FalClient(FAL_KEY);
const outputDir = path.join(process.cwd(), 'quality_tests');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const tests = [
  {
    name: '1_person_vest',
    prompt: 'A highly detailed cinematic portrait of a person in a vest, standing in an office. Sharp focus, realistic.',
    num_images: 4
  },
  {
    name: '1_person_ao_dai',
    prompt: 'A beautiful fashion portrait of a person wearing an elegant Ao Dai, standing in a traditional garden. Soft lighting, 8k resolution.',
    num_images: 4
  }
];

async function runValidation() {
  for (const t of tests) {
    console.log(`Running test: ${t.name}...`);
    try {
      const results = await client.run({
        model: 'fal-ai/flux-pro',
        prompt: t.prompt,
        num_images: t.num_images,
        image_size: { width: 768, height: 1024 }
      });
      
      console.log(`Success: ${results.length} images generated.`);
      
      // Save images locally
      for (let i = 0; i < results.length; i++) {
        const img = results[i];
        const res = await fetch(img.url);
        const buffer = await res.arrayBuffer();
        fs.writeFileSync(path.join(outputDir, `${t.name}_${i}.jpg`), Buffer.from(buffer));
        console.log(`Saved ${t.name}_${i}.jpg`);
      }
    } catch (err: any) {
      console.error(`Failed test ${t.name}:`, err.message);
    }
  }
}

runValidation().catch(console.error);
