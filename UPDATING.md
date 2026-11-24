# Updating the upstream version

Upstream is the `mauriceboe/trek` image on Docker Hub, built by upstream's release workflow from `liketrek/TREK`. Its tags are the release version without a `v` (`5.2.0`), alongside the moving `latest`, `5`, `5.2` and `latest-pre`.

## Determining the upstream version

The pin is `images.trek.source.dockerTag` in `startos/manifest/index.ts`.

Take minor releases (`x.y.0`) and any patch release that fixes a security advisory; skip other patch releases.

```bash
gh release list -R liketrek/TREK --exclude-pre-releases --limit 10
gh api repos/liketrek/TREK/security-advisories --jq '.[] | [.published_at, .severity, .vulnerabilities[0].patched_versions] | @tsv'
```

Confirm the tag exists for both arches before pinning it:

```bash
curl -s https://hub.docker.com/v2/repositories/mauriceboe/trek/tags/<version> | jq '[.images[].architecture]'
```

## Applying the bump

1. Set `dockerTag` to `mauriceboe/trek:<version>`.
2. Set `version` in `startos/versions/current.ts` to `<version>:0`.
3. Read the release notes for changes to the tables the package writes: `app_settings` (`closeRegistration`), `users` (`listTrekUsers`) and `mcp_tokens` (`insertDependentKey`, `existingKeyIds`, `deleteKeys`), all in `startos/utils.ts`, and for changes to `server/reset-admin.js`. Check any migration that touches them in `server/src/db/migrations/`.
