"use client"

import { useState, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, Loader2, Image as ImageIcon, Download, User, Shirt, ImagePlus } from "lucide-react"
import { uploadReferenceImage, getImagePricing } from "./actions"
import { toast } from "sonner"
import NextLink from "next/link"
import { ImageUploadCard } from "./image-upload-card"

const OUTFIT_PRESETS = ["Cổ trang", "Vest", "Váy", "Sơ mi", "Áo dài", "Casual"]
const BG_PRESETS = ["Công viên", "Văn phòng", "Tòa nhà", "Khu du lịch", "Studio", "Bãi biển"]
const STYLE_PRESETS = ["Natural", "Fashion", "Cinematic", "Luxury"]
const NUM_PRESETS = [1, 2, 4]

export function AIImageClient({ userId }: { userId: string }) {
  const [personFile, setPersonFile] = useState<File | null>(null)
  const [outfitFile, setOutfitFile] = useState<File | null>(null)
  const [bgFile, setBgFile] = useState<File | null>(null)
  
  const [outfitPreset, setOutfitPreset] = useState("Vest")
  const [bgPreset, setBgPreset] = useState("Studio")
  const [stylePreset, setStylePreset] = useState("Natural")
  const [numImages, setNumImages] = useState(1)
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [progressState, setProgressState] = useState("")
  const [creditCost, setCreditCost] = useState<number | null>(null)
  const [gallery, setGallery] = useState<any[]>([])
  const [activeJobId, setActiveJobId] = useState<string | null>(null)

  useEffect(() => {
    getImagePricing(numImages).then(res => setCreditCost(res.credits))
  }, [numImages])

  // Session Recovery
  useEffect(() => {
    const savedJobId = sessionStorage.getItem('ai_image_active_job')
    if (savedJobId) {
      setActiveJobId(savedJobId)
      setIsGenerating(true)
      setProgressState("Đang khôi phục trạng thái...")
    }
  }, [])

  // Safe Polling
  useEffect(() => {
    if (!activeJobId) return

    const pollInterval = setInterval(async () => {
      try {
        const checkRes = await fetch(`/api/images/${activeJobId}`)
        if (!checkRes.ok) {
          // If 404 or something, we stop polling
          if (checkRes.status === 404) {
            clearInterval(pollInterval)
            setIsGenerating(false)
            setProgressState("")
            sessionStorage.removeItem('ai_image_active_job')
            setActiveJobId(null)
          }
          return
        }
        
        const checkData = await checkRes.json()
        
        if (checkData.job.status === 'COMPLETED') {
          clearInterval(pollInterval)
          setGallery(checkData.job.output_images || [])
          setIsGenerating(false)
          setProgressState("")
          sessionStorage.removeItem('ai_image_active_job')
          setActiveJobId(null)
          toast.success("Tạo ảnh thành công!")
        } else if (checkData.job.status === 'FAILED') {
          clearInterval(pollInterval)
          setIsGenerating(false)
          setProgressState("")
          sessionStorage.removeItem('ai_image_active_job')
          setActiveJobId(null)
          toast.error(checkData.job.last_error || "Tạo ảnh thất bại. Credit đã được hoàn lại.")
        }
      } catch (err) {
        // Ignore network errors during polling
      }
    }, 5000)

    return () => clearInterval(pollInterval)
  }, [activeJobId])

  const uploadFile = async (file: File) => {
    const formData = new FormData()
    formData.append("file", file)
    const res = await uploadReferenceImage(formData)
    if (res.error) throw new Error(res.error)
    return res.url
  }

  const handleGenerate = async () => {
    setIsGenerating(true)
    setProgressState("Preparing references...")
    setGallery([])

    try {
      let charRef: string | undefined = undefined
      let garmentRef: string | undefined = undefined
      let bgRef: string | undefined = undefined

      if (personFile) charRef = await uploadFile(personFile)
      if (outfitFile) garmentRef = await uploadFile(outfitFile)
      if (bgFile) bgRef = await uploadFile(bgFile)

      setProgressState("Initializing generation...")

      const payload = {
        prompt: `A beautiful portrait of a person. Style: ${stylePreset}. Outfit: ${outfitFile ? 'Custom outfit' : outfitPreset}. Background: ${bgFile ? 'Custom background' : bgPreset}.`,
        numImages,
        character_reference: charRef,
        garment_reference: garmentRef,
        background_reference: bgRef,
        idempotency_key: crypto.randomUUID()
      }

      const res = await fetch("/api/images", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })

      const data = await res.json()
      if (!res.ok) {
        if (data.error?.includes("Insufficient")) {
           throw new Error("INSUFFICIENT_CREDITS")
        }
        throw new Error(data.error || "Failed to start generation")
      }

      const jobId = data.job_id
      setProgressState("Generating images...")
      
      // Save for recovery
      sessionStorage.setItem('ai_image_active_job', jobId)
      setActiveJobId(jobId)

    } catch (err: any) {
      setIsGenerating(false)
      setProgressState("")
      if (err.message === "INSUFFICIENT_CREDITS") {
        toast.error("Không đủ Credit. Vui lòng nạp thêm.")
      } else {
        toast.error(err.message || "Đã có lỗi xảy ra.")
      }
    }
  }

  const gridClass = gallery.length === 1 ? 'grid-cols-1' : gallery.length === 2 ? 'grid-cols-2' : 'grid-cols-2'

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-6">
        {/* Step 1 */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label className="text-base font-semibold">1. Ảnh Nhân Vật</Label>
            <ImageUploadCard
              id="upload-character"
              title="Tải ảnh nhân vật"
              subtitle="Ảnh rõ mặt • JPG, PNG, WEBP"
              icon={<User className="w-8 h-8" />}
              file={personFile}
              onFileChange={setPersonFile}
            />
          </CardContent>
        </Card>

        {/* Step 2 */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label className="text-base font-semibold">2. Trang Phục</Label>
            <div className="flex flex-wrap gap-2">
              {OUTFIT_PRESETS.map(p => (
                <Button key={p} variant={outfitPreset === p && !outfitFile ? "default" : "outline"} size="sm" onClick={() => { setOutfitPreset(p); setOutfitFile(null); }}>
                  {p}
                </Button>
              ))}
            </div>
            <div className="text-sm font-medium mt-4">Hoặc tải trang phục lên:</div>
            <ImageUploadCard
              id="upload-garment"
              title="Tải trang phục"
              subtitle="Tải ảnh quần áo riêng nếu muốn"
              icon={<Shirt className="w-8 h-8" />}
              file={outfitFile}
              onFileChange={(f) => { setOutfitFile(f); if (f) setOutfitPreset(""); }}
            />
          </CardContent>
        </Card>

        {/* Step 3 */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label className="text-base font-semibold">3. Bối Cảnh</Label>
            <div className="flex flex-wrap gap-2">
              {BG_PRESETS.map(p => (
                <Button key={p} variant={bgPreset === p && !bgFile ? "default" : "outline"} size="sm" onClick={() => { setBgPreset(p); setBgFile(null); }}>
                  {p}
                </Button>
              ))}
            </div>
            <div className="text-sm font-medium mt-4">Hoặc tải bối cảnh lên:</div>
            <ImageUploadCard
              id="upload-background"
              title="Tải bối cảnh"
              subtitle="Tải ảnh bối cảnh riêng nếu muốn"
              icon={<ImagePlus className="w-8 h-8" />}
              file={bgFile}
              onFileChange={(f) => { setBgFile(f); if (f) setBgPreset(""); }}
            />
          </CardContent>
        </Card>

        {/* Step 4 & 5 */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <Label className="text-base font-semibold">4. Style & Số Lượng</Label>
            <div className="flex flex-wrap gap-2">
              {STYLE_PRESETS.map(p => (
                <Button key={p} variant={stylePreset === p ? "default" : "outline"} size="sm" onClick={() => setStylePreset(p)}>
                  {p}
                </Button>
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              {NUM_PRESETS.map(p => (
                <Button key={p} variant={numImages === p ? "default" : "outline"} size="sm" onClick={() => setNumImages(p)}>
                  {p} Ảnh
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="bg-muted p-4 rounded-lg flex justify-between items-center">
          <span className="font-medium text-sm">Chi phí dự kiến:</span>
          <span className="font-bold text-primary">{creditCost !== null ? creditCost : '-'} Credits</span>
        </div>

        <Button className="w-full h-12 text-md font-semibold" size="lg" disabled={isGenerating || creditCost === null} onClick={handleGenerate}>
          {isGenerating ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
          {isGenerating ? progressState : `✨ Tạo Ảnh`}
        </Button>
      </div>

      <div className="lg:col-span-2">
        <Card className="h-full min-h-[600px]">
          <CardContent className="p-6 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4 flex items-center"><ImageIcon className="mr-2" /> Kết Quả</h2>
            {gallery.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">
                <ImageIcon className="w-16 h-16 mb-4 opacity-20" />
                <p>Chưa có ảnh nào được tạo.</p>
              </div>
            ) : (
              <div className={`grid gap-4 flex-1 ${gridClass}`}>
                {gallery.map((img, i) => (
                  <div key={i} className="relative group overflow-hidden rounded-lg border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={img.url} alt="Result" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-4">
                      <Button variant="secondary" size="sm" onClick={() => window.open(img.url, '_blank')}>
                        <Download className="w-4 h-4 mr-2" />
                        Tải Xuống
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
