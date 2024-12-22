# Debugging Prod

Steps to aid with debugging the Release Worker's production environment.

> [!NOTE]
> This is mostly meant for Node.js Web Infra team members.
> Some of these steps require access to resources only made available to Collaborators.

## Steps

- Check [Sentry](https://nodejs-org.sentry.io/issues/?project=4506191181774848).
  All errors should be reported here.

- If a local reproduction is found, Cloudflare has an implementation of [Chrome's DevTools](https://developers.cloudflare.com/workers/observability/dev-tools/).

- Cloudflare provides basic stats on the worker's Cloudflare dash page [here](https://dash.cloudflare.com/07be8d2fbc940503ca1be344714cb0d1/workers/services/view/dist-worker/production).
