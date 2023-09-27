#!/usr/bin/env node

import { randomUUID } from 'node:crypto';

console.log(`New API Keey: ${randomUUID()}`);
console.log('Run `wrangler secrets put CACHE_PURGE_API_KEY -e <env>`');
