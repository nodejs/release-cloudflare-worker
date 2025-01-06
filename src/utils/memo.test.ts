import { expect, test } from 'vitest';
import { once } from './memo';

test('once()', () => {
  let callCount = 0;
  const getString = once(() => {
    callCount++;
    return 'asd123';
  });

  const str = getString();
  expect(str).toStrictEqual('asd123');
  expect(callCount).toEqual(1);

  const str2 = getString();
  expect(str2).toStrictEqual(str);
  expect(callCount).toEqual(1);
});
