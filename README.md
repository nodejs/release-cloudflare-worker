# node-with-r2-poc
PoC for Node.js using R2 for downloads

For more information, check out [nodejs/build#3461](https://github.com/nodejs/build/issues/3461).

## Dev Setup
 * Install [Node](https://nodejs.org) (>=18.12.1)
 * `npm install -G wrangler` (latest recommended)
 * Log into your [Cloudflare dash](https://dash.cloudflare.com) from Wrangler cli
 * Create two R2 buckets on your account, `node-poc-dev` and `node-poc-prod`. They will need to either have a copy of Node's dist folder on them or have a recreation of it.
 * `npm install`
 * `npm start` to run the local worker. You will need to turn off local mode by hitting `l` in order for it to work.

## License
This PoC is licensed under the terms of the [MIT License](./LICENSE.md). It is based off of [Kotx's render worker](https://github.com/kotx/render), which is also licensed under the MIT license.
