import { VideoTransition } from "./TransitionService";

export interface SceneInput {
  media_id: string;
  section_id: string;
  duration: number;
  start_time: number;
  end_time: number;
  sort_order: number;
  transition_type?: string;
  transition_duration?: number;
}

/**
 * A simple seeded random number generator (Mulberry32).
 * This ensures that if we use the same seed, we get the exact same sequence of transitions.
 */
function seededRandom(seed: number) {
  let t = seed += 0x6D2B79F5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export class TransitionEngine {
  /**
   * Determine how many transitions to pick based on the total number of scenes.
   */
  static getPoolSize(sceneCount: number, randomFn: () => number): number {
    if (sceneCount <= 10) return 3;
    if (sceneCount <= 20) return randomFn() < 0.5 ? 5 : 6;
    if (sceneCount <= 35) return randomFn() < 0.5 ? 7 : 8;
    if (sceneCount <= 50) return randomFn() < 0.5 ? 10 : 11;
    if (sceneCount <= 80) return Math.floor(randomFn() * 3) + 12; // 12, 13, 14
    return Math.floor(randomFn() * 4) + 15; // 15, 16, 17, 18
  }

  /**
   * Shuffles an array in-place (or rather returns a shuffled copy) using the provided random function.
   */
  static shuffleArray<T>(array: T[], randomFn: () => number): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(randomFn() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  /**
   * Injects transitions into an array of scenes.
   * Modifies `transition_type` and `transition_duration`.
   */
  static injectTransitions(
    scenes: SceneInput[], 
    availableTransitions: VideoTransition[],
    seed?: number
  ): SceneInput[] {
    if (scenes.length === 0) return [];
    
    // Fallback if DB library is totally empty
    if (availableTransitions.length === 0) {
      return scenes.map((s, idx) => ({
        ...s,
        transition_type: idx === scenes.length - 1 ? "none" : "fade",
        transition_duration: idx === scenes.length - 1 ? 0 : 0.5
      }));
    }

    const effectiveSeed = seed ?? Date.now();
    // We mutate a local variable state inside the closure so randomFn advances the generator
    let currentSeedState = effectiveSeed;
    const randomFn = () => {
      const val = seededRandom(currentSeedState);
      currentSeedState++;
      return val;
    };

    // 1. Determine pool size
    const poolSizeTarget = TransitionEngine.getPoolSize(scenes.length, randomFn);
    const actualPoolSize = Math.min(poolSizeTarget, availableTransitions.length);

    // 2. Shuffle and pick pool
    const shuffledTransitions = TransitionEngine.shuffleArray(availableTransitions, randomFn);
    const pool = shuffledTransitions.slice(0, actualPoolSize);

    // Logging for observability
    console.log("========================");
    console.log("Transition Engine");
    console.log("Scenes :", scenes.length);
    console.log("Pool Target Size :", poolSizeTarget);
    console.log("Actual Pool Size :", actualPoolSize);
    console.log("Library Loaded :", availableTransitions.length);
    console.log("Selected Pool :");
    pool.forEach(p => console.log(`- ${p.name} (${p.code})`));
    console.log("Seed :", effectiveSeed);
    console.log("========================");

    // 3. Distribute with Anti-Repeat
    const newScenes: SceneInput[] = [];
    let lastTransitionCode: string | null = null;

    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      const isLast = i === scenes.length - 1;

      // The last scene doesn't transition to anything, standardize to "none"
      if (isLast) {
        newScenes.push({
          ...scene,
          transition_type: "none",
          transition_duration: 0
        });
        continue;
      }

      // Filter out the last used transition for anti-repeat
      let validOptions = pool.filter(t => t.code !== lastTransitionCode);
      
      // Fallback if pool only has 1 item (rare, e.g. Admin only enabled 1 transition)
      if (validOptions.length === 0) {
        validOptions = pool;
      }

      const selected = validOptions[Math.floor(randomFn() * validOptions.length)];
      lastTransitionCode = selected.code;

      newScenes.push({
        ...scene,
        transition_type: selected.code,
        transition_duration: selected.default_duration
      });
    }

    return newScenes;
  }
}
