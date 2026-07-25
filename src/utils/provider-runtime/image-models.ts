/**
 * TODO (Provider Runtime v2)
 *
 * Replace static IMAGE_MODELS
 * with provider_models table.
 *
 * UI should not change.
 */

export interface ImageModelDefinition {
  id: string;
  name: string;
  badge?: string;
  description?: string;
  recommended?: boolean;
}

export const IMAGE_MODELS: Record<string, ImageModelDefinition[]> = {
  falai: [
    {
      id: "fal-ai/flux-pro/v1",
      name: "FLUX Pro",
      badge: "⭐ Recommended",
      description: "Best quality for Storytelling, Marketing, Products",
      recommended: true
    },
    {
      id: "fal-ai/flux/schnell",
      name: "FLUX Schnell",
      badge: "⚡ Fast",
      description: "Quick generation with great quality"
    },
    {
      id: "fal-ai/flux-klein-9b",
      name: "FLUX Klein 9B",
      badge: "💰 Cost Saving",
      description: "Balanced quality and cost"
    },
    {
      id: "fal-ai/flux-klein-4b",
      name: "FLUX Klein 4B",
      badge: "🆓 Free Tier",
      description: "Lowest cost, fastest speed"
    },
    {
      id: "fal-ai/flux-kontext/max",
      name: "FLUX Kontext Max",
      badge: "🎨 Image Editing",
      description: "Keep Character, Background Replace"
    }
  ],
  openai: [
    {
      id: "dall-e-3",
      name: "DALL-E 3",
      badge: "⭐ Recommended",
      description: "High accuracy and instruction following",
      recommended: true
    },
    {
      id: "dall-e-2",
      name: "DALL-E 2",
      badge: "⚡ Fast",
      description: "Legacy faster model"
    }
  ],
  ideogram: [
    {
      id: "ideogram-v3",
      name: "Ideogram v3",
      badge: "⭐ Recommended",
      description: "Best typography and text rendering",
      recommended: true
    }
  ],
  replicate: [
    {
      id: "black-forest-labs/flux-pro",
      name: "FLUX Pro",
      description: "BFL API hosted on Replicate"
    }
  ]
};
