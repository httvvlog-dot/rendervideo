export function verifyWorkerToken(authHeader: string | null): boolean {
  if (!authHeader) return false;

  if (process.env.NODE_ENV === "production" && !process.env.WORKER_SECRET) {
    console.error("CRITICAL: WORKER_SECRET is missing in production environment");
    return false;
  }
  
  const secret = process.env.WORKER_SECRET || "dev-worker-secret-123";
  return authHeader === `Bearer ${secret}`;
}
