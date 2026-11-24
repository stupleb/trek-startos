import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '5.2.0:0',
  releaseNotes: {
    en_US: 'Initial release of TREK 5.2.0 for StartOS.',
    es_ES: 'Primera versión de TREK 5.2.0 para StartOS.',
    de_DE: 'Erste Veröffentlichung von TREK 5.2.0 für StartOS.',
    pl_PL: 'Pierwsze wydanie TREK 5.2.0 dla StartOS.',
    fr_FR: 'Première version de TREK 5.2.0 pour StartOS.',
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
