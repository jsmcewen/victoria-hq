# Victoria HQ

Family chores, stars, and rewards for the kids’ iPads. Victoria is CEO.

This repo is the **home-server** build: a Dockerfile, a Home Assistant add-on, and Docker Compose. Sign-in uses email and password (Google / X from the Grok preview do not work on a home LAN).

**Sign-in only sticks over https.** Put Duck DNS + Nginx Proxy Manager, or a Cloudflare Tunnel, in front of the app. A LAN address like `http://homeassistant.local:8080` will load, then forget you after login.

Full install steps: [SELFHOST.md](./SELFHOST.md).

---

## Get it onto Home Assistant OS

1. Download this repository (Code → Download ZIP, or clone).
2. Copy the **contents** of the folder to the Samba **addons** share as `victoria_hq`  
   (`\\homeassistant\addons\victoria_hq`).
3. In Home Assistant: **Settings → Add-ons → Add-on store → ⋮ → Check for updates**.
4. Refresh. **Victoria HQ** appears under Local add-ons. Install (first build is 10–20 minutes).
5. Set **public_url** to the exact `https://…` hostname the iPads will open.
6. Optional: paste an [xAI API key](https://console.x.ai) so Victoria can run the board in English.
7. Start the add-on.

On the first iPad: create the family account, add the crew, then **Add to Home Screen**. Same login on every kid iPad; they pick their own portrait.

Portainer / Compose is Path B in `SELFHOST.md`.
