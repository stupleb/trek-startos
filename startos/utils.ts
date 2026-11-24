import { SubContainer, T, utils } from '@start9labs/start-sdk'
import { createHash } from 'crypto'
import { DependentKey, storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { manifest } from './manifest'
import { sdk } from './sdk'

export const uiPort = 3000
export const uiHostId = 'main'
export const uiInterfaceId = 'ui'

const dbFile = '/app/data/travel.db'

export const trekMounts = sdk.Mounts.of()
  .mountVolume({
    volumeId: 'data',
    subpath: null,
    mountpoint: '/app/data',
    readonly: false,
  })
  .mountVolume({
    volumeId: 'uploads',
    subpath: null,
    mountpoint: '/app/uploads',
    readonly: false,
  })

type Sub = SubContainer<typeof manifest>

export const getRandomPassword = () =>
  utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 24 })

export const smtpEnv = (smtp: T.SmtpValue | null): Record<string, string> =>
  smtp
    ? {
        SMTP_HOST: smtp.host,
        SMTP_PORT: String(smtp.port),
        SMTP_FROM: smtp.from,
        ...(smtp.username && { SMTP_USER: smtp.username }),
        ...(smtp.password && { SMTP_PASS: smtp.password }),
      }
    : {}

const noDatabase = 3

// Runs as node, TREK's own user: a root-owned -wal or -shm file would lock TREK out of its database.
async function runNode(sub: Sub, code: string, env: Record<string, string>) {
  const res = await sub.exec(['node', '-e', code], {
    cwd: '/app/server',
    user: 'node',
    env,
    timeout: 60_000,
  })
  if (res.exitCode === noDatabase) {
    throw new Error(
      i18n(
        'TREK has not created its database yet. Start TREK once, then try again.',
      ),
    )
  }
  if (res.exitCode !== 0) {
    throw new Error(
      res.stderr.toString().trim() || res.stdout.toString().trim(),
    )
  }
  return res.stdout.toString()
}

const dbScript = (body: string) => `
const file = ${JSON.stringify(dbFile)};
if (!require('fs').existsSync(file)) process.exit(${noDatabase});
const db = new (require('better-sqlite3'))(file);
db.pragma('busy_timeout = 5000');
const input = JSON.parse(process.env.STARTOS_INPUT);
const result = (() => { ${body} })();
db.close();
process.stdout.write(JSON.stringify(result ?? null));
`

const queryTrek = async <R>(sub: Sub, body: string, input: unknown = null) =>
  JSON.parse(
    await runNode(sub, dbScript(body), {
      STARTOS_INPUT: JSON.stringify(input),
    }),
  ) as R

export const withTrek = <R>(effects: T.Effects, fn: (sub: Sub) => Promise<R>) =>
  sdk.SubContainer.withTemp(
    effects,
    { imageId: 'trek' },
    trekMounts,
    'trek-db',
    fn,
  )

// TREK's own recovery script: resets the account with this email, or creates it, as an admin who must pick a new password at sign-in.
export async function resetAdmin(sub: Sub, email: string, password: string) {
  await runNode(
    sub,
    `if (!require('fs').existsSync(${JSON.stringify(dbFile)})) process.exit(${noDatabase}); require('/app/server/reset-admin.js')`,
    { RESET_ADMIN_EMAIL: email, RESET_ADMIN_PASSWORD: password },
  )
}

// Fills the setting only while unset, so an admin who opens registration in TREK keeps it open.
export const closeRegistration = (sub: Sub) =>
  queryTrek(
    sub,
    `db.prepare("INSERT OR IGNORE INTO app_settings (key, value) VALUES ('password_registration', 'false')").run()`,
  )

export type TrekUser = { id: number; username: string; email: string }

export const listTrekUsers = (sub: Sub) =>
  queryTrek<TrekUser[]>(
    sub,
    `return db.prepare("SELECT id, username, email FROM users ORDER BY role = 'admin' DESC, lower(username)").all()`,
  )

