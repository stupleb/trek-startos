import { DependentKey, storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  accessRequestId,
  dropDependentKeys,
  insertDependentKey,
  listTrekUsers,
  requesterName,
  withDependentKeyLock,
  withTrek,
} from '../utils'

const { InputSpec, Value, Variants } = sdk

export const approveAccess = sdk.Action.withInput(
  'approve-access',

  async () => ({
    name: i18n('Approve Access'),
    description: i18n(
      "Let a service read one TREK account's trips with the scopes it asked for, or deny its request",
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'hidden',
  }),

  async ({ caller }) => {
    if (caller !== null)
      throw new Error(i18n('Only the user can approve access'))
    return InputSpec.of({
      request: Value.dynamicSelect(async () => {
        const pending = (
          (await storeJson.read((s) => s.dependentKeys).once()) ?? []
        ).filter((k) => k.keyId === null)
        return {
          name: i18n('Request'),
          description: i18n(
            'The service asking, and what it would be allowed to read',
          ),
          values: Object.fromEntries(
            pending.map((k) => [
              accessRequestId(k),
              `${requesterName(k)}: ${k.scopes.join(', ')}`,
            ]),
          ),
          default: null,
        }
      }),
      decision: Value.union({
        name: i18n('Decision'),
        description: i18n(
          'If the chosen account already has a key from this service, approving replaces it',
        ),
        default: 'approve',
        variants: Variants.of({
          approve: {
            name: i18n('Approve'),
            spec: InputSpec.of({
              user: Value.dynamicSelect(async ({ effects }) => {
                const keys = (
                  (await storeJson.read((s) => s.dependentKeys).once()) ?? []
                ).filter((k) => k.keyId !== null)
                const users = await withTrek(effects, listTrekUsers)
                return {
                  name: i18n('TREK Account'),
                  description: i18n(
                    'The account whose trips the service can read',
                  ),
                  values: Object.fromEntries(
                    users.map((u) => {
                      const account = `${u.username} (${u.email})`
                      const holders = keys
                        .filter((k) => k.userId === u.id)
                        .map(requesterName)
                      return [
                        String(u.id),
                        holders.length
                          ? `${account} · ${i18n('has a key from ${services}', { services: holders.join(', ') })}`
                          : account,
                      ]
                    }),
                  ),
                  default: null,
                }
              }),
            }),
          },
          deny: { name: i18n('Deny'), spec: InputSpec.of({}) },
        }),
      }),
    })
  },

  async () => null,

  async ({ effects, input, caller }) => {
    if (caller !== null)
      throw new Error(i18n('Only the user can approve access'))
    return withDependentKeyLock(() =>
      withTrek(effects, async (sub) => {
        const request = (
          (await storeJson.read((s) => s.dependentKeys).once()) ?? []
        ).find((k) => accessRequestId(k) === input.request && k.keyId === null)
        if (!request) throw new Error(i18n('That request is no longer pending'))

        if (input.decision.selection === 'deny') {
          await dropDependentKeys(
            effects,
            sub,
            (k) => accessRequestId(k) === input.request,
          )
          return null
        }

        const userId = Number(input.decision.value.user)
        const keyId = await insertDependentKey(sub, request, userId)
        if (keyId === 'full') {
          throw new Error(
            i18n(
              'This TREK account already has 10 API keys. Delete one under Settings → Integrations in TREK, then approve again.',
            ),
          )
        }
        if (keyId === null) {
          throw new Error(i18n('That TREK account no longer exists'))
        }
        await storeJson.update(
          effects,
          (s) =>
            s && {
              ...s,
              dependentKeys: s.dependentKeys.map((k) =>
                accessRequestId(k) === input.request
                  ? { ...k, userId, keyId }
                  : k,
              ),
            },
        )

        const replaces = (k: DependentKey) =>
          k.packageId === request.packageId &&
          k.userId === userId &&
          k.keyId !== null &&
          k.keyHash !== request.keyHash
        const replacing = (
          (await storeJson.read((s) => s.dependentKeys).once()) ?? []
        ).some(replaces)
        await dropDependentKeys(effects, sub, replaces)

        return replacing
          ? {
              version: '1' as const,
              title: i18n('Access Approved'),
              message: i18n(
                'This replaced the key ${packageId} already had in this account.',
                { packageId: request.packageId },
              ),
              result: null,
            }
          : null
      }),
    )
  },
)
