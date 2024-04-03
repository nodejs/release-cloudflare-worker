import assert from 'node:assert';
import { describe, it } from 'node:test';
import { toReadableBytes } from '../../../src/utils/object';

describe('toReadableBytes', () => {
  it('converts 10 to `10 B`', () => {
    const result = toReadableBytes(10);
    assert.strictEqual(result, '10 B');
  });

  it('converts 1024 to `1.0 KB`', () => {
    const result = toReadableBytes(1024);
    assert.strictEqual(result, '1.0 KB');
  });
});
