# Releasing

Releases are prepared by Release Please and published to npm by GitHub Actions.

1. Merge conventional commits into `main`.
2. Review and merge the release pull request maintained by Release Please.
3. The resulting GitHub release triggers publication of
   `@compas-dev/compas-threejs-ts` through npm Trusted Publishing.

The first public release is pinned to `1.0.0` in
`release-please-config.json`. Remove `release-as` and `bootstrap-sha` from that
file after the first release so later versions are derived from conventional
commits.

## One-time npm setup

npm requires the package to exist before a Trusted Publisher can be attached.
Bootstrap `@compas-dev/compas-threejs-ts` once while authenticated as a member
of the `compas-dev` npm organization, then configure its GitHub Actions Trusted
Publisher with:

- organization or user: `compas-dev`
- repository: `compas_threejs_ts`
- workflow: `release.yml`
- environment: `npm`

The matching protected GitHub environment already exists and only permits
deployments from `main`. The release workflow uses OIDC and does not require an
`NPM_TOKEN` secret.
