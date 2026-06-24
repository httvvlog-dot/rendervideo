# AI YouTube Video Generator SaaS

A massive multi-tenant SaaS for automated YouTube video generation, utilizing Next.js, Supabase, Cloudflare R2, Remotion, and various AI Providers.

## Tech Stack
- Next.js 15 (App Router, Server Actions)
- TypeScript
- TailwindCSS, Shadcn UI
- Supabase (PostgreSQL, Auth, RLS)
- Cloudflare R2
- Render Worker (Remotion)

## Setup
1. Copy `.env.example` to `.env.local` and fill in your Supabase details.
2. Run `npm install`.
3. Run `npx supabase link --project-ref [YOUR_REF]` to connect to your Supabase Cloud.
4. Run `npx supabase db push` to push the schema.
5. Run `npm run dev` to start the development server.

## Features
- Full Role-Based Access Control (Admin / User).
- Dynamic Provider Integrations (OpenRouter, ElevenLabs, Whisper).
- Automated Video Generation Pipeline.
