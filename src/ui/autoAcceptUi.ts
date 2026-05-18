import { InlineKeyboard } from 'grammy';
import { AutoAcceptService } from '../services/autoAcceptService';

export const AUTOACCEPT_BTN_ON = 'autoaccept_btn_on';
export const AUTOACCEPT_BTN_OFF = 'autoaccept_btn_off';
export const AUTOACCEPT_BTN_REFRESH = 'autoaccept_btn_refresh';

export async function sendAutoAcceptUI(
    sendFn: (text: string, keyboard: InlineKeyboard) => Promise<void>,
    autoAcceptService: AutoAcceptService,
): Promise<void> {
    const enabled = autoAcceptService.isEnabled();

    const text =
        `<b>Auto-accept Management</b>\n\n` +
        `<b>Current Status:</b> ${enabled ? '🟢 ON' : '⚪ OFF'}\n\n` +
        `ON: approval dialogs are automatically allowed.\n` +
        `OFF: approval dialogs require manual action.`;

    const keyboard = new InlineKeyboard()
        .text(enabled ? '✅ Turn ON' : 'Turn ON', AUTOACCEPT_BTN_ON)
        .text(!enabled ? '🔴 Turn OFF' : 'Turn OFF', AUTOACCEPT_BTN_OFF)
        .row()
        .text('🔄 Refresh', AUTOACCEPT_BTN_REFRESH);

    await sendFn(text, keyboard);
}
