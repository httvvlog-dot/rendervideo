'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { changeUserPlanAction } from './subscription-actions'
import { Activity, ShieldCheck, History, CalendarDays } from 'lucide-react'

export function SubscriptionTab({ 
  userId, 
  activeSub, 
  subHistory, 
  availablePlans 
}: { 
  userId: string, 
  activeSub: any, 
  subHistory: any[], 
  availablePlans: any[] 
}) {
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(formData: FormData) {
    setIsSubmitting(true)
    const res = await changeUserPlanAction(formData)
    setIsSubmitting(false)
    if (res.success) {
      toast({ title: "Plan updated successfully", variant: "default" })
    } else {
      toast({ title: "Failed to update plan", description: res.error, variant: "destructive" })
    }
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="w-5 h-5"/> Current Subscription</CardTitle>
            <CardDescription>Manage the user's active billing plan</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Plan Code</p>
                <p className="font-semibold text-lg">{activeSub?.plans?.code || 'NONE'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Status</p>
                <p className="font-semibold">{activeSub?.status || 'No Active Plan'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Started At</p>
                <p className="font-medium">{activeSub?.starts_at ? new Date(activeSub.starts_at).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Monthly AI Credits</p>
                <p className="font-medium">{activeSub?.monthly_credit || 0}</p>
              </div>
            </div>
            
            <div className="pt-4 border-t">
              <h4 className="text-sm font-semibold mb-3">Change Plan</h4>
              <form action={onSubmit} className="space-y-3">
                <input type="hidden" name="userId" value={userId} />
                <div className="space-y-1">
                  <Label>Select New Plan</Label>
                  <Select name="planId" defaultValue={activeSub?.plan_id || ""}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a plan..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePlans.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} ({p.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Reason for Change</Label>
                  <Input name="reason" placeholder="e.g., Requested by user, promotion..." required />
                </div>
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? 'Applying Change...' : 'Update Plan'}
                </Button>
              </form>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><History className="w-5 h-5"/> Plan History</CardTitle>
            <CardDescription>Recent subscription changes</CardDescription>
          </CardHeader>
          <CardContent>
            {subHistory && subHistory.length > 0 ? (
              <div className="space-y-4">
                {subHistory.map((sh) => (
                  <div key={sh.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{sh.plans?.name || 'Unknown'}</p>
                      <p className="text-xs text-muted-foreground">{new Date(sh.created_at).toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        sh.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' :
                        sh.status === 'EXPIRED' ? 'bg-slate-100 text-slate-800' :
                        'bg-amber-100 text-amber-800'
                      }`}>
                        {sh.status}
                      </span>
                      <p className="text-xs text-muted-foreground mt-1">Src: {sh.source || 'MANUAL'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No subscription history found.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
