export type RenderPreset = {
  id: string;
  name: string;
  width: number;
  height: number;
  fps: number;
};

export type AssetJSON = {
  id: string;
  type: "image" | "video" | "audio" | "sticker" | "logo";
  url: string;
};

export type TransitionJSON = {
  type: string; // e.g. "fade", "crossfade", "slide"
  parameters: Record<string, any>; // e.g. { direction: "left", blur: 10 }
};

export type AnimationJSON = {
  type: string; // e.g. "custom", "ken_burns"
  start_scale: number;
  end_scale: number;
  start_x: number;
  end_x: number;
  start_y: number;
  end_y: number;
  anchor: "Center" | "Top" | "Bottom" | "Left" | "Right" | string;
  easing: string; // e.g. "linear", "ease-in-out"
  curve: string;
};

export type SceneJSON = {
  id: string;
  duration: number; // in seconds
  media_id: string; // references an asset in the assets array
  transition?: TransitionJSON;
  animation?: AnimationJSON;
  caption?: {
    text: string;
    font: string;
    size: number;
    color: string;
    style: string;
  };
  audio?: {
    voice_asset_id?: string;
    music_asset_id?: string;
  };
  filter?: {
    blur: number;
    opacity: number;
    brightness: number;
    contrast: number;
    saturation: number;
  };
};

export interface TimelineJSON {
  version: number; // Default 1
  project: {
    id: string;
    timeline_hash: string;
  };
  video: {
    fps: number;
    width: number;
    height: number;
  };
  assets: AssetJSON[];
  tracks: string[]; // e.g. ["video", "caption", "voice", "music"]
  scenes: SceneJSON[];
  metadata: Record<string, any>;
}

export interface RenderAdapter {
  /**
   * Called to download, cache, and validate all assets in the TimelineJSON.
   */
  downloadAssets(timeline: TimelineJSON): Promise<void>;
  
  /**
   * Validate that all downloaded assets meet minimum requirements (e.g. not corrupt).
   */
  validateAssets(): Promise<void>;

  /**
   * Prepares the render engine (e.g. building the FFmpeg filter complex string).
   */
  prepare(timeline: TimelineJSON): Promise<void>;
  
  /**
   * Executes the render process. Emits progress events.
   * Returns the local path to the rendered video file.
   */
  render(onProgress: (status: string, progress: number, details?: any) => void): Promise<string>;
  
  /**
   * Verifies the generated video file (e.g. non-zero bytes, readable headers).
   */
  verify(localPath: string): Promise<boolean>;

  /**
   * Uploads the final video to cloud storage (e.g. Cloudflare R2).
   * Returns the public URL of the uploaded video.
   */
  upload(localPath: string): Promise<string>;
  
  /**
   * Cleans up temporary intermediate files (but keeps cached assets).
   */
  cleanup(): Promise<void>;
}
