import { InlineKeyboard } from 'grammy';

import {
    AVAILABLE_MODES,
    MODE_DESCRIPTIONS,
    MODE_DISPLAY_NAMES,
    ModeService,
} from '../services/modeService';
import { CdpService } from '../services/cdpService';
import { escapeHtml } from '../utils/telegramFormatter';

export interface ModeUiDeps {
    getCurrentCdp?: () => CdpService | null;
}

export interface ModeUiPayload {
    text: string;
    keyboard: InlineKeyboard;
}

export async function buildModeUI(
    modeService: ModeService,
    deps?: ModeUiDeps,
): Promise<ModeUiPayload> {
    if (deps?.getCurrentCdp) {
        const cdp = deps.getCurrentCdp();
        if (cdp) {
            const liveMode = await cdp.getCurrentMode();
            if (liveMode) modeService.setMode(liveMode);
        }
    }

    const currentMode = modeService.getCurrentMode();

    const modeLines = AVAILABLE_MODES.map(m => {
        const icon = m === currentMode ? '✅' : '⬜';
        return `${icon} <b>${escapeHtml(MODE_DISPLAY_NAMES[m] || m)}</b> — ${escapeHtml(MODE_DESCRIPTIONS[m] || '')}`;
    }).join('\n');

    const text =
        `<b>Mode Management</b>\n\n` +
        `<b>Current Mode:</b> ${escapeHtml(MODE_DISPLAY_NAMES[currentMode] || currentMode)}\n` +
        `${escapeHtml(MODE_DESCRIPTIONS[currentMode] || '')}\n\n` +
        `<b>Available Modes (${AVAILABLE_MODES.length})</b>\n` +
        modeLines;

    const keyboard = new InlineKeyboard();
    for (const m of AVAILABLE_MODES) {
        const label = m === currentMode
            ? `✅ ${MODE_DISPLAY_NAMES[m] || m}`
            : MODE_DISPLAY_NAMES[m] || m;
        keyboard.text(label, `mode_select:${m}`).row();
    }

    return { text, keyboard };
}

export async function sendModeUI(
    sendFn: (text: string, keyboard: InlineKeyboard) => Promise<void>,
    modeService: ModeService,
    deps?: ModeUiDeps,
): Promise<void> {
    const { text, keyboard } = await buildModeUI(modeService, deps);
    await sendFn(text, keyboard);
}
