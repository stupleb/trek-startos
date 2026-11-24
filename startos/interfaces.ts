import { primaryUrl } from './actions/setPrimaryUrl'
import { i18n } from './i18n'
import { sdk } from './sdk'
import { uiHostId, uiInterfaceId, uiPort } from './utils'

export const setInterfaces = sdk.setupInterfaces(async ({ effects }) => {
  const uiOrigin = await sdk.MultiHost.of(effects, uiHostId).bindPort(uiPort, {
    protocol: 'http',
  })
  const ui = sdk.createInterface(effects, {
    name: i18n('Web UI'),
    id: uiInterfaceId,
    description: i18n(
      'The TREK web app, its phone web app, the API and the MCP endpoint at /mcp.',
    ),
    type: 'ui',
    masked: false,
    schemeOverride: null,
    username: null,
    path: '',
    query: {},
    preferredLauncherAddress: await primaryUrl.bestUsable(effects).const(),
  })

  return [await uiOrigin.export([ui])]
})
