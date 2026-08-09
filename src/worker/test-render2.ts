import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env.worker' });
import { RenderEngine } from '../utils/render/engine';

async function run() {
  const engine = new RenderEngine();
  try {
    const outputUrl = await engine.processJob('b92c2d76-7ed4-474f-baa4-9a8cfe76f8cf');
    console.log('SUCCESS:', outputUrl);
  } catch (err) {
    console.error('ERROR:', err);
  }
}
run();
