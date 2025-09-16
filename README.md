<p align="center">
  <br />
  <a href="https://nodejs.org">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://nodejs.org/static/logos/nodejsLight.svg">
      <img src="https://nodejs.org/static/logos/nodejsDark.svg" width="200px">
    </picture>
  </a>
</p>
hdsakfjhsfkjahkajsdfjk
<p align="center">
  A <a href="https://workers.cloudflare.com">Cloudflare Worker</a> that serves <a href="https://nodejs.org">Node.js</a> downloads and documentation.
</p>

<p align="center">
    <a title="MIT License" href="LICENSE">
        <img src="https://img.shields.io/badge/license-MIT-blue" alt="MIT License" />
    </a>
</p>

## Contributing

This project adopts the Node.js [Code of Conduct](https://github.com/nodejs/admin/blob/main/CODE_OF_CONDUCT.md).

Any person that wants to contribute to the Worker is welcome! Please read the [Contribution Guidelines](CONTRIBUTING.md) to better understand the structure of this repository.

### Deployment

The Worker is deployed to Cloudflare via [a Github Action](https://github.com/nodejs/release-cloudflare-worker/blob/main/.github/workflows/deploy.yml).

There is a staging environment available at https://dist-worker-staging.nodejs.workers.dev/. The Worker is automatically deployed to this environment when commits are merged into the `main` branch.

The production environment is available at https://r2.nodejs.org. Deployments here are done manually by a Collaborator.

## Relevant Links

- [Code of Conduct](https://github.com/nodejs/admin/blob/main/CODE_OF_CONDUCT.md)

- [Contribution Guidelines](CONTRIBUTING.md)

- [Collaborator Guideline](COLLABORATOR_GUIDE.md)

## License

This repo is licensed under the terms of the [MIT License](./LICENSE.md). It is based off of [Kotx's render worker](https://github.com/kotx/render), which is also licensed under the MIT license.

## Thanks

- Thanks to all the contributors and collaborators that make this project possible.
- Thanks to [Cloudflare](https://cloudflare.com) for providing the infrastructure that serves the Worker under their Open Source Initiative in addition to immense support.
- Thanks to [Sentry](https://sentry.io/welcome) for providing an open source license for their error reporting software.
