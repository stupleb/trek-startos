import { T } from '@start9labs/start-sdk'
import { primaryUrl } from './actions/setPrimaryUrl'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  closeRegistration,
  dropDependentKeys,
  existingKeyIds,
  smtpEnv,
  trekMounts,
  uiPort,
  withDependentKeyLock,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting TREK'))

  const settings = await storeJson
    .read((s) => ({
      smtp: s.smtp,
      liketrekServices: s.liketrekServices,
      plugins: s.plugins,
      localServices: s.localServices,
    }))
    .const(effects)
  if (!settings) throw new Error(i18n('The package settings file is missing'))

  let smtp: T.SmtpValue | null = null
  if (settings.smtp.selection === 'system') {
    smtp = await sdk.getSystemSmtp(effects).const()
    const customFrom = settings.smtp.value.customFrom
    if (smtp && customFrom) smtp = { ...smtp, from: customFrom }
  } else if (settings.smtp.selection === 'custom') {
    const { host, from, username, password, security } =
      settings.smtp.value.provider.value
    smtp = {
      host,
      from,
      username,
      password,
      port: Number(security.value.port),
      security: security.selection,
    }
  }

  const appUrl = await primaryUrl.bestUsable(effects).const()

  const trekSub = sdk.SubContainer.of(
    effects,
    { imageId: 'trek' },
    trekMounts,
    'trek',
  )

  return (
    sdk.Daemons.of(effects)
      .addDaemon('trek', {
        subcontainer: trekSub,
        exec: {
          command: sdk.useEntrypoint(),
          runAsInit: true,
          env: {
            ...(appUrl && { APP_URL: appUrl }),
            TREK_SERVICES: settings.liketrekServices ? 'auto' : 'off',
            TREK_PLACES_ENABLED: String(settings.liketrekServices),
            TREK_PLUGINS_ENABLED: String(settings.plugins),
            ALLOW_INTERNAL_NETWORK: String(settings.localServices),
            ...smtpEnv(smtp),
          },
        },
        ready: {
          display: i18n('Web Interface'),
          gracePeriod: 120_000,
          fn: () =>
            sdk.healthCheck.checkWebUrl(
              effects,
              `http://127.0.0.1:${uiPort}/api/health`,
              {
                successMessage: i18n('The web interface is ready'),
                errorMessage: i18n('The web interface is not ready'),
              },
            ),
        },
        requires: [],
      })
      .addOneshot('close-registration', {
        subcontainer: trekSub,
        exec: {
          fn: async (sub) => {
            await closeRegistration(sub)
            return null
          },
        },
        requires: ['trek'],
      })
      // Forgets keys of uninstalled services, and records whose key a user deleted in TREK.
      .addOneshot('reconcile-dependent-keys', {
        subcontainer: trekSub,
        exec: {
          fn: (sub) =>
            withDependentKeyLock(async () => {
              const installed = new Set(await sdk.getInstalledPackages(effects))
              await dropDependentKeys(
                effects,
                sub,
                (k) => !installed.has(k.packageId),
              )
              const keyIds = (
                (await storeJson.read((s) => s.dependentKeys).once()) ?? []
              ).flatMap((k) => (k.keyId !== null ? [k.keyId] : []))
              const live = new Set(await existingKeyIds(sub, keyIds))
              await dropDependentKeys(
                effects,
                sub,
                (k) => k.keyId !== null && !live.has(k.keyId),
              )
              return null
            }),
        },
        requires: ['trek'],
      })
  )
})
