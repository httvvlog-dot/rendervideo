import { createClient } from '@supabase/supabase-js';
import * as readline from 'readline';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function askQuestion(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => rl.question(query, (ans) => {
    rl.close();
    resolve(ans);
  }));
}

async function findUser(email: string) {
  const { data: usersData, error: usersErr } = await supabase.auth.admin.listUsers();
  if (usersErr) throw new Error(`Failed to list users: ${usersErr.message}`);
  
  const user = usersData.users.find(u => u.email === email);
  if (!user) throw new Error(`User with email ${email} not found in auth.users.`);
  return user;
}

async function getProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error || !data) throw new Error(`Profile not found for user ID: ${userId}`);
  return data;
}

async function logAudit(action: string, targetUserId: string, targetEmail: string, oldData: any, newData: any) {
  const executor = process.env.USER || process.env.USERNAME || 'CLI';
  const { error } = await supabase.from('system_audit_logs').insert({
    target_user_id: targetUserId,
    target_email: targetEmail,
    action,
    old_data: oldData,
    new_data: newData,
    executor
  });
  if (error) {
    console.warn(`⚠️ Warning: Failed to insert system_audit_logs: ${error.message}`);
  }
}

async function manageRole(email: string, newRole: string, force: boolean) {
  const user = await findUser(email);
  const profile = await getProfile(user.id);

  console.log(`\nUser found: ${email}`);
  console.log(`Current Role: ${profile.role}`);

  if (profile.role === newRole) {
    console.log(`✅ User already has the role '${newRole}'.`);
    return;
  }

  if (!force) {
    const answer = await askQuestion(`Change role from '${profile.role}' to '${newRole}'? (Y/N): `);
    if (answer.toLowerCase() !== 'y') {
      console.log('Aborted.');
      return;
    }
  }

  const oldData = { role: profile.role };
  const newData = { role: newRole };

  const { error: updateErr } = await supabase
    .from('profiles')
    .update(newData)
    .eq('id', user.id);

  if (updateErr) throw new Error(`Failed to update profile: ${updateErr.message}`);

  await logAudit('update_role', user.id, email, oldData, newData);

  console.log(`✅ Success! User ${email} role changed to '${newRole}'.`);
}

async function suspendUser(email: string, force: boolean) {
  const user = await findUser(email);
  // Implementation for suspending would typically involve banning the user in auth.users
  // supabase.auth.admin.updateUserById(user.id, { ban_duration: '1000h' })
  console.log(`Suspend command recognized for ${email}. (Implementation pending actual DB setup)`);
}

async function main() {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const cleanArgs = args.filter(a => a !== '--force');

  const command = cleanArgs[0];

  try {
    switch (command) {
      case 'role': {
        const email = cleanArgs[1];
        const newRole = cleanArgs[2];
        if (!email || !newRole) {
          console.error('Usage: npm run admin role <email> <role> [--force]');
          process.exit(1);
        }
        await manageRole(email, newRole, force);
        break;
      }
      case 'suspend': {
        const email = cleanArgs[1];
        if (!email) {
          console.error('Usage: npm run admin suspend <email> [--force]');
          process.exit(1);
        }
        await suspendUser(email, force);
        break;
      }
      case 'unlock':
        console.log('Unlock command recognized.');
        break;
      default:
        console.error('Unknown command. Available commands: role, suspend, unlock');
        console.error('Usage: npm run admin <command> ...');
        process.exit(1);
    }
  } catch (err: any) {
    console.error(`❌ Error: ${err.message}`);
    process.exit(1);
  }
}

main();
