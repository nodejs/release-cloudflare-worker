# Switching Between The Worker and The Origin Server

Steps for toggling serves production traffic between the Release Worker and
origin server. 

## Option A. Worker Routes

You need write access to Node.js' Cloudflare account for this option.

> [!NOTE]
> This assumes the Cloudflare config for the origin server has remained in-tact and is still production ready.

### Steps

- Go to https://dash.cloudflare.com/07be8d2fbc940503ca1be344714cb0d1/nodejs.org/workers

- Disable the routes that point to `dist-worker-prod`

### Option B. Release Worker Routing

- Go to [src/routes/index.ts](../../src/routes/index.ts).

- Order the `R2Middleware`'s and `OriginMiddleware`'s to reflect the correct
  order that they should be invoked in. For example, prioritizing the origin
  server over R2 means the `OriginMiddleware` should appear before the
  `R2Middleware`, and vice-versa for prioritizing R2.
