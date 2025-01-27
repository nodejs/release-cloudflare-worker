import assert from 'node:assert';
import { describe, it } from 'node:test';
import { parseConditionalHeaders, parseRangeHeader } from '../../../src/utils/request';

describe('parseRangeHeader', () => {
  it('`bytes=0-10`', () => {
    const result = parseRangeHeader('bytes=0-10');
    assert.notStrictEqual(result, undefined);

    assert.strictEqual(result.offset, 0);
    assert.strictEqual(result.length, 11);
  });

  it('`bytes=0-10, 15-20, 20-30`', () => {
    const result = parseRangeHeader('bytes=0-10, 15-20, 20-30');
    assert.notStrictEqual(result, undefined);

    assert.strictEqual(result.offset, 0);
    assert.strictEqual(result.length, 11);
  });

  it('`bytes=0-`', () => {
    const result = parseRangeHeader('bytes=0-');
    assert.notStrictEqual(result, undefined);

    assert.strictEqual(result.offset, 0);
    assert.strictEqual(result.length, undefined);
  });

  it('`bytes=-10`', () => {
    const result = parseRangeHeader('bytes=-10');
    assert.notStrictEqual(result, undefined);

    assert.strictEqual(result.suffix, 10);
  });

  it('`bytes=-`', () => {
    const result = parseRangeHeader('bytes=-');
    assert.strictEqual(result, undefined);
  });

  it('`some-other-unit=-`', () => {
    const result = parseRangeHeader('some-other-unit=-');
    assert.strictEqual(result, undefined);
  });

  it('`bytes=10-0`', () => {
    const result = parseRangeHeader('bytes=10-0');
    assert.strictEqual(result, undefined);
  });
});

describe('parseConditionalHeaders', () => {
  it('invalid dates', () => {
    const headers = new Headers({
      'if-modified-since': 'asd',
      'if-unmodified-since': 'asd'
    });
    
    assert.deepStrictEqual(parseConditionalHeaders(headers), {
      ifMatch: undefined,
      ifNoneMatch: undefined,
      ifModifiedSince: undefined,
      ifUnmodifiedSince: undefined,
      range: undefined
    })
  })
})
