import { createClient } from "@/utils/supabase/server"
import { PlusCircle, CheckCircle2, XCircle } from "lucide-react"

export default async function AIModelsPage() {
  const supabase = await createClient()

  // Fetch all models joined with their providers
  const { data: models, error } = await supabase
    .from("ai_models")
    .select(`
      id,
      display_name,
      api_slug,
      capability,
      provider_family,
      features,
      is_active,
      providers (
        id,
        provider_name,
        provider_key
      )
    `)
    .order("provider_id")
    .order("display_name")

  if (error) {
    return <div>Error loading models: {error.message}</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Models</h1>
          <p className="text-slate-500 mt-1">Quản lý tập trung các model AI và cờ năng lực (Features) của hệ thống.</p>
        </div>
        <button className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-indigo-600 text-white shadow hover:bg-indigo-700 h-9 px-4 py-2">
          <PlusCircle className="mr-2 h-4 w-4" />
          Thêm Model
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-800 dark:bg-slate-800/50">
              <tr>
                <th className="px-6 py-4 font-medium">Provider</th>
                <th className="px-6 py-4 font-medium">Display Name</th>
                <th className="px-6 py-4 font-medium">API Slug</th>
                <th className="px-6 py-4 font-medium">Capability</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
              {models && models.map((model: any) => (
                <tr key={model.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-white">
                      {Array.isArray(model.providers) ? model.providers[0]?.provider_name : model.providers?.provider_name}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-white">{model.display_name}</div>
                    <div className="text-xs text-slate-500">{model.provider_family}</div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="rounded bg-slate-100 px-2 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {model.api_slug}
                    </code>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                      {model.capability}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {model.is_active ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/50 dark:text-red-300">
                        <XCircle className="mr-1 h-3 w-3" />
                        Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 font-medium">
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              
              {models?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                    Chưa có model nào. Hãy tạo model đầu tiên.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
