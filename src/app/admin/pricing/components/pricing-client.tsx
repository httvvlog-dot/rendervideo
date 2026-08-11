"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateServicePricing } from "../actions"
import { toast } from "sonner"
import { Edit2, Save, X, CheckCircle2 } from "lucide-react"

export function PricingClient({ initialData }: { initialData: any[] }) {
  const [data, setData] = useState(initialData)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ costVnd: 0, profitPercent: 0 })
  const [isSaving, setIsSaving] = useState(false)

  const handleEditClick = (row: any) => {
    setEditingKey(row.service_key)
    setEditForm({ costVnd: row.cost_vnd, profitPercent: row.profit_percent })
  }

  const handleCancel = () => {
    setEditingKey(null)
  }

  const handleSave = async (serviceKey: string) => {
    setIsSaving(true)
    const toastId = toast.loading("Saving pricing...")
    try {
      const res = await updateServicePricing(serviceKey, editForm.costVnd, editForm.profitPercent)
      if (res.success) {
        toast.success("Pricing updated successfully", { id: toastId })
        const computedSelling = Math.round(editForm.costVnd * (1 + editForm.profitPercent / 100))
        setData(data.map(d => 
          d.service_key === serviceKey 
          ? { ...d, cost_vnd: editForm.costVnd, profit_percent: editForm.profitPercent, selling_price_vnd: computedSelling } 
          : d
        ))
        setEditingKey(null)
      } else {
        toast.error(res.error || "Failed to save", { id: toastId })
      }
    } catch (e: any) {
      toast.error(e.message, { id: toastId })
    } finally {
      setIsSaving(false)
    }
  }

  const getServiceName = (key: string) => {
    switch(key) {
      case 'SCRIPT': return 'Tạo Script'
      case 'IMAGE': return 'Tạo ảnh AI'
      case 'VOICE': return 'Tạo Voice'
      case 'VIDEO': return 'Render MP4'
      default: return key
    }
  }

  const formatVnd = (val: number) => {
    return val.toLocaleString('vi-VN') + 'đ'
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400">
            <tr>
              <th className="px-6 py-4 font-medium">Service</th>
              <th className="px-6 py-4 font-medium text-right">Cost (VND)</th>
              <th className="px-6 py-4 font-medium text-right">Profit (%)</th>
              <th className="px-6 py-4 font-medium text-right">Selling Price (VND)</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {data.map((row) => {
              const isEditing = editingKey === row.service_key
              
              let displaySelling = row.selling_price_vnd
              if (isEditing) {
                displaySelling = Math.round(editForm.costVnd * (1 + editForm.profitPercent / 100))
              }

              return (
                <tr key={row.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">
                    {getServiceName(row.service_key)}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">
                    {isEditing ? (
                      <Input 
                        type="number" 
                        min="0"
                        className="w-32 text-right ml-auto h-8"
                        value={editForm.costVnd} 
                        onChange={e => setEditForm({...editForm, costVnd: parseFloat(e.target.value) || 0})}
                      />
                    ) : (
                      formatVnd(row.cost_vnd)
                    )}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-600 dark:text-slate-300">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <Input 
                          type="number" 
                          min="0"
                          className="w-20 text-right h-8"
                          value={editForm.profitPercent} 
                          onChange={e => setEditForm({...editForm, profitPercent: parseFloat(e.target.value) || 0})}
                        />
                        <span className="text-slate-400">%</span>
                      </div>
                    ) : (
                      `${row.profit_percent}%`
                    )}
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-indigo-600 dark:text-indigo-400">
                    {formatVnd(displaySelling)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Active
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving}>
                          <X className="h-4 w-4" />
                        </Button>
                        <Button size="sm" onClick={() => handleSave(row.service_key)} disabled={isSaving}>
                          <Save className="h-4 w-4 mr-1.5" />
                          Save
                        </Button>
                      </div>
                    ) : (
                      <Button size="sm" variant="ghost" onClick={() => handleEditClick(row)}>
                        <Edit2 className="h-4 w-4 mr-1.5" />
                        Edit
                      </Button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
