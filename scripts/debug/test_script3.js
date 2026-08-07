import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
console.log("OpenRouter API Key present:", !!process.env.OPENROUTER_API_KEY);
