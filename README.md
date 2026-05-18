# Remoat

Control [Antigravity](https://antigravity.com) remotely from Telegram. Send prompts, receive AI responses, manage projects, switch models, monitor quotas — all from your phone.

## How it works

```
Telegram → Remoat bot → CDP → Antigravity IDE → AI response → Telegram
```

Remoat connects to Antigravity via Chrome DevTools Protocol, injects prompts, polls the DOM for responses, and streams results back to Telegram.

---

## VPS Setup (from scratch)

Tested on Ubuntu 24.04 (Hetzner CPX11 — 2 vCPU, 4 GB RAM).

### 1. System dependencies

```bash
sudo apt update && sudo apt install -y xvfb x11vnc curl gnupg

# Node.js 22
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# PM2
sudo npm install -g pm2
```

### 2. Install Antigravity

```bash
# Add the official APT repo
curl -fsSL https://us-central1-apt.pkg.dev/projects/antigravity-auto-updater-dev/antigravity-debian/pool/antigravity-keyring.gpg \
  | sudo gpg --dearmor -o /etc/apt/keyrings/antigravity-repo-key.gpg

echo "deb [signed-by=/etc/apt/keyrings/antigravity-repo-key.gpg] https://us-central1-apt.pkg.dev/projects/antigravity-auto-updater-dev/ antigravity-debian main" \
  | sudo tee /etc/apt/sources.list.d/antigravity.list

sudo apt update && sudo apt install -y antigravity
```

### 3. Virtual display (Xvfb)

Create `/etc/systemd/system/xvfb.service`:

```ini
[Unit]
Description=Virtual Framebuffer X Server
After=network.target

[Service]
ExecStart=/usr/bin/Xvfb :99 -screen 0 1920x1080x24 -ac -nolisten tcp
Restart=always
User=ops

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable --now xvfb
```

### 4. VNC (view the UI from Mac)

```bash
# Set a VNC password
mkdir -p ~/.vnc
x11vnc -storepasswd ~/.vnc/passwd

# Start VNC server (localhost only — use SSH tunnel)
x11vnc -display :99 -rfbauth ~/.vnc/passwd -listen 127.0.0.1 -forever -bg -o /tmp/x11vnc.log
```

### 5. Launch Antigravity via PM2

Create `~/ecosystem.config.js`:

```js
module.exports = {
  apps: [{
    name: 'antigravity',
    script: '/usr/bin/antigravity',
    args: [
      '--remote-debugging-port=9222',
      '--disable-gpu',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--no-first-run'
    ].join(' '),
    env: {
      DISPLAY: ':99',
      TZ: 'YOUR_TIMEZONE',         // e.g. America/New_York
      LANG: 'YOUR_LOCALE.UTF-8'    // e.g. en_US.UTF-8
    },
    restart_delay: 5000,
    max_restarts: 5
  }]
}
```

#### Proxy (optional)

If you route traffic through a SOCKS5 proxy, add these to the `args` array:

```js
'--proxy-server=socks5h://127.0.0.1:1080',
'--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
'--accept-lang=YOUR_LANG_CODE'   // match proxy locale, e.g. en-US,en
```

Set `TZ` and `LANG` in `env` to match the proxy's region for consistency.

```bash
pm2 start ~/ecosystem.config.js
pm2 save
pm2 startup  # auto-start on boot
```

### 6. First-time Google login

The headless VPS has no browser, so Google OAuth requires an SSH tunnel trick:

```bash
# On VPS: trigger the login button via keyboard
DISPLAY=:99 xdotool search --name "Antigravity" windowactivate --sync
sleep 1
DISPLAY=:99 xdotool key Tab Tab Tab Return
```

Antigravity tries to open a browser and fails — but logs the OAuth URL:

```bash
# On VPS: grab the OAuth URL from logs
pm2 logs antigravity --lines 20 --nostream 2>&1 | grep 'accounts.google.com'
```

Extract the `redirect_uri` port (e.g. `localhost:45883`) and tunnel it:

```bash
# On Mac: forward the OAuth callback port
ssh -L 45883:127.0.0.1:45883 ops@YOUR_VPS_IP
```

Open the OAuth URL in Safari on your Mac. Google login completes, the callback goes through the tunnel to the VPS. Session persists — this only needs to be done once.

### 7. Install and configure Remoat

```bash
git clone git@github.com:b1-qa/remoat.git ~/remoat
cd ~/remoat
npm install
cp .env.example .env
# Edit .env: set TELEGRAM_BOT_TOKEN, ALLOWED_USER_IDS, WORKSPACE_BASE_DIR
npm run build
pm2 start dist/index.js --name remoat
pm2 save
```

---

## Daily reconnect (from Mac)

Requires SSH config alias (`~/.ssh/config` → `Host remoat` with your VPS IP and key).

Run this **every time you open your laptop**:

```bash
# Kill stale tunnels, then re-establish proxy + VNC
pkill -f "ssh.*remoat.*-[RL]" 2>/dev/null; sleep 1
ssh -R 1080 -L 5901:127.0.0.1:5900 -N -f remoat
```

Then view the UI:

```bash
open vnc://localhost:5901
```

| Flag | What it does |
|------|-------------|
| `-R 1080` | SOCKS proxy on VPS, exits through your Mac's network |
| `-L 5901:...:5900` | VNC tunnel for viewing the UI |
| `-N -f` | Background, no shell |

> **IP safety**: Antigravity is launched with `--proxy-server=socks5h://127.0.0.1:1080`. When the proxy tunnel is down, all requests **fail** — Chromium never falls back to direct IP. No watchdog needed, no restart needed. Antigravity stays running and keeps its login session.

### SSH into the VPS

```bash
ssh remoat
```

---

## Environment

| Variable | Description |
|----------|-------------|
| `TELEGRAM_BOT_TOKEN` | From @BotFather |
| `ALLOWED_USER_IDS` | Comma-separated Telegram user IDs (whitelist) |
| `WORKSPACE_BASE_DIR` | Root directory for project workspaces |
| `USE_TOPICS` | Forum Topics mode (`true`/`false`) |

---

## Commands

| Command | Description |
|---------|-------------|
| `/project` | Select a project |
| `/new` | New chat session |
| `/chat` | Current session info |
| `/model [name]` | Switch LLM model |
| `/mode` | Switch execution mode |
| `/quota` | Model quota, AI credits, reset timers |
| `/stop` | Interrupt active generation |
| `/screenshot` | Capture Antigravity screen |
| `/close` | Terminate Antigravity session |
| `/template` | Prompt templates |
| `/template_add <name> <prompt>` | Register template |
| `/template_delete <name>` | Delete template |
| `/allow` / `/deny` | Approve/deny pending IDE dialog |
| `/autoaccept` | Toggle auto-approve |
| `/launch [stop\|restart]` | Start/restart/stop Antigravity via PM2 |
| `/status` | Connection & project status |
| `/ping` | Latency check |

Text messages and voice notes are sent directly as prompts.

---

## Dev workflow (on VPS)

```bash
cd ~/remoat

# Edit source
nano src/services/quotaService.ts

# Build & restart
npm run build && pm2 restart remoat

# Logs
pm2 logs remoat --lines 20

# Commit & push
git add -A && git commit -m "feat: ..." && git push
```

---

## Project structure

```
src/
  bot/          Command routing and event handling
  services/     CDP, response monitor, quota, sessions
  commands/     Slash command handlers, message parser
  database/     SQLite repos (sessions, bindings, templates)
  middleware/   Auth whitelist, input sanitization
  ui/           Inline keyboard builders
  utils/        Config, logging, i18n, path security
```

## License

[MIT](LICENSE) — Based on [LazyGravity](https://github.com/tokyoweb3/LazyGravity).
