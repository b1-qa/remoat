import { logger } from '../utils/logger';
import { execFile } from 'child_process';
import { promisify } from 'util';
import * as https from 'https';

const execFileAsync = promisify(execFile);

// SECURITY: Scoped TLS bypass — only for localhost self-signed cert connections.
// This avoids disabling TLS verification process-wide via rejectUnauthorized: false.
const localhostTlsAgent = new https.Agent({ rejectUnauthorized: false });

export interface QuotaInfo {
    remainingFraction: number;
    resetTime: string;
}

export interface ModelQuota {
    label: string;
    model: string;
    quotaInfo?: QuotaInfo;
}

export interface UserStatusData {
    clientModelConfigs?: ModelQuota[];
}

export class QuotaService {
    private cachedPort: number | null = null;
    private cachedCsrfToken: string | null = null;
    private cachedPid: number | null = null;

    private async getUnixProcessInfo(): Promise<{pid: number, csrf_token: string} | null> {
        try {
            // macOS — SECURITY: execFile avoids shell=true (no command injection)
            const { stdout } = await execFileAsync('pgrep', ['-fa', 'language_server']);
            const lines = stdout.split('\n');
            for (const line of lines) {
                if (line.includes('--csrf_token')) {
                    const parts = line.trim().split(/\s+/);
                    const pid = parseInt(parts[0], 10);
                    const cmd = line.substring(parts[0].length).trim();
                    const tokenMatch = cmd.match(/--csrf_token[=\s]+([a-zA-Z0-9\-]+)/);
                    if (pid && tokenMatch && tokenMatch[1]) {
                        return { pid, csrf_token: tokenMatch[1] };
                    }
                }
            }
        } catch (e) {
            logger.error('Failed to get process info:', e);
        }
        return null;
    }

    private async getListeningPorts(pid: number): Promise<number[]> {
        const ports: number[] = [];
        try {
            // macOS — SECURITY: execFile avoids shell=true, PID passed as argument
            const { stdout } = await execFileAsync('lsof', ['-nP', '-a', '-iTCP', '-sTCP:LISTEN', '-p', String(pid)]);
            const regex = new RegExp(`^\\S+\\s+${pid}\\s+.*?(?:TCP|UDP)\\s+(?:\\*|[\\d.]+|\\[[\\da-f:]+\\]):(\\d+)\\s+\\(LISTEN\\)`, 'gim');
            let match;
            while ((match = regex.exec(stdout)) !== null) {
                const port = parseInt(match[1], 10);
                if (!ports.includes(port)) {
                    ports.push(port);
                }
            }
        } catch (e) {
            logger.error(`Failed to get ports for pid ${pid}:`, e);
        }
        return ports;
    }

    private requestApi(port: number, csrfToken: string): Promise<UserStatusData> {
        return new Promise((resolve, reject) => {
            const data = JSON.stringify({
                metadata: { ideName: 'antigravity', extensionName: 'antigravity', locale: 'en' }
            });
            const options: https.RequestOptions = {
                hostname: '127.0.0.1',
                port: port,
                path: '/exa.language_server_pb.LanguageServerService/GetUserStatus',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(data),
                    'Connect-Protocol-Version': '1',
                    'X-Codeium-Csrf-Token': csrfToken,
                },
                // SECURITY: TLS bypass scoped to localhost Agent — not process-wide
                agent: localhostTlsAgent,
                timeout: 2000,
            };

            const req = https.request(options, res => {
                let body = '';
                res.on('data', chunk => body += chunk);
                res.on('end', () => {
                    if (res.statusCode !== 200) {
                        return reject(new Error(`HTTP ${res.statusCode}`));
                    }
                    try {
                        const parsed = JSON.parse(body);
                        const cascadeData = parsed?.userStatus?.cascadeModelConfigData;
                        const rawConfigs: any[] = cascadeData?.clientModelConfigs || [];
                        const configs: ModelQuota[] = rawConfigs.map((c: any) => {
                            const label = c.label || c.displayName || c.modelName || '';
                            const model = c.modelOrAlias?.model || c.model || c.modelId || '';
                            const qi = c.quotaInfo || c.quota || c.usageInfo;
                            const quotaInfo = qi ? {
                                remainingFraction: parseFloat(qi.remainingFraction ?? qi.remaining ?? 0),
                                resetTime: qi.resetTime || qi.resetAt || '',
                            } : undefined;
                            return { label, model, quotaInfo };
                        });
                        resolve({ clientModelConfigs: configs });
                    } catch (e) {
                        reject(new Error('Invalid JSON response'));
                    }
                });
            });

            req.on('error', reject);
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });

