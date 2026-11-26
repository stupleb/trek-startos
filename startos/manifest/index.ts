import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'trek',
  title: 'TREK',
  license: 'AGPL-3.0',
  packageRepo: 'https://github.com/stupleb/trek-startos',
  upstreamRepo: 'https://github.com/liketrek/TREK',
  marketingUrl: 'https://liketrek.com',
  donationUrl: 'https://ko-fi.com/mauriceboe',
  description: { short, long },
  volumes: ['startos', 'data', 'uploads'],
  images: {
    trek: {
      source: { dockerTag: 'mauriceboe/trek:5.2.1' },
      arch: ['x86_64', 'aarch64'],
    },
  },
})
