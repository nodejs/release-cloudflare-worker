# Deploy

This worker is auto-deployed by Github Actions. The workflow is defined [here](../.github/workflows/deploy.yml).

## Staging

This worker is deployed to staging every time a pull request is merged into the main branch.

## Prod

This worker is deployed into prod by a manual trigger.

## Actions Setup

How to setup the actions for automated deployments.

- Create a Cloudflare API Token (https://developers.cloudflare.com/fundamentals/api/get-started/create-token/)
- Set Github secret `CF_API_TOKEN` on the repo to the token you generated
- They should be working now
