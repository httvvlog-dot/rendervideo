"use client"

import { ScriptOverview } from "./script-overview"
import { ScriptSectionCard } from "./script-section-card"

export function ScriptSectionList({ project, sections }: { project: any, sections: any[] }) {
  if (!sections || sections.length === 0) return null

  const wordCount = sections.reduce((acc, s) => acc + s.narration.trim().split(/\s+/).filter((w: string) => w.length > 0).length, 0)
  
  let runningTime = 0;

  return (
    <div className="space-y-4">
      <ScriptOverview 
        title={project.title} 
        targetDuration={project.target_duration || (project.video_length * 60) || 60} 
        sectionCount={sections.length} 
        wordCount={wordCount} 
      />

      <div className="space-y-2">
        {sections.sort((a, b) => a.section_index - b.section_index).map(section => {
          const startTime = runningTime;
          runningTime += section.duration_seconds;
          return (
            <ScriptSectionCard 
              key={section.id} 
              section={section} 
              projectId={project.id} 
              startTime={startTime} 
            />
          )
        })}
      </div>
    </div>
  )
}
