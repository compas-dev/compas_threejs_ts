<!-- Thank you for your pull request! -->
<!-- Please start by describing your change in a few sentences. -->
<!-- You can erase any parts of this template not applicable to your Pull Request. -->

### What type of change is this?

This project uses [Conventional Commits](https://www.conventionalcommits.org).
Release Please derives `CHANGELOG.md` and the next version number from them, so
the pull request title **and** every commit subject need a type prefix.

- [ ] `fix:` Bug fix in a **backwards-compatible** manner (patch release).
- [ ] `feat:` New feature in a **backwards-compatible** manner (minor release).
- [ ] `feat!:` or `fix!:` Breaking change: bug fix or new feature that involves
      incompatible API changes (major release).
- [ ] `build:`, `chore:`, `ci:`, `docs:`, `perf:`, `refactor:`, `style:`,
      `test:` Other (documentation, configuration, tooling, etc).

<!-- For example:
       fix: reject non-renderable COMPAS objects
       feat(viewer): add instance-based public API
       feat!: drop the legacy global viewer entry point

     A scope is optional. Mark a breaking change with `!` after the type, and
     describe the migration in a `BREAKING CHANGE:` footer in the commit body.

     Do not edit CHANGELOG.md by hand: Release Please generates it. If the
     change should not appear in the changelog at all, apply the
     `no changelog` label. -->

### Checklist

_Put an `x` in the boxes that apply. You can also fill these out after creating the PR. If you're unsure about any of them, don't hesitate to ask. We're here to help! This is simply a reminder of what we are going to look for before merging your code._

- [ ] The pull request title and my commit subjects follow Conventional
      Commits, or I applied the `no changelog` label.
- [ ] I ran `npm run check` on my computer and it's all green (formatting,
      lint, types, unit tests, and both builds).
- [ ] I ran the browser tests with `npm run test:browser`, and verified that a
      packed consumer still builds with `npm run test:package`.
- [ ] I exported new public API from `src/library/index.ts`, and kept it
      importable as `@compas-dev/compas-threejs-ts`.
- [ ] I have added tests that prove my fix is effective or that my feature
      works.
- [ ] I have added necessary documentation (if appropriate): `docs/support-matrix.md`
      for new geometry or commands, `docs/compatibility.md` for public API or
      runtime support changes, and `docs/dependencies.md` when a dependency is
      added, removed, bundled, or externalized.
