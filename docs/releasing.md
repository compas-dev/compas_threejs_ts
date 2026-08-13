# Releasing

Releases are prepared by Release Please and published to npm by GitHub Actions.

1. Merge conventional commits into `main`.
2. Review and merge the release pull request maintained by Release Please.
3. The resulting GitHub release triggers publication of
   `@compas-dev/compas-threejs-ts` through npm Trusted Publishing.

If GitHub release creation succeeds but npm publication fails, dispatch the
`release` workflow with `publish` enabled to retry the current package version.

## One-time npm setup

Before the first release, configure the GitHub Actions Trusted Publisher for
`@compas-dev/compas-threejs-ts` with:

- organization or user: `compas-dev`
- repository: `compas_threejs_ts`
- workflow: `release.yml`
- environment: `npm`

The matching protected GitHub environment already exists and only permits
deployments from `main`. The release workflow uses OIDC and does not require an
`NPM_TOKEN` secret.
