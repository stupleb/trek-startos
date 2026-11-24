import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { uiHostId, uiInterfaceId } from '../utils'

export const primaryUrl = sdk.setupPrimaryUrl({
  id: 'set-primary-url',
  hostId: uiHostId,
  interfaceId: uiInterfaceId,
  metadata: {
    name: i18n('Set Primary URL'),
    description: i18n(
      'Choose the address TREK treats as its own. Passkeys, MCP sign-in, calendar feed links and the links in its emails use it. A running TREK restarts to apply it.',
    ),
    warning: i18n(
      'Passkeys belong to the host name of this address. Choosing one with another host name means everyone signs in with their password and sets up their passkeys again.',
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },
  field: {
    name: i18n('Primary URL'),
    description: i18n(
      'Pick the address you and your travel companions will open TREK at. Until you pick one, TREK uses a public domain if this interface has one, otherwise its .local address.',
    ),
  },
  get: storeJson.read((s) => s.primaryUrl),
  set: (effects, url) => storeJson.merge(effects, { primaryUrl: url }),
  ssl: true,
})
