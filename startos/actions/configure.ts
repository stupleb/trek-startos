import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const { InputSpec, Value } = sdk

const inputSpec = InputSpec.of({
  liketrekServices: Value.toggle({
    name: i18n('liketrek place search and routing'),
    description: i18n(
      "Search places, addresses and routes through TREK's hosted services at liketrek.com, which also sign wallet passes for bookings. Your server registers with them and sends them what people search for and the stops of routes. Off, searches go to OpenStreetMap's public servers instead and routes to public routing servers.",
    ),
    default: false,
  }),
  plugins: Value.toggle({
    name: i18n('Plugins'),
    description: i18n(
      "Let TREK's admins install plugins: third-party code from TREK's public plugin list, or uploaded by hand. Each plugin runs in its own process with the permissions the admin approves.",
    ),
    default: false,
  }),
  localServices: Value.toggle({
    name: i18n('Allow local services'),
    description: i18n(
      'Let TREK reach addresses on your network and on this server, such as Immich, AirTrail, Dawarich, Paperless-ngx or a notification webhook. This applies to everyone: any TREK user can then point an integration at a local address.',
    ),
    default: false,
  }),
})

export const configure = sdk.Action.withInput(
  'configure',

  async () => ({
    name: i18n('Configure'),
    description: i18n(
      'Choose what TREK may reach outside your server and whether plugins can run. A running TREK restarts to apply it.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) =>
    storeJson
      .read((s) => ({
        liketrekServices: s.liketrekServices,
        plugins: s.plugins,
        localServices: s.localServices,
      }))
      .once(),

  async ({ effects, input }) => storeJson.merge(effects, input),
)
