import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { getRandomPassword, resetAdmin, withTrek } from '../utils'

const { InputSpec, Value } = sdk

export const resetAdminPassword = sdk.Action.withInput(
  'reset-admin-password',

  async () => ({
    name: i18n('Reset Admin Password'),
    description: i18n(
      'Give a TREK account a new random password and make it an admin, or create a new admin account if no account has this email. TREK asks for a new password at the next sign-in.',
    ),
    warning: i18n(
      "Replaces the account's password and signs it out everywhere.",
    ),
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  InputSpec.of({
    email: Value.text({
      name: i18n('Email'),
      description: i18n(
        'The email of the account to reset. TREK created its first admin as admin@trek.local.',
      ),
      required: true,
      default: 'admin@trek.local',
      inputmode: 'email',
    }),
  }),

  async () => null,

  async ({ effects, input }) => {
    const email = input.email.trim()
    const password = getRandomPassword()
    await withTrek(effects, (sub) => resetAdmin(sub, email, password))

    return {
      version: '1',
      title: i18n('Admin Login'),
      message: i18n(
        'Sign in to TREK with this email and password. TREK then asks you to choose a new password.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Email'),
            description: null,
            value: email,
            masked: false,
            copyable: true,
            qr: false,
            launchable: false,
          },
          {
            type: 'single',
            name: i18n('Password'),
            description: null,
            value: password,
            masked: true,
            copyable: true,
            qr: false,
            launchable: false,
          },
        ],
      },
    }
  },
)