            req.write(data);
            req.end();
        });
    }

    public async fetchQuota(retryCount = 0): Promise<ModelQuota[]> {
        let processInfo = await this.getUnixProcessInfo();
        if (!processInfo) {
            logger.error('No language_server process found.');
            return [];
        }

        const { pid, csrf_token } = processInfo;

        // If PID or Token changed, invalidate cache
        if (this.cachedPid !== pid || this.cachedCsrfToken !== csrf_token) {
            this.cachedPort = null;
            this.cachedPid = pid;
            this.cachedCsrfToken = csrf_token;
        }

        let targetPort = this.cachedPort;

        if (!targetPort) {
            const ports = await this.getListeningPorts(pid);
            for (const port of ports) {
                try {
                    const data = await this.requestApi(port, csrf_token);
                    targetPort = port;
                    this.cachedPort = port;
                    return data.clientModelConfigs || [];
                } catch (e) {
                    continue; // try next port
                }
            }
        } else {
            try {
                const data = await this.requestApi(targetPort, csrf_token);
                return data.clientModelConfigs || [];
            } catch (e) {
                // cache might be invalid — retry once with fresh port scan
                this.cachedPort = null;
                if (retryCount < 1) {
                    return this.fetchQuota(retryCount + 1);
                }
                logger.error('fetchQuota failed after retry:', e);
                return [];
            }
        }
        return [];
    }
}

// ---------- Full Quota Snapshot (includes credits & plan info) ----------

export interface FullQuotaSnapshot {
    plan: string;
    aiCredits: number;
    promptCredits: { available: number; total: number };
    flowCredits: { available: number; total: number };
    models: ModelQuota[];
    fetchedAt: Date;
}

export class FullQuotaService extends QuotaService {

    /**
     * Fetch the complete user status including plan & credits,
     * not just model configs.
     */
    public async fetchFullQuota(): Promise<FullQuotaSnapshot> {
        const processInfo = await (this as any).getUnixProcessInfo();
        if (!processInfo) throw new Error("Language server not found");

        const { pid, csrf_token } = processInfo;

        // Discover the right port
        let ports: number[] = [];
        if ((this as any).cachedPort) {
            ports = [(this as any).cachedPort];
        } else {
            ports = await (this as any).getListeningPorts(pid);
        }

        for (const port of ports) {
            try {
                const raw = await this.requestFullApi(port, csrf_token);
                (this as any).cachedPort = port;
                (this as any).cachedPid = pid;
                (this as any).cachedCsrfToken = csrf_token;
                return raw;
            } catch {
                continue;
            }
        }
        throw new Error("Could not reach language server on any port");
    }

    private requestFullApi(port: number, csrfToken: string): Promise<FullQuotaSnapshot> {
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify({
                metadata: { ideName: "antigravity", extensionName: "antigravity", locale: "en" }
            });
            const options: https.RequestOptions = {
                hostname: "127.0.0.1",
                port,
                path: "/exa.language_server_pb.LanguageServerService/GetUserStatus",
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Content-Length": Buffer.byteLength(payload),
                    "Connect-Protocol-Version": "1",
                    "X-Codeium-Csrf-Token": csrfToken,
                },
                agent: localhostTlsAgent,
                timeout: 5000,
            };

