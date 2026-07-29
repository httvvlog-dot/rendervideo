import { TransitionEngine, SceneInput } from "../src/utils/timeline/TransitionEngine";
import { VideoTransition } from "../src/utils/timeline/TransitionService";

const mockLibrary: VideoTransition[] = [
  { id: "1", code: "fade", name: "Fade", default_duration: 0.5 },
  { id: "2", code: "slide-left", name: "Slide Left", default_duration: 0.5 },
  { id: "3", code: "slide-right", name: "Slide Right", default_duration: 0.5 },
  { id: "4", code: "push-left", name: "Push Left", default_duration: 0.5 },
  { id: "5", code: "push-right", name: "Push Right", default_duration: 0.5 },
  { id: "6", code: "zoom-in", name: "Zoom In", default_duration: 0.5 },
  { id: "7", code: "zoom-out", name: "Zoom Out", default_duration: 0.5 },
  { id: "8", code: "blur", name: "Blur", default_duration: 0.5 },
];

function generateScenes(count: number): SceneInput[] {
  return Array.from({ length: count }).map((_, i) => ({
    media_id: `media-${i}`,
    section_id: `section`,
    duration: 5,
    start_time: i * 5,
    end_time: (i + 1) * 5,
    sort_order: i
  }));
}

function runTest(sceneCount: number, seed?: number) {
  console.log(`\n--- Running test for ${sceneCount} scenes ---`);
  const scenes = generateScenes(sceneCount);
  const result = TransitionEngine.injectTransitions(scenes, mockLibrary, seed);
  
  // Validate anti-repeat
  let hasRepeat = false;
  for (let i = 1; i < result.length - 1; i++) {
    if (result[i].transition_type === result[i - 1].transition_type) {
      console.error(`ERROR: Repeat found at index ${i}: ${result[i].transition_type}`);
      hasRepeat = true;
    }
  }

  // Validate last scene
  if (result[result.length - 1].transition_type !== "none") {
    console.error(`ERROR: Last scene is not "none"`);
  }

  if (!hasRepeat) {
    console.log("Anti-repeat validation passed.");
  }
  
  // Show sequence
  const sequence = result.map(s => s.transition_type);
  console.log("Sequence:", sequence.join(" -> "));
}

runTest(12, 12345);
runTest(12, 12345); // Should produce the exact same sequence (deterministic)
runTest(48, 9999);
runTest(75, 42);
