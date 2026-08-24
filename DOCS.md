# Victoria HQ

Family chores, stars, and rewards for the iPads. Victoria is CEO.

## Configuration

**public_url** (required)  
The https address the iPads open, for example `https://chores.yourname.duckdns.org`. Sign-in cookies will not stick on `http://192.168.x.x`.

**xai_api_key** (optional)  
An [xAI](https://console.x.ai) key so Victoria can assign missions and stamp the ledger in plain English. The board still works without it.

**better_auth_secret**  
Leave blank to generate and persist one. Set it only if you are restoring a backup and need the same sessions.

**database_url**  
Leave blank to keep the family database on this add-on’s disk. Set a Postgres URL only if you already run one.

## https

Put Nginx Proxy Manager or a Cloudflare Tunnel in front of port 8080, then point **public_url** at that hostname. See `SELFHOST.md` in this folder.

## First use

Create the family account (email + password) on a parent device, then sign the iPads into the same account and add them to the Home Screen.
