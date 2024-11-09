# Dev Setup

Documentation on how to run the Release Worker locally.

## Steps

### 1. Prepare environment

Read and follow the [Getting Started](../CONTRIBUTING.md) guide to get your
local environment setup.

### 2. Setup your Cloudflare account

Currently we run the worker in [remote mode](https://developers.cloudflare.com/workers/testing/local-development/#develop-using-remote-resources-and-bindings) as there isn't a nice way to
locally populate an R2 bucket. This means that, to run the Release Worker
locally, you must have a Cloudflare account that has an R2 bucket named
`dist-prod`. You will also need to populate the bucket yourself.

Both of these will hopefully change in the future to make running the Release
Worker easier.

### 3. Create secrets for directory listings

This step is optional but recommended.

The Release Worker uses R2's S3 API for directory listings. In order for
directory listings to work, you need to make an R2 API key for your `dist-prod`
bucket and provide it to the worker.

Generating the API key can be done through the Cloudflare dashboard
[here](https://dash.cloudflare.com/?account=/r2/api-tokens).

Then, make a `.dev.vars` file in the root of this repository with the following:

```
S3_ACCESS_KEY_ID=<your access key id>
S3_ACCESS_KEY_SECRET=<your access key secret>
```

### 4. Run the worker

Start the worker locally with `npm start`. You may be prompted to log into
your Cloudflare account.
