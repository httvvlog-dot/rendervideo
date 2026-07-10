// Timeline Engine MVP

export interface MediaItem {
  id: string;
  [key: string]: any;
}

export interface Scene {
  id?: string;
  media_id: string;
  track_type: string;
  sort_order: number;
  start_time: number;
  end_time: number;
  duration: number;
  animation?: string; // zoom_in, pan_left, etc
  transition_type?: string;
  locked?: boolean;
}

const ANIMATIONS = ["zoom_in", "zoom_out", "pan_left", "pan_right", "none"];
const TRANSITIONS = ["fade", "crossfade", "none"];

export class TimelineEngine {
  
  /**
   * Generates an initial timeline from a list of media items.
   * Auto-assigns durations evenly, and picks random animations/transitions.
   */
  static generateTimeline(mediaItems: MediaItem[], targetDuration: number): Scene[] {
    if (!mediaItems || mediaItems.length === 0) return [];
    if (targetDuration <= 0) targetDuration = 30; // fallback

    const durationPerScene = targetDuration / mediaItems.length;
    let currentTime = 0;

    return mediaItems.map((media, index) => {
      const isLast = index === mediaItems.length - 1;
      const sceneDuration = isLast ? (targetDuration - currentTime) : durationPerScene; // prevent float rounding leaks

      const scene: Scene = {
        media_id: media.id,
        track_type: "VIDEO",
        sort_order: index,
        start_time: currentTime,
        duration: sceneDuration,
        end_time: currentTime + sceneDuration,
        
        // Auto Scene Intelligence
        animation: ANIMATIONS[Math.floor(Math.random() * ANIMATIONS.length)],
        transition_type: isLast ? "none" : TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)],
        locked: false
      };

      currentTime += sceneDuration;
      return scene;
    });
  }

  /**
   * Balances a timeline when a user manually modifies one or more scene durations.
   * Locked scenes keep their duration. Unlocked scenes share the remaining duration equally.
   */
  static balanceTimeline(currentScenes: Scene[], targetDuration: number): Scene[] {
    if (!currentScenes || currentScenes.length === 0) return [];

    const lockedScenes = currentScenes.filter(s => s.locked);
    const unlockedScenes = currentScenes.filter(s => !s.locked);

    const lockedDurationSum = lockedScenes.reduce((sum, s) => sum + s.duration, 0);
    const remainingDuration = Math.max(0, targetDuration - lockedDurationSum);

    const unlockedDurationPerScene = unlockedScenes.length > 0 
      ? remainingDuration / unlockedScenes.length 
      : 0;

    // Recalculate timeline with updated durations
    let currentTime = 0;
    
    // Sort by sort_order just in case
    const sortedScenes = [...currentScenes].sort((a, b) => a.sort_order - b.sort_order);

    return sortedScenes.map((scene, index) => {
      let finalDuration = scene.locked ? scene.duration : unlockedDurationPerScene;
      
      // Fix potential rounding errors on the last scene
      if (index === sortedScenes.length - 1 && !scene.locked) {
        finalDuration = Math.max(0, targetDuration - currentTime);
      }

      const updatedScene = {
        ...scene,
        start_time: currentTime,
        duration: finalDuration,
        end_time: currentTime + finalDuration
      };

      currentTime += finalDuration;
      return updatedScene;
    });
  }
}
