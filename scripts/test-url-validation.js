/**
 * Unit Test for Search Source URL Validation (Task 2)
 */

const {
  isValidHttpUrl,
  auditSearchSources,
  buildFortifiedSearchPrompt,
} = require('../src/utils/search-validator.ts');

function runTests() {
  console.log('=== TEST SUITE: SEARCH SOURCE URL VALIDATION ===\n');

  let passed = 0;
  let total = 0;

  function assert(condition, message) {
    total++;
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // 1. URL validity helper
  assert(isValidHttpUrl('https://coindesk.com/price/btc') === true, 'Valid HTTPS URL');
  assert(isValidHttpUrl('http://reuters.com/news') === true, 'Valid HTTP URL');
  assert(isValidHttpUrl('not-a-url') === false, 'Invalid plain string');
  assert(isValidHttpUrl('ftp://example.com') === false, 'FTP URL rejected');
  assert(isValidHttpUrl('http:/broken') === false, 'Malformed HTTP URL rejected');
  assert(isValidHttpUrl('') === false, 'Empty string rejected');

  // 2. Scenario A: Response with provider metadata citations
  const mockContentA = `
[CURRENT FACTS]
Bitcoin is trading at $82,500 [1] according to latest market prints [2].
`;
  const metadataCitationsA = [
    'https://www.coindesk.com/price/bitcoin',
    'https://coinmarketcap.com/currencies/bitcoin',
  ];
  const auditA = auditSearchSources(mockContentA, metadataCitationsA);

  assert(auditA.verifiedSources.length === 2, '2 sources verified from metadata citations');
  assert(auditA.unverifiedFootnotes.length === 0, 'No unverified footnotes in Scenario A');
  assert(auditA.reliabilityScore === 'HIGH', 'Reliability score is HIGH');
  assert(auditA.warningPromptNotice === undefined, 'No warning notice required for HIGH reliability');

  // 3. Scenario B: Response without metadata citations, but structured bibliography in body
  const mockContentB = `
[CURRENT FACTS]
Bitcoin has dropped 3% today [1], while trading volume reached 400M USD [2].

[SOURCES & CITATIONS]
[1] CoinDesk: https://www.coindesk.com/price/btc (Timestamp: 2026-10-24 08:30 UTC)
[2] Bloomberg: https://www.bloomberg.com/crypto
`;
  const auditB = auditSearchSources(mockContentB);

  assert(auditB.verifiedSources.length === 2, '2 sources extracted and verified from body bibliography');
  assert(auditB.unverifiedFootnotes.length === 0, 'Footnotes [1] and [2] mapped to verified URLs');
  assert(auditB.reliabilityScore === 'HIGH', 'Reliability score is HIGH');

  // 4. Scenario C: Response with footnotes [1], [5], [15] but NO URLs anywhere (Perplexity bug scenario)
  const mockContentC = `
[CURRENT FACTS]
Giá Bitcoin hôm nay đạt $81,263.73 [1], giảm 3.29% trong 24 giờ qua [5].
Khối lượng thanh lý đạt 400 triệu USD [15].
`;
  const auditC = auditSearchSources(mockContentC);

  assert(auditC.verifiedSources.length === 0, '0 verified sources');
  assert(auditC.totalFootnotesInText === 3, 'Found 3 distinct footnotes ([1], [5], [15])');
  assert(auditC.unverifiedFootnotes.length === 3, 'All 3 footnotes flagged as UNVERIFIED');
  assert(auditC.reliabilityScore === 'UNVERIFIED', 'Reliability score is UNVERIFIED');
  assert(typeof auditC.warningPromptNotice === 'string', 'Warning prompt notice generated');
  assert(auditC.warningPromptNotice.includes('[SOURCE RELIABILITY & GROUNDING NOTICE]'), 'Notice contains standard warning header');
  assert(auditC.warningPromptNotice.includes('[1], [5], [15]'), 'Notice explicitly lists unverified footnote markers');

  // 5. Scenario D: Mixed scenario (Some verified URLs, some missing or URL_UNAVAILABLE)
  const mockContentD = `
Bitcoin is at $82,000 [1]. A rumor suggests new regulation [2]. Whale bought 10k BTC [3].

[SOURCES & CITATIONS]
[1] CoinDesk: https://coindesk.com/btc
[2] CryptoTwitter: URL_UNAVAILABLE
`;
  const auditD = auditSearchSources(mockContentD);

  assert(auditD.verifiedSources.length === 1, '1 source verified');
  assert(auditD.unverifiedSources.length === 1, '1 source flagged as URL_UNAVAILABLE');
  assert(auditD.unverifiedFootnotes.some(u => u.index === 3), 'Footnote [3] flagged as unverified');
  assert(auditD.reliabilityScore === 'MEDIUM', 'Reliability score is MEDIUM');
  assert(typeof auditD.warningPromptNotice === 'string', 'Warning prompt notice generated for medium reliability');

  // 6. Test fortified search prompt generation
  const prompt = buildFortifiedSearchPrompt('Giá BTC hôm nay', '2026-10-24');
  assert(prompt.includes('Reference Date: Today is 2026-10-24'), 'Prompt includes authoritative date');
  assert(prompt.includes('MANDATORY SOURCES & CITATIONS SECTION'), 'Prompt mandates source section');
  assert(prompt.includes('URL_UNAVAILABLE'), 'Prompt instructs fallback to URL_UNAVAILABLE');

  console.log(`\n=== ALL ${passed}/${total} URL VALIDATION TESTS PASSED ===\n`);
}

runTests();
