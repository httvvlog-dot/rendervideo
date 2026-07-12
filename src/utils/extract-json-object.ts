export function extractJSONObject<T = unknown>(input: string): T {
  if (typeof input !== "string") {
    throw new Error("Input must be a string");
  }

  const startIndex = input.indexOf("{");
  if (startIndex === -1) {
    throw new Error("No JSON object found: Missing opening brace");
  }

  let depth = 0;
  let inString = false;
  let isEscaped = false;

  for (let i = startIndex; i < input.length; i++) {
    const char = input[i];

    if (!inString) {
      if (char === "{") {
        depth++;
      } else if (char === "}") {
        depth--;
        if (depth === 0) {
          const extracted = input.substring(startIndex, i + 1);
          try {
            return JSON.parse(extracted) as T;
          } catch (e: any) {
            throw new Error(`Extracted JSON object cannot be parsed: ${e.message}`);
          }
        }
      } else if (char === '"') {
        inString = true;
      }
    } else {
      // We are inside a string
      if (char === '"' && !isEscaped) {
        inString = false;
      } else if (char === '\\' && !isEscaped) {
        isEscaped = true;
        continue; // skip the escaped state reset below
      }
    }

    // Reset escaped state if we processed a character
    isEscaped = false;
  }

  throw new Error("Incomplete JSON object: Reached end of string before closing brace");
}
