# Dev Setup

Guide to setting up this worker for development.

## Have Node Installed

Node needs to be installed for the thing that serves Node downloads (latest LTS/even numbered major recommended)

## Install Dependencies

Run `npm install`

## Testing

To run unit tests, `npm run test:unit`. To run e2e (end-to-end) tests, `npm run test:e2e`.

See the [/test](../tests/) folder for more info on testing.

## Running Locally

Spin up a Workerd instance on your machine that serves this worker

### Login to Cloudflare Dash From Wrangler CLI

Run `wrangler login`

### R2 Buckets

Depending on the environment you're running in, you will need a different R2 bucket on your account.
For dev (the default), it's `dist-dev`. For staging, `dist-staging`. For prod, `dist-prod`.
These buckets will either need to have a copy of Node's dist folder in them or something mimicing the folder there.

### Starting the Local Server

Run `npm start`. This starts a Workerd instance in remote mode.
