import { z } from '@start9labs/start-sdk'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  accessRequestId,
  accessTaskId,
  apiScopes,
  requesterName,
  withDependentKeyLock,
} from '../utils'
import { approveAccess } from './approveAccess'

const { InputSpec, Value } = sdk

export const requestAccess = sdk.Action.withInput(
  'request-access',

  async () => ({
    name: i18n('Request Access'),
    description: i18n(
      'Ask for a read-only API key to one TREK account, with a key the requesting service generated',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'hidden',
    access: 'dependent',
  }),

  InputSpec.of({
    keyHash: Value.text({
      name: i18n('Key Hash'),
      description: i18n('SHA-256 of the API key, in lowercase hex'),
      required: true,
      default: null,
      patterns: [
        {
          regex: '^[0-9a-f]{64}$',
          description: i18n('Must be 64 lowercase hex characters'),
        },
      ],
    }),
    keyPrefix: Value.text({
      name: i18n('Key Prefix'),
      description: i18n(
        "The key's first 13 characters, which TREK shows in its list of keys",
      ),
      required: true,
      default: null,
      patterns: [
        {
          regex: '^trek_[0-9a-f]{8}$',
          description: i18n(
            'Must be trek_ followed by 8 lowercase hex characters',
          ),
        },
      ],
    }),
    scopes: Value.multiselect({
      name: i18n('Scopes'),
      default: [],
      values: apiScopes,
    }),
    label: Value.hidden(
      z
        .string()
        .refine(
          (label) => label.length <= 64 && !/[<>\x00-\x1f\x7f]/.test(label),
          i18n(
            'At most 64 characters, without angle brackets or control characters',
          ),
        )
        .nullish(),
    ),
  }),

  async () => null,

  async ({ effects, input, caller }) => {
    if (!caller) throw new Error(i18n('Only a service can request access'))
    if (!input.scopes.length) throw new Error(i18n('Choose at least one scope'))

    return withDependentKeyLock(async () => {
      const existing = (
        (await storeJson.read((s) => s.dependentKeys).once()) ?? []
      ).find((k) => k.keyHash === input.keyHash)
      if (existing) {
        if (
          existing.packageId !== caller ||
          existing.scopes.length !== input.scopes.length ||
          !input.scopes.every((s) => existing.scopes.includes(s))
        ) {
          throw new Error(i18n('This key was already requested'))
        }
        return null
      }

      const request = {
        packageId: caller,
        keyHash: input.keyHash,
        keyPrefix: input.keyPrefix,
        scopes: input.scopes,
        label: input.label?.trim() || null,
        userId: null,
        keyId: null,
      }
      const requestId = accessRequestId(request)
      await storeJson.update(
        effects,
        (s) => s && { ...s, dependentKeys: [...s.dependentKeys, request] },
      )
      await sdk.action.createOwnTask(effects, approveAccess, 'important', {
        reason: i18n('${packageId} is asking to read trips in a TREK account', {
          packageId: requesterName(request),
        }),
        replayId: accessTaskId(requestId),
        when: { condition: 'input-not-matches', once: true },
        input: {
          kind: 'partial',
          accept: [{ request: requestId }],
          set: { request: requestId },
        },
      })

      return null
    })
  },
)