            const req = https.request(options, (res) => {
                let body = "";
                res.on("data", (c) => (body += c));
                res.on("end", () => {
                    if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
                    try {
                        const parsed = JSON.parse(body);
                        const us = parsed?.userStatus ?? {};
                        const ps = us.planStatus ?? {};
                        const pi = ps.planInfo ?? {};
                        const rawConfigs: any[] = us.cascadeModelConfigData?.clientModelConfigs ?? [];

                        const models: ModelQuota[] = rawConfigs
                            .filter((c: any) => !c.disabled)
                            .map((c: any) => ({
                                label: c.label || "",
                                model: c.modelOrAlias?.model || "",
                                quotaInfo: c.quotaInfo ? {
                                    remainingFraction: parseFloat(c.quotaInfo.remainingFraction ?? 0),
                                    resetTime: c.quotaInfo.resetTime || "",
                                } : undefined,
                            }));

                        // Map plan name using tier + credits for accurate display
                        const tierMap: Record<string, string> = {
                            "TEAMS_TIER_PRO_ULTIMATE": "Ultra",
                            "TEAMS_TIER_PRO": pi.monthlyPromptCredits >= 50000 ? "Ultra" : "Pro",
                            "TEAMS_TIER_TEAMS": "Teams",
                            "TEAMS_TIER_ENTERPRISE_SAAS": "Enterprise",
                            "TEAMS_TIER_ENTERPRISE_SELF_HOSTED": "Enterprise",
                            "TEAMS_TIER_HYBRID": "Hybrid",
                        };
                        const planDisplay = tierMap[pi.teamsTier as string] ?? pi.planName ?? "Unknown";

                        // Extract Google AI Credits from userTier
                        const userTier = us.userTier ?? {};
                        const availCredits: any[] = userTier.availableCredits ?? [];
                        const googleAiEntry = availCredits.find((c: any) => c.creditType === "GOOGLE_ONE_AI");
                        const aiCredits = googleAiEntry ? parseInt(googleAiEntry.creditAmount, 10) || 0 : 0;

                        resolve({
                            plan: planDisplay,
                            aiCredits,
                            promptCredits: {
                                available: ps.availablePromptCredits ?? 0,
                                total: pi.monthlyPromptCredits ?? 0,
                            },
                            flowCredits: {
                                available: ps.availableFlowCredits ?? 0,
                                total: pi.monthlyFlowCredits ?? 0,
                            },
                            models,
                            fetchedAt: new Date(),
                        });
                    } catch {
                        reject(new Error("Invalid JSON"));
                    }
                });
            });
            req.on("error", reject);
            req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
            req.write(payload);
            req.end();
        });
    }
}

// ---------- Telegram formatter ----------

function humanDuration(ms: number): string {
    if (ms <= 0) return "now";
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
}

function progressBar(frac: number, len = 10): string {
    const filled = Math.round(frac * len);
    return "█".repeat(filled) + "░".repeat(len - filled);
}

export function formatQuotaTelegram(q: FullQuotaSnapshot): string {
    const lines: string[] = [];
    const now = Date.now();

    lines.push("📊 *Antigravity Quota*\n");

    for (const m of q.models) {
        const frac = m.quotaInfo?.remainingFraction ?? null;
        const pctStr = frac !== null ? `${Math.round(frac * 100)}%` : "?";
        const emoji = frac === null ? "⚪" : frac <= 0.1 ? "🔴" : frac <= 0.5 ? "🟡" : "🟢";
        const bar = progressBar(frac ?? 0);
        const resetMs = m.quotaInfo?.resetTime ? new Date(m.quotaInfo.resetTime).getTime() - now : 0;
        const resetStr = resetMs > 0 ? humanDuration(resetMs) : "now";

        lines.push(`${emoji} \`${m.label}\``);
        lines.push(`   ${bar} ${pctStr.padStart(4)}  ⏳ ${resetStr}`);
    }

    lines.push("");
    lines.push(`🤖 AI Credits: *${q.aiCredits.toLocaleString()}*`);
    lines.push(`\n📋 Plan: *${q.plan}*`);




    return lines.join("\n");
}
