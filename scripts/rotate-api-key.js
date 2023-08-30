#!/usr/bin/env node

const { randomUUID } = require('crypto');

console.log(`New api key: ${randomUUID()}`)
console.log('Now, run `wrangler secrets put PURGE_API_KEY` and enter it in the prompt.')
