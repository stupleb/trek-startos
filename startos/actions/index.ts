import { sdk } from '../sdk'
import { approveAccess } from './approveAccess'
import { configure } from './configure'
import { manageSmtp } from './manageSmtp'
import { requestAccess } from './requestAccess'
import { resetAdminPassword } from './resetAdminPassword'
import { revokeAccess } from './revokeAccess'
import { primaryUrl } from './setPrimaryUrl'

export const actions = sdk.Actions.of()
  .addAction(resetAdminPassword)
  .addAction(primaryUrl.action)
  .addAction(configure)
  .addAction(manageSmtp)
  .addAction(requestAccess)
  .addAction(approveAccess)
  .addAction(revokeAccess)
