/**
 * Search Source URL Validator & Grounding Auditor
 * 
 * Audits citations, footnotes, and URLs returned by AI Web Search (e.g. Perplexity Sonar),
 * differentiating between verified external sources and unverified model footnotes.
 */

export interface VerifiedSource {
  index: number;
  name?: string;
  url: string;
  timestamp?: string;
  isVerified: boolean;
}

export interface UnverifiedFootnote {
  index: number;
  rawMarker: string; // e.g. "[1]"
}

export interface SourceAuditSummary {
  verifiedSources: VerifiedSource[];
  unverifiedSources: { index: number; name?: string; raw: string }[];
  unverifiedFootnotes: UnverifiedFootnote[];
  totalFootnotesInText: number;
  reliabilityScore: "HIGH" | "MEDIUM" | "LOW" | "UNVERIFIED";
  warningPromptNotice?: string;
}

/**
 * Validates whether a given string is a syntactically valid HTTP/HTTPS URL
 */
export function isValidHttpUrl(candidate: string): boolean {
  if (!candidate || typeof candidate !== "string") return false;
  const trimmed = candidate.trim();
  if (!/^https?:\/\//i.test(trimmed)) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Parses and audits the search response content and provider metadata.
 */
export function auditSearchSources(
  content: string,
  metadataCitations?: string[],
  metadataAnnotations?: any[]
): SourceAuditSummary {
  if (!content) {
    return {
      verifiedSources: [],
      unverifiedSources: [],
      unverifiedFootnotes: [],
      totalFootnotesInText: 0,
      reliabilityScore: "LOW",
    };
  }

  // 1. Collect all footnote markers in content, e.g. [1], [5], [15]
  const footnoteRegex = /\[(\d+)\]/g;
  const foundFootnoteIndices = new Set<number>();
  let match: RegExpExecArray | null;
  while ((match = footnoteRegex.exec(content)) !== null) {
    const idx = parseInt(match[1], 10);
    if (!isNaN(idx)) {
      foundFootnoteIndices.add(idx);
    }
  }

  const verifiedSources: VerifiedSource[] = [];
  const unverifiedSources: { index: number; name?: string; raw: string }[] = [];
  const mappedIndices = new Set<number>();

  // 2. Ingest metadata citations (e.g., from provider)
  if (Array.isArray(metadataCitations)) {
    metadataCitations.forEach((url, i) => {
      const idx = i + 1;
      if (typeof url === "string" && isValidHttpUrl(url)) {
        verifiedSources.push({
          index: idx,
          url: url.trim(),
          isVerified: true,
        });
        mappedIndices.add(idx);
      }
    });
  }

  // 3. Ingest metadata annotations
  if (Array.isArray(metadataAnnotations)) {
    metadataAnnotations.forEach((anno, i) => {
      const idx = i + 1;
      const url = typeof anno === "string" ? anno : anno?.url || anno?.source;
      if (typeof url === "string" && isValidHttpUrl(url)) {
        if (!verifiedSources.some((v) => v.url === url.trim())) {
          verifiedSources.push({
            index: idx,
            url: url.trim(),
            isVerified: true,
          });
          mappedIndices.add(idx);
        }
      }
    });
  }

  // 4. Extract explicit source lines from content body
  // Must be at the start of a line (e.g. within [SOURCES & CITATIONS] section)
  // Patterns like:
  // [1] CoinDesk: https://www.coindesk.com/... (Data Timestamp: ...)
  // [2] Bloomberg - https://bloomberg.com/...
  // [3] https://reuters.com/...
  // [4] Source Name: URL_UNAVAILABLE
  const sourceLineRegex = /^[ \t]*\[(\d+)\]\s*(?:([^:\n\-]+)[:\-])?\s*(\S+)(?:[^\n]*)/gm;
  while ((match = sourceLineRegex.exec(content)) !== null) {
    const idx = parseInt(match[1], 10);
    const sourceName = match[2]?.trim();
    const potentialUrl = match[3]?.trim();

    if (potentialUrl && isValidHttpUrl(potentialUrl)) {
      if (!verifiedSources.some((v) => v.index === idx || v.url === potentialUrl)) {
        verifiedSources.push({
          index: idx,
          name: sourceName,
          url: potentialUrl,
          isVerified: true,
        });
        mappedIndices.add(idx);
      }
    } else if (potentialUrl && (potentialUrl.toUpperCase().includes("URL_UNAVAILABLE") || !isValidHttpUrl(potentialUrl))) {
      unverifiedSources.push({
        index: idx,
        name: sourceName,
        raw: match[0].trim(),
      });
      mappedIndices.add(idx);
    }
  }

  // 5. Also detect standard markdown links: [Source Name](https://...)
  const mdLinkRegex = /\[([^\]]+)\]\((https?:\/\/[^\s\)]+)\)/g;
  let mdIndex = 100;
  while ((match = mdLinkRegex.exec(content)) !== null) {
    const linkText = match[1].trim();
    const linkUrl = match[2].trim();
    if (isValidHttpUrl(linkUrl)) {
      if (!verifiedSources.some((v) => v.url === linkUrl)) {
        verifiedSources.push({
          index: ++mdIndex,
          name: linkText,
          url: linkUrl,
          isVerified: true,
        });
      }
    }
  }

  // 6. Identify footnotes without any mapped valid URL
  const unverifiedFootnotes: UnverifiedFootnote[] = [];
  foundFootnoteIndices.forEach((idx) => {
    const hasValidMapping = verifiedSources.some((v) => v.index === idx);
    if (!hasValidMapping) {
      unverifiedFootnotes.push({
        index: idx,
        rawMarker: `[${idx}]`,
      });
    }
  });

  // 7. Calculate reliability score
  let reliabilityScore: SourceAuditSummary["reliabilityScore"] = "LOW";
  const verifiedCount = verifiedSources.length;
  const unverifiedFootnoteCount = unverifiedFootnotes.length;
  const totalFootnotes = foundFootnoteIndices.size;

  if (verifiedCount > 0 && unverifiedFootnoteCount === 0) {
    reliabilityScore = "HIGH";
  } else if (verifiedCount > 0 && unverifiedFootnoteCount > 0) {
    reliabilityScore = "MEDIUM";
  } else if (verifiedCount === 0 && totalFootnotes > 0) {
    reliabilityScore = "UNVERIFIED";
  } else {
    reliabilityScore = "LOW";
  }

  // 8. Generate warning notice for script generation prompt if ungrounded citations exist
  let warningPromptNotice: string | undefined;
  if (reliabilityScore === "UNVERIFIED" || reliabilityScore === "MEDIUM" || unverifiedFootnoteCount > 0) {
    const missingList = unverifiedFootnotes.map((u) => u.rawMarker).join(", ");
    warningPromptNotice = `
[SOURCE RELIABILITY & GROUNDING NOTICE]:
- Verified Sources with URLs: ${verifiedCount}
- Unverified Footnotes without verifiable URLs: ${unverifiedFootnoteCount} (${missingList || "None"})
MANDATORY SCRIPT WRITING RULE:
The research contains footnote numbers (${missingList || "N/A"}) without direct URL verification.
You MUST NOT present figures, forecasts, or claims tied to unverified citations as 100% established or undisputed facts.
Frame any unverified data with neutral attribution (e.g. "Theo các báo cáo sơ bộ...", "Một số nguồn tin chưa xác thực cho rằng...") and explicitly avoid absolute certainty.`;
  }

  return {
    verifiedSources,
    unverifiedSources,
    unverifiedFootnotes,
    totalFootnotesInText: totalFootnotes,
    reliabilityScore,
    warningPromptNotice,
  };
}

