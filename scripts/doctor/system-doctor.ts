import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ CRITICAL: Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ANSI Color Codes
const COLORS = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m'
};

let hasCriticalError = false;

function printCritical(msg: string) {
  console.log(`${COLORS.red}❌ CRITICAL:${COLORS.reset} ${msg}`);
  hasCriticalError = true;
}

function printWarning(msg: string) {
  console.log(`${COLORS.yellow}⚠️ WARNING:${COLORS.reset} ${msg}`);
}

function printInfo(msg: string) {
  console.log(`${COLORS.cyan}ℹ️ INFO:${COLORS.reset} ${msg}`);
}

function printSuccess(msg: string) {
  console.log(`${COLORS.green}✔ ${msg}${COLORS.reset}`);
}

async function checkDatabase() {
  console.log('\n--- 🏥 Database Doctor ---');
  
  // Check pricing
  const { data: pricing, error: pricingErr } = await supabase.from('provider_model_pricing').select('*');
  if (pricingErr) {
    printCritical(`Could not query provider_model_pricing: ${pricingErr.message}`);
    return;
  }
  if (!pricing || pricing.length === 0) {
    printCritical('provider_model_pricing is empty. Did you run seed.sql?');
  } else {
    printInfo(`Found ${pricing.length} pricing records.`);
  }

  // Check capabilities
  const { data: capabilities, error: capErr } = await supabase.from('ai_capabilities').select('*');
  if (capErr) {
    printCritical(`Could not query ai_capabilities: ${capErr.message}`);
    return;
  }
  if (!capabilities || capabilities.length === 0) {
    printCritical('ai_capabilities is empty.');
  } else {
    printInfo(`Found ${capabilities.length} capabilities.`);
    
    // Check inactive
    const inactive = capabilities.filter(c => !c.is_active);
    if (inactive.length > 0) {
      printWarning(`${inactive.length} capabilities are marked inactive (e.g. ${inactive[0].model}).`);
    }
  }

  // Check credit rules & relationships
  const { data: rules, error: rulesErr } = await supabase.from('credit_rules').select('*, provider_model_pricing(*)');
  if (rulesErr) {
    printCritical(`Could not query credit_rules: ${rulesErr.message}`);
    return;
  }
  if (!rules || rules.length === 0) {
    printCritical('credit_rules is empty.');
  } else {
    printInfo(`Found ${rules.length} credit rules.`);
    
    let badRelations = 0;
    rules.forEach(rule => {
      if (!rule.provider_model_pricing) {
        printCritical(`Credit Rule ${rule.feature} points to a missing pricing record.`);
        badRelations++;
      } else {
        // Cross check if the capability is active
        const relatedCap = capabilities?.find(c => c.provider === rule.provider_model_pricing.provider && c.model === rule.provider_model_pricing.model);
        if (relatedCap && !relatedCap.is_active) {
          printWarning(`Credit Rule ${rule.feature} points to inactive capability (${relatedCap.model}).`);
        }
      }
    });

    if (badRelations === 0 && rules.length > 0) printSuccess('Pricing, Capabilities, and Rules relationships OK.');
  }
}

async function checkBilling() {
  console.log('\n--- 💸 Billing Doctor ---');
  
  // Test RPC existence by calling them with null/dummy args.
  // We expect application-level errors (like invalid UUID), NOT "Could not find the function".
  const rpcs = ['reserve_credits', 'commit_credits', 'release_credits', 'grant_credits'];
  let allRpcOk = true;

  for (const rpc of rpcs) {
    const { error } = await supabase.rpc(rpc, { dummy: 'dummy' });
    if (error && error.code === 'PGRST202') { // Could not find the function
      printCritical(`Wallet RPC '${rpc}' is missing. Migration missing?`);
      allRpcOk = false;
    } else {
      printSuccess(`RPC '${rpc}' exists.`);
    }
  }

  if (allRpcOk) {
    printSuccess('Billing RPCs OK.');
  }
}

async function checkProviders() {
  console.log('\n--- 🤖 Providers Doctor ---');
  
  const providers = [
    { name: 'OpenRouter', key: 'OPENROUTER_API_KEY' },
    { name: 'ElevenLabs', key: 'ELEVENLABS_API_KEY' },
    { name: 'OpenAI', key: 'OPENAI_API_KEY' }
  ];

  providers.forEach(p => {
    if (!process.env[p.key]) {
      printWarning(`Missing ${p.key} for ${p.name}. Features using this provider will fail.`);
    } else {
      printSuccess(`${p.name} API Key configured.`);
    }
  });
}

async function checkStorage() {
  console.log('\n--- 📦 Storage Doctor ---');
  
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) {
    printCritical(`Could not query storage buckets: ${error.message}`);
    return;
  }
  
  const mediaBucket = buckets.find(b => b.name === 'media-library');
  if (!mediaBucket) {
    printCritical('Bucket "media-library" is missing. Run migrations.');
  } else {
    printSuccess('Bucket "media-library" exists.');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const module = args[0] || 'all';

  console.log(`${COLORS.cyan}Running System Doctor...${COLORS.reset}`);

  try {
    if (module === 'all' || module === 'database') await checkDatabase();
    if (module === 'all' || module === 'billing') await checkBilling();
    if (module === 'all' || module === 'providers') await checkProviders();
    if (module === 'all' || module === 'storage') await checkStorage();

    console.log('\n==================================');
    if (hasCriticalError) {
      console.log(`${COLORS.red}System Doctor finished with CRITICAL errors. Please fix them before deploying.${COLORS.reset}`);
      process.exit(1);
    } else {
      console.log(`${COLORS.green}System Doctor finished successfully. System Ready!${COLORS.reset}`);
      process.exit(0);
    }
  } catch (err: any) {
    console.error(`❌ Unexpected Error: ${err.message}`);
    process.exit(1);
  }
}

main();
