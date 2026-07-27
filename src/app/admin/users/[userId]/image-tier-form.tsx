'use client'

import { useState } from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { updateUserImageTier } from './image-tier-actions'

export function ImageTierForm({ 
  userId, 
  currentTier, 
  availableTiers 
}: { 
  userId: string, 
  currentTier: string, 
  availableTiers: string[] 
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(formData: FormData) {
    setIsSubmitting(true)
    const res = await updateUserImageTier(formData)
    setIsSubmitting(false)
    if (res.success) {
      toast.success(`Image Tier successfully updated to ${res.imageTier}`)
    } else {
      toast.error(res.error || "Failed to update Image Tier")
    }
  }

  // Ensure 'FREE' is always an option even if not returned dynamically
  const options = Array.from(new Set(['FREE', ...availableTiers]))

  return (
    <form action={onSubmit} className="space-y-4 max-w-sm">
      <input type="hidden" name="userId" value={userId} />
      <div className="space-y-2">
        <Select name="tier" defaultValue={currentTier}>
          <SelectTrigger>
            <SelectValue placeholder="Select an Image Tier" />
          </SelectTrigger>
          <SelectContent>
            {options.map((tier) => (
              <SelectItem key={tier} value={tier}>
                {tier}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : "Save"}
      </Button>
    </form>
  )
}
