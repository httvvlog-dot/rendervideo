"use client"

import { useState } from "react"
import { 
  DndContext, 
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { Button } from "@/components/ui/button"
import { Play, Download, Settings, Music, Mic, Type, Image as ImageIcon, CheckCircle2 } from "lucide-react"
import { RenderQueue } from "./render-queue"

interface Scene {
  id: string
  media_id: string
  duration: number
  start_time: number
  sort_order: number
}

// Draggable Scene Item Component
function SortableScene({ scene, index, isSelected, onClick, onResize }: { scene: Scene, index: number, isSelected: boolean, onClick: () => void, onResize: (id: string, newDuration: number) => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: scene.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${scene.duration * 20}px`, // 1s = 20px
  }

  const handlePointerDown = (e: React.PointerEvent, isRight: boolean) => {
    e.stopPropagation()
    const startX = e.clientX
    const startDuration = scene.duration
    
    const onMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - startX
      let newDuration = startDuration + (isRight ? deltaX / 20 : -deltaX / 20)
      if (newDuration < 1) newDuration = 1
      onResize(scene.id, Number(newDuration.toFixed(1)))
    }
    
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onClick}
      className={`relative h-20 bg-indigo-900 rounded-md border-2 shrink-0 cursor-pointer overflow-hidden flex flex-col items-center justify-center text-xs text-white select-none transition-shadow
        ${isSelected ? "border-indigo-400 shadow-[0_0_15px_rgba(99,102,241,0.5)] z-10" : "border-indigo-800 hover:border-indigo-600"}
      `}
    >
      <div className="absolute top-1 left-2 text-[10px] text-indigo-300 font-mono font-bold bg-black/30 px-1 rounded">
        {scene.duration}s
      </div>
      <div className="font-medium mt-2">IMG {index + 1}</div>
      
      {isSelected && (
        <>
          <div onPointerDown={(e) => handlePointerDown(e, false)} className="absolute left-0 top-0 w-3 h-full bg-indigo-400/80 cursor-col-resize hover:bg-white" />
          <div onPointerDown={(e) => handlePointerDown(e, true)} className="absolute right-0 top-0 w-3 h-full bg-indigo-400/80 cursor-col-resize hover:bg-white" />
        </>
      )}
    </div>
  )
}

// Scene Inspector Component
function SceneInspector({ scene, onUpdate }: { scene: Scene | null, onUpdate: (id: string, field: string, value: any) => void }) {
  const [activeTab, setActiveTab] = useState("General")

  if (!scene) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-900/50 border-l border-slate-200 dark:border-slate-800 p-6 flex flex-col items-center justify-center text-muted-foreground">
        <Settings className="w-8 h-8 mb-3 text-slate-300 dark:text-slate-700" />
        <p>Select a scene to edit its properties</p>
      </div>
    )
  }

  const tabs = [
    { name: "General", enabled: true },
    { name: "Animation", enabled: true },
    { name: "Transition", enabled: true },
    { name: "Caption", enabled: false },
    { name: "Crop", enabled: false },
    { name: "Audio", enabled: false },
    { name: "Advanced", enabled: false }
  ]

  return (
    <div className="w-80 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 flex flex-col h-full shrink-0">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
        <h3 className="font-bold text-sm uppercase tracking-wider text-slate-600 dark:text-slate-300">Scene Inspector</h3>
        <p className="text-[10px] text-muted-foreground font-mono mt-1">ID: {scene.id}</p>
      </div>
      
      <div className="flex flex-wrap border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
        {tabs.map(t => (
          <button 
            key={t.name}
            onClick={() => t.enabled && setActiveTab(t.name)}
            disabled={!t.enabled}
            className={`px-3 py-2 text-[11px] font-medium whitespace-nowrap border-b-2
              ${activeTab === t.name 
                ? "text-indigo-600 border-indigo-600 bg-white dark:bg-slate-950" 
                : "text-slate-500 border-transparent hover:text-slate-700 dark:hover:text-slate-300"
              }
              ${!t.enabled && "opacity-40 cursor-not-allowed"}
            `}
          >
            {t.name}
          </button>
        ))}
      </div>

      <div className="p-5 flex-1 overflow-y-auto">
        {activeTab === "General" && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wide">Duration (seconds)</label>
              <input 
                type="number" 
                step="0.1"
                value={scene.duration} 
                onChange={(e) => onUpdate(scene.id, 'duration', Number(e.target.value))}
                className="w-full mt-2 p-2.5 bg-slate-100 dark:bg-slate-900 rounded-md border border-slate-200 dark:border-slate-800 text-sm font-mono focus:ring-2 focus:ring-indigo-500" 
              />
            </div>
            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/30 rounded-lg border border-indigo-100 dark:border-indigo-900/50">
              <p className="text-xs text-indigo-700 dark:text-indigo-400">
                Duration changes automatically push trailing scenes forward. No gaps are created.
              </p>
            </div>
          </div>
        )}
        {activeTab === "Animation" && (
          <div className="space-y-4">
            <p className="text-xs text-muted-foreground">Coordinates</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-medium text-slate-500 uppercase">Start Scale</label>
                <input type="number" step="0.1" defaultValue={1.0} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded border text-sm font-mono" />
              </div>
              <div>
                <label className="text-[10px] font-medium text-slate-500 uppercase">End Scale</label>
                <input type="number" step="0.1" defaultValue={1.1} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded border text-sm font-mono" />
              </div>
            </div>
          </div>
        )}
        {activeTab === "Transition" && (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-medium text-slate-500 uppercase">Transition Type</label>
              <select className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded border text-sm">
                <option>Crossfade</option>
                <option>Dip to Black</option>
                <option>Slide Left</option>
              </select>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export function TimelineEditor({ initialScenes }: { initialScenes: Scene[] }) {
  const [scenes, setScenes] = useState<Scene[]>(initialScenes)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [renderJobId, setRenderJobId] = useState<string | undefined>(undefined)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (over && active.id !== over.id) {
      setScenes((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        return arrayMove(items, oldIndex, newIndex).map((s, idx) => ({ ...s, sort_order: idx }))
      })
    }
  }

  const selectedScene = scenes.find(s => s.id === selectedId) || null

  return (
    <>
    <div className="flex border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden h-[500px] bg-white dark:bg-[#0f111a] shadow-lg mt-6">
      
      {/* Left side: Timeline Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Toolbar */}
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 flex justify-between items-center shrink-0">
          <div className="flex space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIsPreviewing(!isPreviewing)}
              className="bg-white dark:bg-slate-800"
            >
              <Play className="w-4 h-4 mr-2 fill-current" /> HTML5 Preview
            </Button>
          </div>
          <Button 
            size="sm" 
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/20"
            onClick={() => setRenderJobId(Date.now().toString())}
            disabled={!!renderJobId}
          >
            <Download className="w-4 h-4 mr-2" /> Generate Video
          </Button>
        </div>
        
        {/* Canvas Area (Preview) */}
        <div className="h-48 border-b border-slate-200 dark:border-slate-800 bg-black flex flex-col items-center justify-center relative overflow-hidden shrink-0">
          {isPreviewing ? (
            <div className="text-white text-center animate-pulse">
              <Play className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p className="font-mono text-sm">[ HTML5 Canvas Preview Active ]</p>
              <p className="text-xs text-slate-400 mt-1">Reading TimelineJSON at 30fps...</p>
            </div>
          ) : (
            <div className="text-slate-600 font-mono text-xs">Canvas Player Inactive</div>
          )}
        </div>

        {/* Tracks Area */}
        <div className="flex-1 p-4 overflow-auto bg-slate-50 dark:bg-[#0f111a] space-y-4">
          
          {/* VIDEO TRACK (Active) */}
          <div className="flex">
            <div className="w-24 shrink-0 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 px-2 rounded-l-md">
              <ImageIcon className="w-3 h-3 mr-1" /> Video
            </div>
            <div className="flex-1 overflow-x-auto hide-scrollbar bg-slate-200 dark:bg-[#1a1d2d] rounded-r-md border-y border-r border-slate-300 dark:border-slate-800 shadow-inner p-2 relative min-h-[6rem] flex items-center">
              
              <DndContext 
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <div className="flex space-x-0.5 min-w-max">
                  <SortableContext 
                    items={scenes}
                    strategy={horizontalListSortingStrategy}
                  >
                    {scenes.map((scene, index) => (
                      <SortableScene 
                        key={scene.id} 
                        scene={scene} 
                        index={index}
                        isSelected={selectedId === scene.id}
                        onClick={() => setSelectedId(scene.id)}
                        onResize={(id, newDuration) => {
                          setScenes(prev => prev.map(s => s.id === id ? { ...s, duration: newDuration } : s))
                        }}
                      />
                    ))}
                  </SortableContext>
                </div>
              </DndContext>

            </div>
          </div>

          {/* VOICE TRACK (Disabled) */}
          <div className="flex opacity-50 grayscale pointer-events-none">
            <div className="w-24 shrink-0 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 px-2 rounded-l-md">
              <Mic className="w-3 h-3 mr-1" /> Voice
            </div>
            <div className="flex-1 bg-slate-200 dark:bg-[#1a1d2d] rounded-r-md border-y border-r border-slate-300 dark:border-slate-800 p-2 min-h-[4rem] flex items-center justify-center text-xs text-slate-400">
              [ Coming Soon ]
            </div>
          </div>

          {/* MUSIC TRACK (Disabled) */}
          <div className="flex opacity-50 grayscale pointer-events-none">
            <div className="w-24 shrink-0 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 px-2 rounded-l-md">
              <Music className="w-3 h-3 mr-1" /> Music
            </div>
            <div className="flex-1 bg-slate-200 dark:bg-[#1a1d2d] rounded-r-md border-y border-r border-slate-300 dark:border-slate-800 p-2 min-h-[4rem] flex items-center justify-center text-xs text-slate-400">
              [ Coming Soon ]
            </div>
          </div>

          {/* SUBTITLE TRACK (Disabled) */}
          <div className="flex opacity-50 grayscale pointer-events-none">
            <div className="w-24 shrink-0 flex items-center text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-100 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 px-2 rounded-l-md">
              <Type className="w-3 h-3 mr-1" /> Subs
            </div>
            <div className="flex-1 bg-slate-200 dark:bg-[#1a1d2d] rounded-r-md border-y border-r border-slate-300 dark:border-slate-800 p-2 min-h-[3rem] flex items-center justify-center text-xs text-slate-400">
              [ Coming Soon ]
            </div>
          </div>

        </div>
      </div>

      {/* Right side: Inspector */}
      <SceneInspector 
        scene={selectedScene} 
        onUpdate={(id, field, value) => {
          setScenes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
        }}
      />

    </div>
    
    <RenderQueue jobId={renderJobId} onRenderAgain={() => setRenderJobId(Date.now().toString())} />
    
    </>
  )
}
