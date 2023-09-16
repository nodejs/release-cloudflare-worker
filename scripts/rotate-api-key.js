#!/usr/bin/env node

const { randomUUID } = require('crypto');

console.log(`New api key: ${randomUUID()}`);
console.log(
  'Now, run `wrangler secrets put CACHE_PURGE_API_KEY -e <env>` and enter it in the prompt.'
);