// The scopes TREK's read-only API accepts on a key.
export const apiScopes = {
  trips: 'trips',
  days: 'days',
  places: 'places',
  notes: 'notes',
  reservations: 'reservations',
  accommodations: 'accommodations',
  travellers: 'travellers',
  'bucket-list': 'bucket-list',
  stats: 'stats',
}

// TREK stores sha256(key) in hex; a user holds at most ten keys. Null when the account is gone.
export const insertDependentKey = (
  sub: Sub,
  key: DependentKey,
  userId: number,
) =>
  queryTrek<number | 'full' | null>(
    sub,
    `
if (!db.prepare('SELECT 1 FROM users WHERE id = ?').get(input.userId)) return null;
if (db.prepare("SELECT count(*) AS n FROM mcp_tokens WHERE user_id = ? AND kind = 'api'").get(input.userId).n >= 10) return 'full';
return Number(db.prepare("INSERT INTO mcp_tokens (user_id, name, token_hash, token_prefix, kind, scope_mode, api_scopes) VALUES (?, ?, ?, ?, 'api', 'limited', ?)").run(input.userId, input.name, input.keyHash, input.keyPrefix, JSON.stringify(input.scopes)).lastInsertRowid);
`,
    {
      userId,
      name: `StartOS: ${requesterName(key)}`.slice(0, 100),
      keyHash: key.keyHash,
      keyPrefix: key.keyPrefix,
      scopes: key.scopes,
    },
  )

export const existingKeyIds = (sub: Sub, keyIds: number[]) =>
  queryTrek<number[]>(
    sub,
    `return input.filter((id) => db.prepare("SELECT 1 FROM mcp_tokens WHERE id = ? AND kind = 'api'").get(id));`,
    keyIds,
  )

const deleteKeys = (sub: Sub, keyIds: number[]) =>
  queryTrek(
    sub,
    `for (const id of input) db.prepare("DELETE FROM mcp_tokens WHERE id = ? AND kind = 'api'").run(id);`,
    keyIds,
  )

export function accessRequestId(
  key: Pick<DependentKey, 'packageId' | 'keyHash' | 'scopes'>,
): string {
  return createHash('sha256')
    .update(
      JSON.stringify([key.packageId, key.keyHash, [...key.scopes].sort()]),
    )
    .digest('hex')
}

export const accessTaskId = (requestId: string) => `access-request:${requestId}`

export const requesterName = (
  key: Pick<DependentKey, 'packageId' | 'label'>,
) => (key.label ? `${key.packageId} (${key.label})` : key.packageId)

let dependentKeyQueue: Promise<void> = Promise.resolve()

export function withDependentKeyLock<R>(
  operation: () => Promise<R>,
): Promise<R> {
  const result = dependentKeyQueue.then(operation)
  dependentKeyQueue = result.then(
    () => undefined,
    () => undefined,
  )
  return result
}

export async function dropDependentKeys(
  effects: T.Effects,
  sub: Sub,
  match: (key: DependentKey) => boolean,
): Promise<void> {
  const dropped = (
    (await storeJson.read((s) => s.dependentKeys).once()) ?? []
  ).filter(match)
  if (!dropped.length) return

  const keyIds = dropped.flatMap((k) => (k.keyId !== null ? [k.keyId] : []))
  if (keyIds.length) await deleteKeys(sub, keyIds)
  const pending = dropped.filter((k) => k.keyId === null)
  if (pending.length) {
    await sdk.action.clearTask(
      effects,
      ...pending.map((k) => accessTaskId(accessRequestId(k))),
    )
  }

  const hashes = new Set(dropped.map((k) => k.keyHash))
  await storeJson.update(
    effects,
    (s) =>
      s && {
        ...s,
        dependentKeys: s.dependentKeys.filter((k) => !hashes.has(k.keyHash)),
      },
  )
}
