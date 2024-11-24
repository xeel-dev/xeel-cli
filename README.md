# Xeel CLI

<div style="text-align: center;">
  <strong>
    <a href="https://xeel.dev">Xeel</a>
     | 
    <a href="https://docs.xeel.dev">Documentation</a>
  </strong>
</div>

The Xeel CLI enables interfacing with Xeel's backend.

Only dependency debt is currently supported.

## Getting started

**If you are just trying to ingest data from your
repository in the simplest way, check out the [Xeel
GitHub Action](https://github.com/xeel-dev/report-action)!**

To run a report, execute the `xeel` CLI with `npx`.

```sh
npx xeel report
```

The default options will try to discover the repository ID
for the configured git remote.
If the repository is private, you will be prompted for
auth, so the ID can be loaded.
By default the ID is stored in the local git config, as
`xeel.repositoryId`.

This will run the debt reporter locally, using the `xeel`
authentication provider. This will launch a browser window
for approval to issue a token.

## Ecosystems

The Xeel CLI does not support any ecosystems out of the
box.
The `register-ecosystem` hook allows `oclif` plugins to
add additional `EcosystemSupport` implementations.

To install a plugin, use

```sh
npx xeel plugins install $PLUGIN_NAME
```

### First Party Ecosystem Plugins

- [`@xeel-dev/cli-docker-plugin`](https://github.com/xeel-dev/cli-docker-plugin)
- [`@xeel-dev/cli-npm-plugin`](https://github.com/xeel-dev/cli-npm-plugin)
