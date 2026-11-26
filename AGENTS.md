# AGENTS.md

This is a StartOS service-package repository — it builds a `.s9pk` for StartOS.

Develop it inside a StartOS packaging workspace created by `start-cli s9pk init-workspace`,
which provides the packaging guide and agent context one level up. If you're reading this in a
bare clone with no workspace, the full guide is at <https://docs.start9.com/packaging>.

- `stupleb/dawarich-startos`'s Connect TREK depends on the `request-access`, `approve-access` and `revoke-access` actions and their inputs, on `apiScopes`, and on the `trek` daemon id as its health check: change any of them only together with a matching Dawarich release.
