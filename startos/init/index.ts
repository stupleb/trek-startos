import { actions } from '../actions'
import { primaryUrl } from '../actions/setPrimaryUrl'
import { restoreInit } from '../backups'
import { dependencies } from '../dependencies'
import { i18n } from '../i18n'
import { setInterfaces } from '../interfaces'
import { sdk } from '../sdk'
import { versionGraph } from '../versions'
import { seedFiles } from './seedFiles'

export const init = sdk.setupInit(
  restoreInit,
  versionGraph,
  seedFiles,
  setInterfaces,
  actions,
  primaryUrl.setupTask('important', {
    reason: i18n(
      'Choose the address TREK treats as its own. Passkeys and MCP sign-in depend on it.',
    ),
  }),
  dependencies,
)

export const uninit = sdk.setupUninit(versionGraph)
