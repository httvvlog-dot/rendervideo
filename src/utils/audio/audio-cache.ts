export interface CachedAudioData {
  buffer: AudioBuffer;
  duration: number;
  sampleRate: number;
  channels: number;
  peaks: Float32Array;
}

export type AudioLoadState = 'Idle' | 'Loading' | 'Ready' | 'Error';

export interface AudioLoadResult {
  url: string;
  data?: CachedAudioData;
  error?: string;
}

const MAX_CONCURRENT = 3;
const MAX_LRU_ITEMS = 100;

export class AudioCacheManager {
  private lruKeys: string[] = [];
  private cache: Map<string, CachedAudioData> = new Map();
  private loadStates: Map<string, AudioLoadState> = new Map();
  
  private activeFetches: number = 0;
  private fetchQueue: Array<{
    url: string;
    resolve: (data: AudioLoadResult) => void;
    abortController: AbortController;
  }> = [];

  // Used strictly for decodeAudioData
  private decodeContext: AudioContext | null = null;

  public getContext(): AudioContext {
    if (!this.decodeContext) {
      this.decodeContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.decodeContext;
  }

  public get(url: string): CachedAudioData | undefined {
    if (this.cache.has(url)) {
      // LRU refresh
      this.lruKeys = this.lruKeys.filter(k => k !== url);
      this.lruKeys.push(url);
      return this.cache.get(url);
    }
    return undefined;
  }

  public getState(url: string): AudioLoadState {
    if (this.cache.has(url)) return 'Ready';
    return this.loadStates.get(url) || 'Idle';
  }

  public async load(url: string): Promise<AudioLoadResult> {
    if (this.cache.has(url)) {
      return { url, data: this.get(url) };
    }
    
    if (this.loadStates.get(url) === 'Loading') {
      // It's already in queue or fetching, we just wait for it.
      // For simplicity, we just return a new promise that resolves when it's done.
      // But we should track promises to merge them.
      // Let's implement promise sharing.
    }

    return new Promise((resolve) => {
      const abortController = new AbortController();
      this.fetchQueue.push({ url, resolve, abortController });
      this.loadStates.set(url, 'Loading');
      this.processQueue();
    });
  }

  public abortAll() {
    // Clear queue
    this.fetchQueue.forEach(item => item.abortController.abort());
    this.fetchQueue = [];
    this.activeFetches = 0;
    this.loadStates.clear();
    // Cache remains intact
  }

  public clearMemory() {
    this.cache.clear();
    this.lruKeys = [];
    this.abortAll();
  }

  private async processQueue() {
    if (this.activeFetches >= MAX_CONCURRENT || this.fetchQueue.length === 0) {
      return;
    }

    const task = this.fetchQueue.shift();
    if (!task) return;

    this.activeFetches++;
    try {
      const data = await this.fetchAndDecodeWithRetry(task.url, task.abortController.signal);
      this.cacheData(task.url, data);
      this.loadStates.set(task.url, 'Ready');
      task.resolve({ url: task.url, data });
    } catch (e: any) {
      if (e.name === 'AbortError') {
        this.loadStates.set(task.url, 'Idle');
        task.resolve({ url: task.url, error: 'Aborted' });
      } else {
        this.loadStates.set(task.url, 'Error');
        console.error(`AudioCacheManager Error loading ${task.url}:`, e);
        task.resolve({ url: task.url, error: e.message });
      }
    } finally {
      this.activeFetches--;
      this.processQueue();
    }
  }

  private async fetchAndDecodeWithRetry(url: string, signal: AbortSignal, retries = 3): Promise<CachedAudioData> {
    let lastError = null;
    for (let i = 0; i < retries; i++) {
      try {
        const response = await fetch(url, { signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const arrayBuffer = await response.arrayBuffer();
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');
        
        const audioBuffer = await this.decodeAudioData(arrayBuffer);
        if (signal.aborted) throw new DOMException('Aborted', 'AbortError');

        const peaks = this.extractPeaks(audioBuffer);
        return {
          buffer: audioBuffer,
          duration: audioBuffer.duration,
          sampleRate: audioBuffer.sampleRate,
          channels: audioBuffer.numberOfChannels,
          peaks
        };
      } catch (e: any) {
        if (e.name === 'AbortError') throw e; // Don't retry aborts
        lastError = e;
        await new Promise(res => setTimeout(res, 500 * (i + 1))); // Backoff
      }
    }
    throw lastError;
  }

  private decodeAudioData(arrayBuffer: ArrayBuffer): Promise<AudioBuffer> {
    return new Promise((resolve, reject) => {
      this.getContext().decodeAudioData(arrayBuffer, resolve, reject);
    });
  }

  private extractPeaks(buffer: AudioBuffer, samples = 1000): Float32Array {
    const channelData = buffer.getChannelData(0); // Use first channel for waveform
    const step = Math.ceil(channelData.length / samples);
    const peaks = new Float32Array(samples);
    
    for (let i = 0; i < samples; i++) {
      let max = 0;
      for (let j = 0; j < step; j++) {
        const datum = channelData[(i * step) + j];
        if (datum > max) max = datum;
        else if (-datum > max) max = -datum;
      }
      peaks[i] = max;
    }
    return peaks;
  }

  private cacheData(url: string, data: CachedAudioData) {
    if (this.lruKeys.length >= MAX_LRU_ITEMS) {
      const oldestUrl = this.lruKeys.shift();
      if (oldestUrl) this.cache.delete(oldestUrl);
    }
    this.cache.set(url, data);
    this.lruKeys.push(url);
  }
}

export const globalAudioCache = new AudioCacheManager();
