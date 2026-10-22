/**
 * Unit Test for Time Reference Hardening (Task 1)
 */

const {
  formatCalendarDate,
  getAuthoritativeTime,
  _resetTimeCache,
} = require('../src/utils/time-reference.ts');

async function runTests() {
  console.log('=== TEST SUITE: TIME REFERENCE HARDENING ===\n');

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

  // 1. Test formatCalendarDate across UTC midnight boundary
  // E.g., 2026-10-23T20:30:00Z is 2026-10-24T03:30:00 in Asia/Ho_Chi_Minh (UTC+7)
  const midnightTransitionDate = new Date('2026-10-23T20:30:00Z');
  const vnDate = formatCalendarDate(midnightTransitionDate, 'Asia/Ho_Chi_Minh');
  const utcDate = formatCalendarDate(midnightTransitionDate, 'UTC');

  assert(vnDate === '2026-10-24', 'Vietnam calendar date is next day across UTC midnight boundary');
  assert(utcDate === '2026-10-23', 'UTC calendar date is previous day across UTC midnight boundary');

  // 2. Test formatCalendarDate early morning UTC vs local
  // E.g., 2026-10-24T01:00:00Z is 2026-10-24T08:00:00 in Asia/Ho_Chi_Minh
  const morningDate = new Date('2026-10-24T01:00:00Z');
  assert(formatCalendarDate(morningDate, 'Asia/Ho_Chi_Minh') === '2026-10-24', 'Same day in morning');

  // 3. Test authoritative time calculation with mock fetch
  _resetTimeCache();
  const mockServerDate = 'Sat, 24 Oct 2026 09:00:00 GMT';
  const originalFetch = global.fetch;

  global.fetch = async () => {
    return {
      headers: {
        get: (h) => (h.toLowerCase() === 'date' ? mockServerDate : null),
      },
    };
  };

  const timeResult = await getAuthoritativeTime({
    timezone: 'Asia/Ho_Chi_Minh',
    maxDriftMinutes: 60,
    supabaseUrl: 'https://mock.supabase.co',
    forceRefresh: true,
  });

  assert(timeResult.calendarDate === '2026-10-24', 'Authoritative calendar date matches server date (2026-10-24)');
  assert(timeResult.authoritativeSource === 'database_http', 'Authoritative source is database_http');
  assert(timeResult.isDriftExceeded === true, 'Drift exceeded is correctly flagged when runtime clock lags by ~44h');
  assert(timeResult.driftHours > 40, `Drift hours is accurately calculated (got ${timeResult.driftHours}h)`);

  // 4. Test cache reuse
  let fetchCount = 0;
  global.fetch = async () => {
    fetchCount++;
    return {
      headers: {
        get: () => mockServerDate,
      },
    };
  };

  const cachedResult = await getAuthoritativeTime({
    timezone: 'Asia/Ho_Chi_Minh',
    supabaseUrl: 'https://mock.supabase.co',
    forceRefresh: false,
  });

  assert(fetchCount === 0, 'Cached offset is reused without redundant HTTP requests');
  assert(cachedResult.authoritativeSource === 'cached_offset', 'Authoritative source is cached_offset');

  // 5. Test fallback when network fails and cache is empty
  _resetTimeCache();
  global.fetch = async () => {
    throw new Error('Network error');
  };

  const fallbackResult = await getAuthoritativeTime({
    timezone: 'Asia/Ho_Chi_Minh',
    supabaseUrl: 'https://mock.supabase.co',
  });

  assert(fallbackResult.authoritativeSource === 'runtime_fallback', 'Falls back gracefully to runtime_fallback on error');
  assert(fallbackResult.calendarDate.length === 10, 'Fallback still returns valid YYYY-MM-DD date');

  // Restore fetch
  global.fetch = originalFetch;

  console.log(`\n=== ALL ${passed}/${total} TIME REFERENCE TESTS PASSED ===\n`);
}

runTests().catch(err => {
  console.error(err);
  process.exit(1);
});
