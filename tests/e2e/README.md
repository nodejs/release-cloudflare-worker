# End-to-End Tests

These are for testing the entire worker from client to server.
The [Miniflare 3 API](https://latest.miniflare.dev) is used to spin up a local
[Workerd](https://github.com/cloudflare/workerd) instance that the tests interact with.

Test file names correspond to what's being tested. For example, [./directory.test.ts](./directory.test.ts)
contains tests related to directory listing or directories as a whole.

## Adding a New Test File

Create the file and name it to something that's fitting to what it will be testing.
For simplicity sakes, take a look at the already existing test files and copy the structure.
Make sure to import the new test file into [./index.test.ts](./index.test.ts).

## Adding a New Test

Each E2E test has one big `describe` call that contains all of its tests, add tests in that.
We usually prefer the `it` alias for defining tests.
