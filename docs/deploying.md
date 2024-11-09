# Deploying the Worker

Guide on how to deploy the Release Worker.

## Staging Deployments

The Release Worker is automatically deployed to its staging environment when a
new commit is pushed to the `main` branch through the [Deploy Worker](https://github.com/nodejs/release-cloudflare-worker/actions/workflows/deploy.yml) action.

## Production Deployments

The Release Worker is deployed to its production environment by a Collaborator
manually running the [Deploy Worker](https://github.com/nodejs/release-cloudflare-worker/actions/workflows/deploy.yml) action.
