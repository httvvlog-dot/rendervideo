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

interface Scene {
  id: string
  media_id: string
  duration: number
  start_time: number
  sort_order: number
}

// Draggable Scene Item Component
function SortableScene({ scene, isSelected, onClick, onResize }: { scene: Scene, isSelected: boolean, onClick: () => void, onResize: (id: string, newDuration: number) => void }) {
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
      // 1s = 20px
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
      className={`relative h-24 bg-slate-800 rounded-md border-2 shrink-0 cursor-pointer overflow-hidden flex items-center justify-center text-xs text-white select-none
        ${isSelected ? "border-indigo-500 shadow-lg shadow-indigo-500/20 z-10" : "border-slate-700 hover:border-slate-500"}
      `}
    >
      <div className="absolute top-1 left-2 text-[10px] text-slate-400 font-mono">
        {scene.duration}s
      </div>
      <div>Scene {scene.id.slice(0, 4)}</div>
      
      {/* Resize Handle placeholders */}
      {isSelected && (
        <>
          <div onPointerDown={(e) => handlePointerDown(e, false)} className="absolute left-0 top-0 w-2 h-full bg-indigo-500/50 cursor-col-resize hover:bg-indigo-400" />
          <div onPointerDown={(e) => handlePointerDown(e, true)} className="absolute right-0 top-0 w-2 h-full bg-indigo-500/50 cursor-col-resize hover:bg-indigo-400" />
        </>
      )}
    </div>
  )
}

// Scene Inspector Component
function SceneInspector({ scene, onUpdate }: { scene: Scene | null, onUpdate: (id: string, field: string, value: any) => void }) {
  const [activeTab, setActiveTab] = useState("transform")

  if (!scene) {
    return (
      <div className="flex-1 bg-slate-50 dark:bg-slate-900 border-l p-6 flex items-center justify-center text-muted-foreground">
        Select a scene to edit its properties
      </div>
    )
  }

  const tabs = ["Transform", "Animation", "Transition", "Caption", "Audio", "Filter"]

  return (
    <div className="w-80 bg-white dark:bg-slate-950 border-l flex flex-col h-full shrink-0">
      <div className="p-4 border-b">
        <h3 className="font-semibold">Scene Inspector</h3>
        <p className="text-xs text-muted-foreground">ID: {scene.id}</p>
      </div>
      
      <div className="flex overflow-x-auto border-b hide-scrollbar">
        {tabs.map(t => (
          <button 
            key={t}
            onClick={() => setActiveTab(t.toLowerCase())}
            className={`px-3 py-2 text-xs font-medium whitespace-nowrap ${
              activeTab === t.toLowerCase() 
                ? "text-indigo-600 border-b-2 border-indigo-600" 
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        {activeTab === "transform" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium">Duration (s)</label>
              <input 
                type="number" 
                value={scene.duration} 
                onChange={(e) => onUpdate(scene.id, 'duration', Number(e.target.value))}
                className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded border text-sm" 
              />
            </div>
            {/* Add more inputs here */}
          </div>
        )}
        {activeTab === "animation" && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium">Start Scale</label>
              <input type="number" step="0.1" defaultValue={1.0} className="w-full mt-1 p-2 bg-slate-100 dark:bg-slate-900 rounded border text-sm" />
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
    <div className="flex border rounded-xl overflow-hidden h-[400px] bg-white dark:bg-slate-900 shadow-sm mt-6">
      
      {/* Left side: Timeline Canvas */}
      <div className="flex-1 flex flex-col min-w-0">
        <div className="p-4 border-b flex justify-between items-center shrink-0">
          <h2 className="font-semibold">Timeline</h2>
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">Generate MP4</Button>
        </div>
        
        <div className="flex-1 p-6 overflow-auto bg-slate-50 dark:bg-slate-900/50">
          
          <DndContext 
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <div className="mb-2 text-xs font-medium text-slate-500 uppercase tracking-widest">Video Track</div>
            <div className="flex space-x-1 p-4 bg-slate-200 dark:bg-slate-800/50 rounded-lg min-w-max border border-slate-300 dark:border-slate-700 shadow-inner">
              <SortableContext 
                items={scenes}
                strategy={horizontalListSortingStrategy}
              >
                {scenes.map(scene => (
                  <SortableScene 
                    key={scene.id} 
                    scene={scene} 
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

      {/* Right side: Inspector */}
      <SceneInspector 
        scene={selectedScene} 
        onUpdate={(id, field, value) => {
          setScenes(prev => prev.map(s => s.id === id ? { ...s, [field]: value } : s))
        }}
      />

    </div>
  )
}
