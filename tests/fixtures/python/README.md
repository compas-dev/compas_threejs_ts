# Python-generated protobuf fixtures

These fixtures prove wire compatibility between Python `compas_pb` 1.x and
`@gramaziokohler/compas-pb-ts` 2.x.

They were generated from the canonical Python repository at version 1.1.0. The
envelope wire version is 1.0.0. Protobuf serialization uses deterministic map
ordering, and files are base64-encoded so fixture changes are reproducible,
reviewable, and portable in Git.

Regenerate them in an environment containing `compas_pb >=1,<2` and COMPAS:

```bash
python tests/fixtures/python/generate.py
```

Commit changes to fixture files and `manifest.json` together.
