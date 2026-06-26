# TaoVideo Architecture Decisions

This document records the core architectural decisions made during the development of TaoVideo to ensure future maintainability and clear developer onboarding.

## 1. Why Supabase?
- **Speed to Market**: Provides an instant PostgreSQL backend with built-in Authentication and Row Level Security (RLS).
- **Edge Functions**: Allows us to run lightweight background tasks or webhooks without maintaining a separate Node.js server.
- **Realtime**: Essential for live progress updates on the Workflow Timeline and Job Queue without complex WebSocket setups.

## 2. Why Cloudflare R2?
- **Zero Egress Fees**: AI video generation involves moving massive amounts of media (audio, images, video chunks). AWS S3 would incur astronomical bandwidth costs. R2 eliminates data transfer out fees.
- **S3 Compatibility**: Drop-in replacement for any standard AWS SDK code.

## 3. Why a Separate Render Worker?
- **Resource Isolation**: Video rendering (using Remotion/FFmpeg) is CPU and memory intensive. Running this on the main Next.js Vercel instance would cause timeouts and crash the web server.
- **Scalability**: Workers can be horizontally scaled in Docker containers (e.g., on AWS ECS or GCP Cloud Run) based on the `job_queue` length.

## 4. Why "Workflow First" over "CRUD First"?
- **User Journey Focus**: SaaS users pay for results (a generated video), not for data entry forms. The Project Wizard guides them chronologically (Topic -> Language -> Length -> Voice -> Prompt -> Render), hiding complexity until needed.
- **Conversion Rate**: A linear step-by-step workflow with Auto-save Drafts prevents user drop-off compared to overwhelming multi-tab configuration screens.

## 5. Why Storage Abstraction?
- **Provider Agnostic**: Files are tracked in `storage_files` and `media_assets` with standard interfaces. If Cloudflare R2 goes down, we can seamlessly switch to AWS S3 or Supabase Storage without changing the core application logic.
- **Reuse Engine**: By decoupling media from the specific rendering engine, we can detect if an image or voice snippet already exists and skip the costly AI generation API calls.

## 6. Why a Job Queue?
- **Resilience**: AI APIs (OpenRouter, ElevenLabs) are prone to rate-limiting and timeouts. A job queue ensures we can safely retry failed tasks without losing the user's progress.
- **Asynchronous UX**: Users can start a project and leave the dashboard. The job queue orchestrates the background processing and updates the Workflow Timeline independently.
