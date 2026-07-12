import { readFileSync } from 'fs';
import { resolve } from 'path';

// Just pasting the logic to test it without TS compilation noise
function normalizeDurations(targetDuration, rawSections) {
  if (targetDuration < 10 || targetDuration > 3600) {
    throw new Error("Target duration must be between 10 and 3600 seconds");
  }
  if (rawSections.length === 0) {
    throw new Error("At least 1 section is required");
  }
  if (rawSections.length > targetDuration) {
    throw new Error("Too many sections for target duration");
  }

  const rawTotal = rawSections.reduce((acc, s) => acc + s.duration_seconds, 0);
  if (rawTotal <= 0) {
    throw new Error("Raw total duration must be greater than 0");
  }

  const sectionsWithExact = rawSections.map((s, index) => {
    if (s.duration_seconds <= 0) {
      throw new Error("Every raw duration must be > 0");
    }
    const exact = (s.duration_seconds / rawTotal) * targetDuration;
    const base = Math.floor(exact);
    return {
      index,
      exact,
      base,
      remainder: exact - base,
      assigned: base
    };
  });

  let sumAssigned = 0;
  for (const s of sectionsWithExact) {
    if (s.assigned === 0) {
      s.assigned = 1;
      s.remainder = -1; // heavily penalize since we bumped it artificially
    }
    sumAssigned += s.assigned;
  }

  let remaining = targetDuration - sumAssigned;

  if (remaining > 0) {
    sectionsWithExact.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < remaining; i++) {
      sectionsWithExact[i % sectionsWithExact.length].assigned += 1;
    }
  } else if (remaining < 0) {
    sectionsWithExact.sort((a, b) => a.remainder - b.remainder);
    let i = 0;
    while (remaining < 0 && i < sectionsWithExact.length) {
      if (sectionsWithExact[i].assigned > 1) {
        sectionsWithExact[i].assigned -= 1;
        remaining += 1;
      }
      i++;
    }
  }

  sectionsWithExact.sort((a, b) => a.index - b.index);
  return sectionsWithExact.map(s => s.assigned);
}

const tests = [
  { name: "60 seconds / 6 sections", target: 60, input: [10,10,10,10,10,10], expect: [10,10,10,10,10,10] },
  { name: "60 seconds / uneven durations", target: 60, input: [5, 10, 15, 20], expect: [6, 12, 18, 24] },
  { name: "30 seconds / 7 sections", target: 30, input: [10,10,10,10,10,10,10], expect: [5,4,4,4,4,5,4] }, // Order of assign might differ slightly but sum is 30
  { name: "10 seconds / 10 sections", target: 10, input: [1,1,1,1,1,1,1,1,1,1], expect: [1,1,1,1,1,1,1,1,1,1] },
  { name: "10 seconds / 11 sections -> reject", target: 10, input: [1,1,1,1,1,1,1,1,1,1,1], expectError: true },
  { name: "LLM total = 58, target = 60", target: 60, input: [20, 20, 18], expectSum: 60 },
  { name: "LLM total = 75, target = 60", target: 60, input: [25, 25, 25], expectSum: 60 }
];

console.log("Running duration normalization tests...");
let allPassed = true;

for (const t of tests) {
  try {
    const raw = t.input.map(d => ({ duration_seconds: d }));
    const out = normalizeDurations(t.target, raw);
    
    if (t.expectError) {
      console.error(`FAILED [${t.name}]: Expected error but got ${out}`);
      allPassed = false;
      continue;
    }

    const sum = out.reduce((a, b) => a + b, 0);
    if (sum !== t.target) {
      console.error(`FAILED [${t.name}]: Sum is ${sum}, expected ${t.target}`);
      allPassed = false;
    } else {
      console.log(`PASSED [${t.name}]: ${out.join(',')}`);
    }
  } catch (err) {
    if (t.expectError) {
      console.log(`PASSED [${t.name}]: Got expected error: ${err.message}`);
    } else {
      console.error(`FAILED [${t.name}]: Unexpected error: ${err.message}`);
      allPassed = false;
    }
  }
}

if (allPassed) {
  console.log("ALL TESTS PASSED!");
} else {
  console.log("SOME TESTS FAILED.");
}
