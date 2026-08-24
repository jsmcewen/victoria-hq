# Victoria HQ on Home Assistant OS

Chores, stars, and rewards for the kids’ iPads, running on your home server.
Victoria can still run the board if you paste an xAI API key.

**Sign-in only sticks over https.** A LAN address like `http://homeassistant.local:8080` will load the page, then forget you after login. Put a real https hostname in front of it (Duck DNS + Nginx Proxy Manager, or Cloudflare Tunnel).

---

## What to copy

Put **this whole folder** on the Home Assistant machine. Two good paths:

| How you run it | Folder on the HA machine |
| --- | --- |
| Home Assistant add-on (recommended) | `/addons/victoria_hq` |
| Portainer / Docker Compose | `/share/victoria-hq` |

Samba: enable the Samba add-on, then from a computer open `\\\\homeassistant\\addons` or `\\\\homeassistant\\share`.

Do not copy `node_modules`. The image builds itself.

---

## Path A — local add-on (Home Assistant OS)

1. Copy this project into `addons/victoria_hq` (folder name can match that).
2. In Home Assistant: **Settings → Add-ons → Add-on store → ⋮ → Check for updates**.
3. Refresh. **Victoria HQ** appears under Local add-ons.
4. Install. First install compiles the app and can take 10–20 minutes (Pi / NUC).
5. Open **Configuration** and set:
   - **public_url** — the https URL the iPads will open, e.g. `https://chores.yourname.duckdns.org`
   - **xai_api_key** — from [console.x.ai](https://console.x.ai) if you want Victoria to assign chores in English (optional; the board still works without it)
   - leave **database_url** and **better_auth_secret** blank unless you already run Postgres
6. Start the add-on. Open it from the add-on page, or from the iPads via the https URL.

Family data lives on the add-on’s disk. Back up Home Assistant as usual.

---

## Path B — Portainer compose

1. Copy this project to `/share/victoria-hq`.
2. Copy `env.example` to `.env` and set `BETTER_AUTH_URL` to the https URL.
3. Install the Portainer add-on (or Advanced SSH with protection mode off).
4. Create a stack from `docker-compose.yml` with that folder as the build context, or run `docker compose up -d --build` from the folder.

This path runs Postgres next to the app. First build also takes several minutes.

---

## https for the iPads

Pick one:

1. **Duck DNS** add-on + **Nginx Proxy Manager** add-on  
   Point a hostname (for example `chores.yourname.duckdns.org`) at Home Assistant. In Proxy Manager, forward that hostname to `homeassistant:8080`, request a Let’s Encrypt certificate, and force SSL.
2. **Cloudflare Tunnel** add-on  
   Publish hostname → `http://homeassistant:8080`.

Then set **public_url** / `BETTER_AUTH_URL` to that exact `https://…` address (no trailing slash).

Nabu Casa remote UI only fronts Home Assistant itself, not this app’s port — don’t use that URL here.

---

## First morning with the kids

1. Open the https URL on a parent phone or the first iPad.
2. **Create the family account** (email + password, 8+ characters).
3. Add crew, missions, and store items — or ask Victoria in HQ.
4. On each kid iPad: Safari → Share → **Add to Home Screen**, then sign in with the same family account and pick their portrait.

Each family account is its own company. Don’t share the parent login if you ever host more than one household.

---

## Notes

- Leave **database_url** empty on the add-on unless you already have Postgres. Empty = on-disk family database under `/data`.
- If sign-in immediately bounces back to the landing page, the iPad is not on the https hostname in **public_url**.
- Raspberry Pi 4 with 2 GB RAM may struggle on the first image build. 4 GB or a NUC is comfortable.
- Updating: copy the new files over the same folder, then rebuild / update the add-on.
