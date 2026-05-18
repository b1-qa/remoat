# Changelog

## [0.2.15] - 2026-05-18

### Added
- `/quota` command — displays model quota with progress bars, reset timers, AI credits, and plan info
- `/launch` command — start/restart/stop Antigravity via PM2 from Telegram, with proxy check
- `FullQuotaService` — fetches complete user status (plan, credits, model quotas) via Connect RPC to the local language server
- Telegram formatter with emoji status indicators (🟢🟡🔴), progress bars, and countdown timers
- Google One AI credits display (`userTier.availableCredits`)
- VPS deployment section in README with OAuth tunnel login and daily reconnect workflow

### Fixed
- Process detection: `pgrep -fl` → `pgrep -fa` for full argument display on Linux
- Language server selection: prefer `--enable_lsp` process over base process
- Plan name mapping: `TEAMS_TIER_PRO` with 50k credits correctly displays as "Ultra"
- Allow selecting exhausted models (AI credits take over when quota is at 0%)
- Removed proxy watchdog that was killing Antigravity and causing session logouts

### Changed
- README rewritten — stripped boilerplate, focused on setup and usage
- Removed CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md, CLAUDE.md, .github/ templates

## [0.2.14] - 2026-04-03

### Added
- Security hardening: 7 patches from audit (npm audit fix, 18 vulnerability fixes)
- Approval keyboard persistence until IDE confirms
- `/allow` and `/deny` commands for pending IDE dialogs
- CI workflow for PRs and pushes to main

### Fixed
- Tool-call output leakage scoped to first assistant-body segment
- Walkthrough artifacts without Proceed buttons
- Planning detector chip selector with upgrade re-notification
- DOM queries restricted to latest message in response monitor

### Removed
- Dead code: unused `auth` middleware and `processLogBuffer` utility
- Empty `catch {}` blocks replaced with `logger.debug()`

## [0.2.13] - 2026-03-28

### Fixed
- Run/Reject terminal command approval buttons detected and forwarded to Telegram
- Container lookup walks ancestors to find approve and deny buttons
- Telegram inline keyboard shows actual button labels from Antigravity UI

## [0.2.12] - 2026-03-28

### Fixed
- Stale incremental build cache that omitted `antigravityLauncher`

## [0.2.11] - 2026-03-28

### Fixed
- Compatibility with Antigravity v1.21.6 DOM changes
- Model picker selectors updated for `<button>` elements
- Chat panel readiness detection via `#conversation` element
- Bare `<pre>` blocks no longer produce orphan `</pre>` tags

## [0.2.2] - 2026-03-02

### Changed
- Setup wizard with directory Tab-completion
- Step 3 description clarifies subdirectories and `/project` entries

## [0.2.1] - 2026-03-02

### Added
- Homebrew tap install
- MIT LICENSE

### Fixed
- Per-workspace prompt locking (concurrent dispatch prevention)
- `/stop` resolves workspace from sender's channel binding
- HTML entity handling, streaming code block freeze, CDP error wrapping
- 15+ additional bug fixes (see git history)

## [0.2.0] - 2026-02-15

### Added
- Structured DOM extraction with HTML-to-Telegram conversion
- Planning mode detection, error popup detection, quota error detection
- Voice message support via local whisper.cpp
- Image attachment forwarding
- `/autoaccept`, `/cleanup`, `/status` commands
- i18n support (English, Japanese)

## [0.1.0] - 2026-01-20

### Added
- Initial release
- Telegram bot via grammy (long-polling)
- CDP integration, DOM polling, project management via Forum Topics
- Session management with SQLite, CLI subcommands, prompt templates
- Model/mode switching, screenshot capture, whitelist auth
