export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  LOGOUT: "/api/logout",
  ADMIN_DASHBOARD: "/admin/providers", // Using providers as default admin dashboard for now as per Sprint 2B
  USER_DASHBOARD: "/dashboard",
  ADMIN_PROVIDERS: "/admin/providers",
  ADMIN_TEMPLATES: "/admin/templates",
  ADMIN_SETTINGS: "/admin/settings",
  ADMIN_USERS: "/admin/users",
} as const;
