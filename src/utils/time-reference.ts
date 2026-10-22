/**
 * Time Reference Hardening Utility
 * 
 * Provides synchronized, authoritative date and time for AI research prompts,
 * preventing local container/server clock drift from distorting real-time queries.
 */

export interface TimeReferenceOptions {
  timezone?: string;
  maxDriftMinutes?: number;
  forceRefresh?: boolean;
  supabaseUrl?: string;
}

export interface TimeReferenceResult {
  utcTimestamp: string;
  calendarDate: string; // YYYY-MM-DD in the specified timezone
  timezone: string;
  driftMinutes: number;
  driftHours: number;
  isDriftExceeded: boolean;
  authoritativeSource: "database_http" | "cached_offset" | "runtime_fallback";
  formattedDateTime: string;
}

let cachedOffsetMs: number | null = null;
let lastOffsetFetchTimeMs = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache TTL

/**
 * Formats a given Date into a YYYY-MM-DD string in a specified timezone.
 * Uses en-CA locale which reliably produces ISO-like YYYY-MM-DD format.
 */
export function formatCalendarDate(date: Date, timezone: string = "Asia/Ho_Chi_Minh"): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    return formatter.format(date);
  } catch {
    // Fallback if timezone is invalid
    return date.toISOString().split("T")[0];
  }
}

/**
 * Fetches authoritative time from the primary database/backend HTTP infrastructure.
 * Calculates clock drift between local Node.js runtime and remote server.
 */
export async function getAuthoritativeTime(options: TimeReferenceOptions = {}): Promise<TimeReferenceResult> {
  const timezone = options.timezone || "Asia/Ho_Chi_Minh";
  const maxDriftMinutes = options.maxDriftMinutes ?? 60; // 1 hour default tolerance
  const now = Date.now();

  const supabaseUrl = options.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  let source: TimeReferenceResult["authoritativeSource"] = "runtime_fallback";

  // Use cached offset if valid and not forcing refresh
  const isCacheValid = cachedOffsetMs !== null && (now - lastOffsetFetchTimeMs) < CACHE_TTL_MS;

  if (!options.forceRefresh && isCacheValid) {
    source = "cached_offset";
  } else if (supabaseUrl) {
    try {
      // Lightweight HEAD/GET request to Supabase to read the authoritative HTTP Date header
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3s timeout

      const res = await fetch(`${supabaseUrl}/rest/v1/`, {
        method: "HEAD",
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "anon",
        },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const serverDateHeader = res.headers.get("date");
      if (serverDateHeader) {
        const serverEpoch = new Date(serverDateHeader).getTime();
        if (!isNaN(serverEpoch)) {
          cachedOffsetMs = serverEpoch - now;
          lastOffsetFetchTimeMs = now;
          source = "database_http";
        }
      }
    } catch {
      // If network call fails, preserve cachedOffsetMs if available
      if (cachedOffsetMs !== null) {
        source = "cached_offset";
      } else {
        source = "runtime_fallback";
      }
    }
  }

  const effectiveOffsetMs = cachedOffsetMs ?? 0;
  const authoritativeEpoch = now + effectiveOffsetMs;
  const authoritativeDate = new Date(authoritativeEpoch);

  const driftMinutes = Math.round(effectiveOffsetMs / (1000 * 60));
  const driftHours = Number((effectiveOffsetMs / (1000 * 3600)).toFixed(2));
  const isDriftExceeded = Math.abs(driftMinutes) > maxDriftMinutes;

  if (isDriftExceeded && source !== "runtime_fallback") {
    console.warn(
      `[SECURITY WARNING] System clock drift detected between runtime (${new Date(now).toISOString()}) and authoritative server (${authoritativeDate.toISOString()}). ` +
      `Drift is ${driftHours} hours. Using authoritative synchronized time.`
    );
  }

  const calendarDate = formatCalendarDate(authoritativeDate, timezone);

  return {
    utcTimestamp: authoritativeDate.toISOString(),
    calendarDate,
    timezone,
    driftMinutes,
    driftHours,
    isDriftExceeded,
    authoritativeSource: source,
    formattedDateTime: authoritativeDate.toLocaleString("vi-VN", { timeZone: timezone }),
  };
}

/**
 * Resets the in-memory cache (primarily for unit testing)
 */
export function _resetTimeCache(): void {
  cachedOffsetMs = null;
  lastOffsetFetchTimeMs = 0;
}
