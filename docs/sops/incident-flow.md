# Incident Flow

Procedure for what to do if there's an incident with the Release Worker.

## Steps

1. If the incident was caused by a recent change, try
   [rollbacking the release](./rolling-back-a-release.md).

2. If the incident affects traffic towards the Release Worker, update the
   Node.js status page (https://status.nodejs.org). If it is a ongoing security
   incident that we cannot disclose publicly yet, do not includes the details
   of the incident in the status page.

   - Optional, but preferably updates will be echoed on social media.

   - Please also monitor any issues in repositories such as
     this one,
     [nodejs/node](https://github.com/nodejs/node), and
     [nodejs/nodejs.org](https://github.com/nodejs/nodejs.org) for users asking
     about the incident and link them to the status page.

3. [Steps for debugging the worker when it's deployed](../debugging.md)

4. If there is an ongoing security incident requiring code changes, a force
   push to the `main` branch can be performed by a
   [Collaborator](../CONTRIBUTING.md#contributing) if there is reasonable risk
   that opening a PR with the change would allow more bad actors to exploit the
   vulnerability. The code changes must still be approved by another
   Collaborator before the force push is performed, however.

5. If the issue requires support from Cloudflare, try reaching out through the
   `ext-nodejs-cloudflare` channel in the OpenJS Slack.

6. If needed, create an issue on this repository to serve as a discussion board
   for any changes that need to be made to avoid the same incident from
   happening again.

## What qualifies an an incident?

There is no exact criteria, however, these cases will most likely call for an
incident to be declared:

1. The production deployment of the Release Worker is unavailable to the public
   or is otherwise operating in a way that impacts users' abilities to interact
   with it en masse. This includes behaviors that we are responsible for and
   those that Cloudflare is responsible for.

2. There is a ongoing security issue that involves the production deployment of
   the Release Worker.

Note the Node.js Web Infrastructure, Build, and TSC teams can declare an
incident wherever they see fit, however.