/**
 * Constructs the fortified search prompt requesting explicit URL bibliography
 */
export function buildFortifiedSearchPrompt(topic: string, currentDate: string): string {
  return `You are a real-time research assistant. Perform a rigorous, up-to-date web research on the topic: "${topic}".
Reference Date: Today is ${currentDate}.

RESEARCH GUIDELINES:

1. FRESHNESS & TIMESTAMPS:
- Prioritize the latest verifiable data available as of today (${currentDate}).
- For queries asking for current status or "today", prioritize data updated within the current day or the last 24 hours when applicable.
- For market prices, rates, and financial metrics, include the exact timestamp (date/time) if reported by the source.
- Explicitly distinguish between query time, source data update time, and article publication date.
- Never label older or historical data as "current" or "today".
- If up-to-date data is unavailable, explicitly state the timestamp of the latest known data and note the limitation.

2. SOURCE QUALITY & VERIFICATION:
- Prioritize primary sources, direct official data providers, and established reputable news outlets.
- For key market figures, cross-reference at least two independent sources when possible.
- Do not treat duplicate syndicated articles or reposts as independent verification.
- If conflicting figures exist across reputable sources, report the discrepancies along with their respective dates and sources; never arbitrarily pick a number.

3. STRUCTURED DATA CLASSIFICATION:
Organize your findings clearly under these sections:
[CURRENT FACTS]
- Verifiable current data, live figures/metrics with exact timestamps, and events occurring now or within the last 24 hours.
[HISTORICAL FACTS]
- Relevant historical background, previous benchmarks, and context with clear timeline markers.
[FORECASTS / SCENARIOS]
- Expert projections, market forecasts, and potential scenarios (must be clearly framed as forward-looking estimates, never as confirmed facts).

4. MANDATORY SOURCES & CITATIONS SECTION:
At the end of your output, you MUST provide a [SOURCES & CITATIONS] section listing every cited reference:
Format:
[1] <Source Name>: <Full URL starting with https://> (Data Timestamp: <Timestamp if available>)
[2] <Source Name>: <Full URL starting with https://> (Data Timestamp: <Timestamp if available>)

RULES FOR SOURCES:
- Only cite real, direct URLs returned by your search engine.
- NEVER invent, hallucinate, or guess URLs.
- If a source was consulted but no direct URL is available, write:
  [X] <Source Name>: URL_UNAVAILABLE
- Any numerical claim without a verifiable source must be flagged as unverified.`;
}
