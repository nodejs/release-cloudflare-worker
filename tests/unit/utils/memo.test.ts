import assert from 'node:assert';
import { it } from 'node:test';
import { once } from '../../../src/utils/memo';

it('once works', () => {
  let callCount = 0;
  const getString = once(() => {
    callCount++;
    return 'asd123';
  });

  const str = getString();
  assert.strictEqual(str, 'asd123');
  assert.strictEqual(callCount, 1);

  const str2 = getString();
  assert.equal(str, str2);
  assert.strictEqual(str2, 'asd123');
  assert.strictEqual(callCount, 1);
});
