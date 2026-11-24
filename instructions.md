# TREK

## Documentation

- [TREK wiki](https://github.com/liketrek/TREK/wiki) ([source](https://github.com/liketrek/TREK/tree/main/wiki)) — the upstream user and admin guide: trips, collaboration, integrations, MCP and admin settings.

## Getting set up

1. Start TREK. Its first start takes a little longer while it prepares its database.
2. Run **Reset Admin Password** and keep the default email, `admin@trek.local`. It shows a password.
3. Open the **Web UI** and sign in with that email and password. TREK asks you to choose your own password straight away. You can change the email under **Settings → Account** in TREK afterwards.
4. Run **Set Primary URL** and pick the address you and your travel companions will open TREK at. Pick it before anyone sets up a passkey: passkeys only work at the address they were made on.
5. Invite people from **Admin → Users** in TREK. Open sign-up is off, so an invite link is how others join. You can turn sign-up on under **Admin → Settings** if you want it.

## Using TREK

### Web UI

The web app, and the same address on a phone, which you can add to the home screen to use TREK offline. TREK's API and its MCP endpoint for AI apps (`/mcp` on the same address) live here too. MCP and TREK's other add-ons are off until an admin turns them on under **Admin → Addons**.

### Actions

- **Reset Admin Password** — when an admin is locked out. Enter the account's email: it gets a new password, admin rights and a forced password change. With an email no account has, it creates a new admin instead.
- **Set Primary URL** — the address TREK treats as its own: for passkeys, MCP sign-in, calendar subscription links and links in its emails. Choosing an address with a different host name later means everyone sets up their passkeys again.
- **Configure** — three switches, all off to start with:
  - **liketrek place search and routing** — TREK's own hosted search, which finds more restaurants, shops and hotels than OpenStreetMap alone and plans routes. Your server then sends liketrek what people search for and the stops of their routes. Booking wallet passes need it too.
  - **Plugins** — lets admins install plugins under **Admin → Plugins**. Plugins are code from other people; install only ones you trust.
  - **Allow local services** — needed before anyone can connect Immich, AirTrail, Dawarich, a document store or a webhook that runs on this server or your home network. It applies to every TREK user.
- **Configure SMTP** — lets TREK send email for password resets, invitations and notifications. Use your StartOS email settings or another server. While it's set, it replaces the mail settings in TREK's **Admin → Settings**.

### Connecting other services

Immich, AirTrail and Dawarich connect from inside TREK: turn on **Allow local services**, switch the add-on on under **Admin → Addons**, then each person enters the service's address and an API key of their own under **Settings → Integrations**.

When another service on this server asks to read trips in TREK, a task appears here on TREK. Running it lets you pick which TREK account it may read, or deny the request. The key it gets can only read, and it shows up in that account's **Settings → Integrations**, where it can be deleted.

### Searches and your home IP

TREK looks things up on the internet by itself: places, routes, weather and exchange rates. If you publish TREK through a tunnel to keep your home IP private, send TREK's outbound traffic through that tunnel too, or those services see your home IP. If you use a tunnel for another reason, there is nothing to change.
