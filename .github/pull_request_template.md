<!-- Thank you for your pull request! Please describe your change in a few sentences. -->

The title must be a [conventional commit](https://www.conventionalcommits.org):
`fix:`, `feat:`, `feat!:` for a breaking change, or one of `build:` `chore:`
`ci:` `docs:` `perf:` `refactor:` `style:` `test:`. Release Please builds
`CHANGELOG.md` and the next version number from it. Apply the `no changelog`
label to skip. Running `npm install` enables a `commit-msg` hook that checks
your commits as you make them.

### Checklist

- [ ] `npm run check` is green (formatting, lint, types, unit tests, both builds).
- [ ] `npm run test:browser` and `npm run test:package` pass.
