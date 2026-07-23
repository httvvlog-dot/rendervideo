"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { grantUserCreditsAction, adjustUserCreditsAction } from "./actions"
import { Loader2 } from "lucide-react"
import { InfoPopover } from "@/components/ui/info-popover"

export function GrantCreditsModal({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState(0)
  const [type, setType] = useState<'PURCHASED' | 'WELCOME_BONUS'>('WELCOME_BONUS')
  const [desc, setDesc] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (amount <= 0) return
    setLoading(true)
    try {
      const expireDays = type === 'WELCOME_BONUS' ? 30 : null
      await grantUserCreditsAction(userId, amount, type, expireDays, desc || `Granted ${type}`)
      setOpen(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center">
        <Button variant="default" onClick={() => setOpen(true)}>Grant Credits</Button>
        <InfoPopover 
          title="Grant Credits" 
          description="Cấp phát Credit cho người dùng. Dùng khi khách nạp tiền mua gói mới hoặc bạn muốn tặng khuyến mãi. Purchased Credit sẽ tồn tại vĩnh viễn, còn Bonus Credit sẽ tự động hết hạn sau 30 ngày." 
        />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>Grant Credits</DialogTitle>
          <DialogDescription>Add credits to this user's wallet. Bonus credits expire in 30 days.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-2">
             <Button type="button" variant={type === 'WELCOME_BONUS' ? 'default' : 'outline'} onClick={() => setType('WELCOME_BONUS')}>
               Bonus (Expires)
             </Button>
             <Button type="button" variant={type === 'PURCHASED' ? 'default' : 'outline'} onClick={() => setType('PURCHASED')}>
               Purchased (Lifetime)
             </Button>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Amount</label>
            <Input type="number" min="1" value={amount} onChange={e => setAmount(Number(e.target.value))} required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Reason / Description</label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Compensation for error" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading || amount <= 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Confirm Grant
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}

export function AdjustCreditsModal({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [amount, setAmount] = useState(0)
  const [desc, setDesc] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await adjustUserCreditsAction(userId, amount, desc || "Manual adjustment")
      setOpen(false)
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="flex items-center">
        <Button variant="outline" onClick={() => setOpen(true)}>Manual Adjust</Button>
        <InfoPopover 
          title="Manual Adjust" 
          description="Điều chỉnh linh hoạt số dư trong ví. Khác với Grant (chỉ được cộng), Adjust cho phép bạn nhập số âm để trừ trực tiếp tiền (ví dụ: phát hiện gian lận) hoặc nhập số dương để bù tiền cho khách." 
        />
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
        <DialogHeader>
          <DialogTitle>Manual Credit Adjustment</DialogTitle>
          <DialogDescription>Use this to deduct credits or compensate. Can be positive or negative.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div>
            <label className="text-sm font-medium mb-1 block">Amount (+ or -)</label>
            <Input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} required />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Reason</label>
            <Input value={desc} onChange={e => setDesc(e.target.value)} placeholder="e.g. Deduct for manual render" required />
          </div>
          <Button type="submit" className="w-full" disabled={loading || amount === 0}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Apply Adjustment
          </Button>
        </form>
      </DialogContent>
    </Dialog>
    </>
  )
}
