export function normalizeDurations(targetDuration: number, rawSections: { duration_seconds: number }[]) {
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
    // Edge case if bumping 0s to 1s caused sum to exceed target
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
