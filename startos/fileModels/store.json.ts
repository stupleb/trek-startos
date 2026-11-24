import { FileHelper, smtpShape, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const dependentKey = z.looseObject({
  packageId: z.string(),
  keyHash: z.string(),
  keyPrefix: z.string(),
  scopes: z.array(z.string()),
  label: z.string().nullish(),
  userId: z.number().nullable(),
  keyId: z.number().nullable(),
})
export type DependentKey = z.infer<typeof dependentKey>

const shape = z.looseObject({
  primaryUrl: z.string().catch(''),
  smtp: smtpShape,
  liketrekServices: z.boolean().catch(false),
  plugins: z.boolean().catch(false),
  localServices: z.boolean().catch(false),
  // A null keyId is a request the user has not yet approved.
  dependentKeys: z.array(dependentKey).catch([]),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: './store.json' },
  shape,
)
