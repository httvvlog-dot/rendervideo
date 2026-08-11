"use server";

import { createClient } from "@/utils/supabase/server";
import { requireAdmin } from "@/utils/roles";

export async function getAdminAuditLogs(searchParams: {
  q?: string;
  action?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  // BƯỚC 3B.4: Security - Phải có authorization check phù hợp ở Server Action
  await requireAdmin();

  const supabase = await createClient();

  const { q, action, from, to, page = 1, limit = 20 } = searchParams;
  const offset = (page - 1) * limit;

  // KHÔNG DÙNG: .select("*, admin:admin_id(email), target_user:target_user_id(email)")
  // Vì PRE-CHECK xác nhận không có foreign key relationship hợp lệ với auth.users
  let query = supabase
    .from("admin_audit_logs")
    .select("*", { count: "exact" });

  if (q) {
    // Không thể search email, chỉ search reason.
    // Nếu q là UUID hợp lệ, có thể search admin_id hoặc target_user_id.
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(q)) {
      query = query.or(`admin_id.eq.${q},target_user_id.eq.${q}`);
    } else {
      query = query.ilike("reason", `%${q}%`);
    }
  }

  if (action && action !== "ALL") {
    query = query.eq("action", action);
  }

  if (from) {
    query = query.gte("created_at", new Date(from).toISOString());
  }

  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte("created_at", toDate.toISOString());
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching admin audit logs:", error);
    return { data: [], count: 0, error: error.message };
  }

  return { data: data || [], count: count || 0, error: null };
}

export async function getAIUsageLogs(searchParams: {
  q?: string;
  feature?: string;
  provider?: string;
  model?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}) {
  await requireAdmin();
  const supabase = await createClient();

  const { q, feature, provider, model, status, from, to, page = 1, limit = 20 } = searchParams;
  const offset = (page - 1) * limit;

  let query = supabase
    .from("ai_usage_logs")
    .select("*", { count: "exact" });

  if (q) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(q)) {
      query = query.or(`user_id.eq.${q},project_id.eq.${q}`);
    } else {
      query = query.ilike("error_message", `%${q}%`);
    }
  }

  if (feature && feature !== "ALL") query = query.eq("feature", feature);
  if (provider && provider !== "ALL") query = query.eq("provider", provider);
  if (model && model !== "ALL") query = query.eq("model", model);
  if (status && status !== "ALL") query = query.eq("status", status);

  if (from) {
    query = query.gte("created_at", new Date(from).toISOString());
  }
  if (to) {
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);
    query = query.lte("created_at", toDate.toISOString());
  }

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, count, error } = await query;

  if (error) {
    console.error("Error fetching ai usage logs:", error);
    return { data: [], count: 0, error: error.message };
  }

  return { data: data || [], count: count || 0, error: null };
}
