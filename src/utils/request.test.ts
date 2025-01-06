import { describe, expect, test } from 'vitest';
import { parseConditionalHeaders, parseRangeHeader } from './request';

describe('parseRangeHeader', () => {
  test('`bytes=0-10`', () => {
    const result = parseRangeHeader('bytes=0-10');

    expect(result).toStrictEqual({
      offset: 0,
      length: 11,
    });
  });

  test('`bytes=0-10, 15-20, 20-30`', () => {
    const result = parseRangeHeader('bytes=0-10, 15-20, 20-30');
    expect(result).toBeDefined();

    expect(result).toStrictEqual({
      offset: 0,
      length: 11,
    });
  });

  test('`bytes=0-`', () => {
    const result = parseRangeHeader('bytes=0-');
    expect(result).toBeDefined();

    expect(result).toStrictEqual({
      offset: 0,
    });
  });

  test('`bytes=-10`', () => {
    const result = parseRangeHeader('bytes=-10');

    expect(result).toStrictEqual({ suffix: 10 });
  });

  test('`bytes=-`', () => {
    const result = parseRangeHeader('bytes=-');

    expect(result).toStrictEqual(undefined);
  });

  test('`some-other-unit=-`', () => {
    const result = parseRangeHeader('some-other-unit=-');

    expect(result).toStrictEqual(undefined);
  });

  test('`bytes=10-0`', () => {
    const result = parseRangeHeader('bytes=10-0');

    expect(result).toStrictEqual(undefined);
  });
});

describe('parseConditionalHeaders', () => {
  test('invalid dates', () => {
    const headers = new Headers({
      'if-modified-since': 'asd',
      'if-unmodified-since': 'asd',
    });

    expect(parseConditionalHeaders(headers)).toStrictEqual({
      ifMatch: undefined,
      ifNoneMatch: undefined,
      ifModifiedSince: undefined,
      ifUnmodifiedSince: undefined,
      range: undefined,
    });
  });
});
