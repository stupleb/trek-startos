<p align="center">
  <img src="icon.svg" alt="TREK Logo" width="21%">
</p>

# TREK on StartOS

> Everything not listed in this document should behave the same as upstream
> TREK. If a feature, setting, or behavior is not mentioned here,
> the upstream documentation is accurate and fully applicable — see the
> Documentation section of `instructions.md` for links.

[TREK](https://github.com/liketrek/TREK) is a self-hosted, collaborative trip planner. This package runs the upstream image unmodified, closes open sign-up on a fresh install, switches off TREK's hosted search services and its plugin system by default, and lets another StartOS service such as Dawarich request a read-only TREK API key that you approve.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

The package runs upstream's own image with its own entrypoint, which hands the data folders to the `node` user and drops to it before starting the server.

| Property      | Value                                                            |
| ------------- | ---------------------------------------------------------------- |
| Image         | `mauriceboe/trek` (upstream, unmodified)                         |
| Architectures | x86_64, aarch64                                                  |
| Entrypoint    | upstream's (`dumb-init` as PID 1, then `trek-entrypoint`)        |
| Subcontainer  | `trek`; the actions open a temporary `trek-db` on the same image |
| Runs as       | `node` (uid 1000)                                                |

The package sets these environment variables and nothing else:

| Variable                 | Source                                                                                   |
| ------------------------ | ---------------------------------------------------------------------------------------- |
| `APP_URL`                | The primary URL (see [Actions](#actions))                                                |
| `TREK_SERVICES`          | `auto` with the liketrek switch on, `off` otherwise                                      |
| `TREK_PLACES_ENABLED`    | Follows the liketrek switch                                                              |
| `TREK_PLUGINS_ENABLED`   | Follows the plugins switch                                                               |
| `ALLOW_INTERNAL_NETWORK` | Follows the local-services switch                                                        |
| `SMTP_*`                 | **Configure SMTP**: host, port and from, plus user and password when the server has them |

TREK generates its own encryption key and JWT secret in its data folder on first start. The package never sets `ENCRYPTION_KEY`: TREK refuses to start when the variable differs from the key its data was encrypted with.

## Volume and Data Layout

Three volumes; the `data` and `uploads` folders are exactly the two upstream says to persist.

| Volume    | Mount point    | Contents                                                                                                                      |
| --------- | -------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `startos` | not mounted    | `store.json`, the package's own settings                                                                                      |
| `data`    | `/app/data`    | `travel.db` (SQLite, WAL), `.encryption_key`, `.jwt_secret`, logs, TREK's own backups, pre-migration database copies, plugins |
| `uploads` | `/app/uploads` | Files, photos, covers and avatars people upload                                                                               |

Before each update that brings database migrations, TREK copies `travel.db` to `pre-migrate-*.db` next to it and keeps the newest three. A database a newer TREK has migrated cannot be opened by an older one.

## File Models

One file model, `store.json` on the `startos` volume. TREK's own settings live in its database and are changed in its web interface, not by the package.

| Field                                          | Set by              | Read by                                    |
| ---------------------------------------------- | ------------------- | ------------------------------------------ |
| `primaryUrl`                                   | **Set Primary URL** | the daemon (`APP_URL`), the Open UI target |
| `smtp`                                         | **Configure SMTP**  | the daemon (`SMTP_*`)                      |
| `liketrekServices`, `plugins`, `localServices` | **Configure**       | the daemon's environment                   |
| `dependentKeys`                                | the access actions  | the access actions, the startup reconcile  |

The actions rewrite their own fields and keep the rest. A hand edit survives until the next run of the action that owns the field; the running daemon restarts when any field it reads changes.

## Dependencies

None declared. Another service may still ask TREK for a read-only API key through the hidden access actions (see [Actions](#actions)); that is a request you approve, not a dependency.

## Network Access and Interfaces

One interface serves everything TREK offers on a single port.

| Interface | Type | Port | Serves                                                                                 |
| --------- | ---- | ---- | -------------------------------------------------------------------------------------- |
| `ui`      | ui   | 3000 | the web app and phone web app, the WebSocket sync at `/ws`, the API, and MCP at `/mcp` |

Only addresses served over HTTPS are offered as the primary URL. TREK accepts requests on any of the interface's addresses; the primary URL decides what it names as its own: the OAuth issuer for MCP clients, the passkey domain (the URL's host name), calendar feed links and links in emails. Passkeys are bound to that host name, so moving the primary URL to another host name invalidates every enrolled passkey.

TREK starts outbound connections of its own: to OpenStreetMap's Nominatim and Overpass servers for place search, to public routing servers, to Open-Meteo for weather, to Frankfurter for exchange rates, to public holiday APIs, to Wikimedia for place pictures, and once a day to GitHub to check for a new release. With the liketrek switch on, place, address and route searches also go to `places.liketrek.com`, `photon.liketrek.com` and `valhalla.liketrek.com`, and the server registers there for an installation key. None of these carry who is searching.

With the local-services switch off, TREK refuses any integration address on a private network, which includes other services on this server.

## Installation and First-Run Flow

TREK creates its own first admin, `admin@trek.local`, with a random password on its first start, and writes that password once to its log. The package does not read the log; it raises a task pointing at **Reset Admin Password**, which sets a new random password and returns it.

1. Start TREK. Its first start runs every database migration, which takes several seconds.
2. Run **Reset Admin Password** with the default email. It shows the email and a new password.
3. Sign in. TREK makes the admin choose a new password before anything else.

After its first start, the package sets TREK's **Password Registration** setting to off, but only while it has never been set, so an admin who reopens registration in **Admin → Settings** keeps it open. New people join through invite links until then.

## Actions

**Set Primary URL** and **Configure SMTP** follow the standard patterns; what is specific to TREK is below.

**Reset Admin Password**

- **When:** on first install (its task), or when an admin is locked out.
- **Changes:** the account with the given email gets a new random password, the admin role and a forced password change, and every session it had is signed out. With no account at that email, it creates a new admin. It runs TREK's own `reset-admin.js` against the database, whether TREK is running or not.
- **Fails** with "TREK has not created its database yet" before TREK's first start.
- **Repeat safety:** safe; each run replaces the previous password.
- **Outputs:** the email and the password, masked.

**Set Primary URL**

- **When:** before setting up passkeys, an MCP client, calendar subscriptions or email.
- **Changes:** `APP_URL`; TREK restarts when the value actually changes. Choosing the address TREK already uses changes nothing.

**Configure**

- **Changes:** the three switches in [Image and Container Runtime](#image-and-container-runtime); TREK restarts when one changes.
- **liketrek place search and routing:** on, TREK registers with liketrek's servers on its first search and uses them for places, addresses, routes and wallet passes. Off, wallet passes are unavailable.
- **Plugins:** on, TREK's **Admin → Plugins** can install and run plugins. Turning it off stops every plugin; installed ones stay on disk.
- **Allow local services:** on for every user at once. Needed to connect Immich, AirTrail, Dawarich, a document store or a webhook on this server or your LAN.

**Configure SMTP**

- **Changes:** `SMTP_*`; while set, these override the mail settings in TREK's **Admin → Settings**. Disabled leaves TREK's own mail settings in charge.

**Request Access**, **Approve Access** and **Revoke Access** are hidden and not user-facing. Another service runs **Request Access** with the SHA-256 of a TREK API key it generated, that key's first 13 characters, and the read scopes it wants; the package raises a task on **Approve Access**, where the user picks the TREK account or denies. Approving writes the key into that account as a read-only API key named `StartOS: <service>`; it then appears under the account's **Settings → Integrations** in TREK, where it can be deleted. A TREK account holds at most ten API keys. **Revoke Access** deletes the service's key or withdraws its request.

## Tasks

| Task                 | Raised when                                                                               | Severity  | Cleared by                                                            |
| -------------------- | ----------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------- |
| Reset Admin Password | on install                                                                                | important | running the action once; never returns                                |
| Set Primary URL      | no primary URL is stored, or the stored one is no longer one of the interface's addresses | important | choosing an address; clears itself when the stored address comes back |
| Approve Access       | a service runs **Request Access**                                                         | important | approving or denying that request, or the service withdrawing it      |

None is critical: TREK always starts, and its controls stay available.

## Health Checks

| Check                  | Probes                         | Grace period |
| ---------------------- | ------------------------------ | ------------ |
| `trek` (Web Interface) | `GET /api/health` on port 3000 | 2 minutes    |

Failing after the grace period means TREK is not serving. Read the service log: a failed migration, an `ENCRYPTION_KEY` mismatch, or a database a newer TREK migrated all stop the start with a message naming the cause.

Two one-off steps run after the health check first passes, every start: `close-registration` (see [Installation and First-Run Flow](#installation-and-first-run-flow)), and `reconcile-dependent-keys`, which deletes the keys of services that are no longer installed and forgets keys an admin deleted in TREK.

## Backups and Restore

All three volumes are copied whole (`ofVolumes`) while StartOS has TREK stopped, so the SQLite database is captured at rest. Nothing is excluded. A restored TREK starts with the same accounts, trips, files, encryption key and API keys; nothing has to be re-entered.

TREK's own backup feature (**Admin → Backups**) writes zip files into the `data` volume, so they are in StartOS backups as well.

## Limitations and Differences

1. Open sign-up is off on a fresh install. Upstream leaves it on.
2. TREK's hosted place, address and route search, and wallet passes, are off by default. Place search then uses OpenStreetMap's public servers, which are slower and find fewer businesses.
3. Plugins are off by default.
4. Integrations that point at a private address, other StartOS services included, are refused until **Allow local services** is on.
5. OIDC single sign-on cannot be configured: TREK takes it only from environment variables, and the package does not set them yet.
6. TREK's daily check of GitHub for a new release cannot be switched off.
7. Changing the primary URL to another host name invalidates every enrolled passkey.

---

## Quick Reference for AI Consumers

```yaml
package_id: trek
image: mauriceboe/trek
architectures: [x86_64, aarch64]
subcontainers: [trek, trek-db]
volumes:
  startos: (not mounted)
  data: /app/data
  uploads: /app/uploads
file_models:
  - startos/store.json
startos_managed_env_vars:
  - APP_URL
  - TREK_SERVICES
  - TREK_PLACES_ENABLED
  - TREK_PLUGINS_ENABLED
  - ALLOW_INTERNAL_NETWORK
  - SMTP_HOST
  - SMTP_PORT
  - SMTP_FROM
  - SMTP_USER
  - SMTP_PASS
dependencies: none
interfaces:
  ui: { type: ui, port: 3000 }
actions:
  - reset-admin-password
  - set-primary-url
  - configure
  - manage-smtp
  - request-access
  - approve-access
  - revoke-access
tasks:
  - { action: reset-admin-password, severity: important }
  - { action: set-primary-url, severity: important }
  - { action: approve-access, severity: important }
health_checks:
  - trek
```
