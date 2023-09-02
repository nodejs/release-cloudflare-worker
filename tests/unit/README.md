# Unit Tests
These are for testing specific functions in the worker.

<br />

Test file names correspond to the file name in the [`src`](../../src) directory that is being tested.
For example, [`./util.test.ts`](./util.test.ts) tests functions defined from [`src/util.ts`](../../src/util.ts).

## Adding a New Test File
Create the file and name it the same name as the file in the [`src`](../../src) directory.
See [Adding a New Test](#adding-a-new-test) for testing the functions.
Make sure to import the new test file into [./index.test.ts](./index.test.ts).

## Adding a New Test
Each function has its tests wrapped in a `describe` call just for neatness.
We usually prefer the `it` alias for defining tests. For example, tests for the
function `doSomething` would look something like this:
```js
describe('doSomething', () => {
  it('does something', () => {/*...*/});
});
```
