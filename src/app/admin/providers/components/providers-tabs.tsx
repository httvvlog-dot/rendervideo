"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ProviderTable } from "./provider-table"

export function ProvidersTabs({ initialData }: { initialData: any[] }) {
  const llmProviders = initialData.filter(p => p.provider_type === "llm")
  const ttsProviders = initialData.filter(p => p.provider_type === "tts")
  const storageProviders = initialData.filter(p => p.provider_type === "storage")
  const subtitleProviders = initialData.filter(p => p.provider_type === "subtitle")

  return (
    <Tabs defaultValue="llm" className="w-full">
      <TabsList className="mb-4">
        <TabsTrigger value="llm">LLM</TabsTrigger>
        <TabsTrigger value="tts">TTS</TabsTrigger>
        <TabsTrigger value="storage">Storage</TabsTrigger>
        <TabsTrigger value="subtitle">Subtitle</TabsTrigger>
      </TabsList>
      
      <TabsContent value="llm">
        <ProviderTable providers={llmProviders} type="llm" />
      </TabsContent>
      
      <TabsContent value="tts">
        <ProviderTable providers={ttsProviders} type="tts" />
      </TabsContent>
      
      <TabsContent value="storage">
        <ProviderTable providers={storageProviders} type="storage" />
      </TabsContent>
      
      <TabsContent value="subtitle">
        <ProviderTable providers={subtitleProviders} type="subtitle" />
      </TabsContent>
    </Tabs>
  )
}
