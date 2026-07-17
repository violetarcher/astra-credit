import { deriveFgaUserId } from './auth';

const cases: [string, string][] = [
  ['violet.archer@okta.com',   'violet.archer'],
  ['user.name@okta.com',       'user.name'],
  ['john+test@example.com',    'john-test'],
  ['auth0|abc123',             'auth0-abc123'],
  ['CAPS@okta.com',            'caps'],
];

let passed = 0;
let failed = 0;

for (const [input, expected] of cases) {
  const result = deriveFgaUserId(input);
  const ok = result === expected;
  console.log(`${ok ? '✓' : '✗'} deriveFgaUserId("${input}") → "${result}"${ok ? '' : ` (expected "${expected}")`}`);
  ok ? passed++ : failed++;
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
