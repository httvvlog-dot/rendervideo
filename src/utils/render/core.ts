export const RENDER_JOB_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  PREPARING: 'preparing',
  DOWNLOADING: 'downloading',
  RENDERING: 'rendering',
  ENCODING: 'encoding',
  UPLOADING: 'uploading',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;

export type RenderJobStatus = typeof RENDER_JOB_STATUS[keyof typeof RENDER_JOB_STATUS];

export type TimelineJSON = {
  version: 1;
  projectId: string;
  timelineVersion: number;
  totalDurationMs: number;
  preset: {
    aspectRatio: "9:16" | "16:9" | "1:1";
    width: number;
    height: number;
    fps: number;
    codec: string;
  };
  scenes: RenderScene[];
  audioTracks?: RenderAudioTrack[];
};

export type RenderAudioTrack = {
  id: string;
  type: "voice";
  sectionId: string;
  mediaId: string;
  sourceUrl: string;
  startTimeMs: number;
  durationMs: number;
};

export type RenderScene = {
  id: string;
  sectionId: string | null;
  mediaId: string;
  sourceUrl: string;

  startTimeMs: number;
  endTimeMs: number;
  durationMs: number;

  transition: {
    type: "none" | "fade" | "crossfade" | string;
    durationMs: number;
  };

  transform: {
    startScale: number;
    endScale: number;
    startX: number;
    endX: number;
    startY: number;
    endY: number;
    opacity: number;
  };
};
