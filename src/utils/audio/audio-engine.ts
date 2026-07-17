import { globalAudioCache, AudioLoadResult } from './audio-cache';

export interface AudioTrackInput {
  id: string;
  sourceUrl: string;
  startMs: number;
  durationMs: number;
  type?: 'master' | 'narration' | 'music' | 'sfx' | 'voice';
}

const AUDIO_DRIFT_THRESHOLD = 80; // ms

interface TrackNode {
  source: AudioBufferSourceNode;
  gain: GainNode;
  trackId: string;
}

export class AudioEngine {
  private ctx: AudioContext;
  private masterGain: GainNode;
  
  // Track-specific gains
  private trackGains: Map<string, GainNode> = new Map();
  
  // Active playing nodes
  private activeNodes: Map<string, TrackNode> = new Map();

  // State
  private isPlaying: boolean = false;
  private lastEngineStartTime: number = 0; // AudioContext time when play started
  private lastTimelineStartMs: number = 0; // Timeline ms when play started
  
  // Lifecycle Management
  private currentGeneration: number = 0;
  
  // Current tracks given by React
  private tracks: AudioTrackInput[] = [];

  constructor() {
    this.ctx = globalAudioCache.getContext();
    this.masterGain = this.ctx.createGain();
    this.masterGain.connect(this.ctx.destination);
    
    // Initialize default track gains
    ['master', 'narration', 'music', 'sfx', 'voice'].forEach(type => {
      const gain = this.ctx.createGain();
      gain.connect(this.masterGain);
      this.trackGains.set(type, gain);
    });
  }

  public getContext() {
    return this.ctx;
  }

  public syncTracks(newTracks: AudioTrackInput[]) {
    this.currentGeneration++;
    const generation = this.currentGeneration;
    
    this.tracks = newTracks;
    
    // Force a clean slate if we are actively playing and tracks suddenly swap out
    if (this.isPlaying) {
      this.stopAllNodes();
    }
    
    // Trigger progressive loading
    newTracks.forEach(t => {
      const stateBefore = globalAudioCache.getState(t.sourceUrl);
      globalAudioCache.load(t.sourceUrl).then(() => {
        // Abandon callback if a newer generation has started
        if (generation !== this.currentGeneration) return;
        
        // If it just finished loading (wasn't ready before) and we are currently playing, we need to schedule it!
        if (stateBefore !== 'Ready' && this.isPlaying) {
          const currentTimelineMs = this.lastTimelineStartMs + ((this.ctx.currentTime - this.lastEngineStartTime) * 1000);
          this.stopAllNodes();
          this.lastEngineStartTime = this.ctx.currentTime;
          this.lastTimelineStartMs = currentTimelineMs;
          this.scheduleNodes(currentTimelineMs);
        }
      });
    });
    
    // Re-schedule immediately for tracks that are already cached and ready
    if (this.isPlaying) {
      const currentTimelineMs = this.lastTimelineStartMs + ((this.ctx.currentTime - this.lastEngineStartTime) * 1000);
      this.lastEngineStartTime = this.ctx.currentTime;
      this.lastTimelineStartMs = currentTimelineMs;
      this.scheduleNodes(currentTimelineMs);
    }
  }

  public async play(timelineMs: number) {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }
    
    this.stopAllNodes();
    
    this.isPlaying = true;
    this.lastEngineStartTime = this.ctx.currentTime;
    this.lastTimelineStartMs = timelineMs;
    
    this.scheduleNodes(timelineMs);
  }

  public pause() {
    this.isPlaying = false;
    this.stopAllNodes();
  }

  public seek(timelineMs: number) {
    if (!this.isPlaying) return;
    
    // Check drift
    const expectedTimelineMs = this.lastTimelineStartMs + ((this.ctx.currentTime - this.lastEngineStartTime) * 1000);
    const drift = Math.abs(timelineMs - expectedTimelineMs);
    
    if (drift > AUDIO_DRIFT_THRESHOLD) {
      console.log(`[AudioEngine] Seek triggered. Drift: ${drift.toFixed(2)}ms`);
      // Re-schedule everything from the new time
      this.stopAllNodes();
      this.lastEngineStartTime = this.ctx.currentTime;
      this.lastTimelineStartMs = timelineMs;
      this.scheduleNodes(timelineMs);
    }
  }

  public getPlaybackTime(): number | null {
    if (!this.isPlaying) return null;
    return this.lastTimelineStartMs + ((this.ctx.currentTime - this.lastEngineStartTime) * 1000);
  }

  public getMetrics() {
    return {
      state: this.ctx.state,
      activeNodes: this.activeNodes.size,
      currentTime: this.ctx.currentTime,
      sampleRate: this.ctx.sampleRate,
    };
  }

  public cleanup() {
    this.pause();
    this.tracks = [];
    globalAudioCache.clearMemory();
  }

  private stopAllNodes() {
    this.currentGeneration++; // Invalidate any pending async setups for this node batch
    
    this.activeNodes.forEach(node => {
      try {
        node.source.onended = null; // Decouple event listener to prevent race conditions completely
        node.source.stop();
        node.source.disconnect();
        node.gain.disconnect(); // Fully dispose of graph endpoints
      } catch (e) {
        // Ignore if already stopped
      }
    });
    this.activeNodes.clear();
  }

  private scheduleNodes(timelineMs: number) {
    if (!this.isPlaying) return;
    const generation = this.currentGeneration;

    this.tracks.forEach(track => {
      const trackEndMs = track.startMs + track.durationMs;
      
      // If clip is already past, skip
      if (timelineMs >= trackEndMs) return;

      const cached = globalAudioCache.get(track.sourceUrl);
      if (!cached) {
        // Progressive loading: if not ready, we skip scheduling for now.
        return;
      }

      // Calculate exact offset and schedule time
      let offsetSeconds = 0;
      let startDelaySeconds = 0;

      if (timelineMs >= track.startMs) {
        // We are inside the clip, start immediately with offset
        offsetSeconds = (timelineMs - track.startMs) / 1000;
        startDelaySeconds = 0;
      } else {
        // Clip is in the future
        offsetSeconds = 0;
        startDelaySeconds = (track.startMs - timelineMs) / 1000;
      }

      const source = this.ctx.createBufferSource();
      source.buffer = cached.buffer;

      // Routing
      const trackType = track.type || 'master';
      const destinationGain = this.trackGains.get(trackType) || this.masterGain;
      source.connect(destinationGain);

      // Start
      const when = this.ctx.currentTime + startDelaySeconds;
      source.start(when, offsetSeconds);

      this.activeNodes.set(track.id, {
        source,
        gain: destinationGain,
        trackId: track.id
      });

      // Cleanup when done naturally
      source.onended = () => {
        if (generation !== this.currentGeneration) return; // Strict generation verification

        const activeNode = this.activeNodes.get(track.id);
        if (activeNode && activeNode.source === source) {
          source.disconnect();
          activeNode.gain.disconnect();
          this.activeNodes.delete(track.id);
        }
      };
    });
  }
}

// Singleton for the whole app
export const globalAudioEngine = new AudioEngine();
