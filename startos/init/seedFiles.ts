import { resetAdminPassword } from '../actions/resetAdminPassword'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  await storeJson.merge(effects, {})
  if (kind === 'install') {
    await sdk.action.createOwnTask(effects, resetAdminPassword, 'important', {
      reason: i18n(
        'Once TREK has started, get the password for its admin account, admin@trek.local',
      ),
    })
  }
})
