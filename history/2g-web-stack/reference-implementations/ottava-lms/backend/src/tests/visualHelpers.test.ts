import assert from 'assert';
import { clampSnippet, parseSizeDimensions } from '../utils/visualHelpers';

export const runVisualHelperTests = () => {
  assert.strictEqual(clampSnippet('  hello   world  ', 20), 'hello world', 'should trim whitespace');
  const longText = 'a'.repeat(2000);
  assert.strictEqual(
    clampSnippet(longText, 10),
    'aaaaaaaaaa',
    'should clamp to max length when exceeding limit'
  );
  assert.strictEqual(clampSnippet('', 10), '', 'empty inputs should return empty string');

  const defaultSize = parseSizeDimensions();
  assert.deepStrictEqual(defaultSize, { width: 1024, height: 1024 }, 'default dimensions fallback');

  const wideSize = parseSizeDimensions('1792x1024');
  assert.deepStrictEqual(wideSize, { width: 1792, height: 1024 }, 'should parse numeric values');

  const invalidSize = parseSizeDimensions('abcx5');
  assert.deepStrictEqual(
    invalidSize,
    { width: 1024, height: 5 },
    'invalid width falls back while valid height remains'
  );
};
