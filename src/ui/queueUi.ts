import { InlineKeyboard } from 'grammy';
import { escapeHtml } from '../utils/telegramFormatter';

export const INTERRUPT_QUEUE_PREFIX = 'interrupt:queue:';
export const INTERRUPT_NOW_PREFIX = 'interrupt:now:';
export const INTERRUPT_DISCARD_PREFIX = 'interrupt:discard:';

/** Telegram callback_data max is 64 bytes. Truncate the key to fit the longest prefix. */
const MAX_CB_KEY_LEN = 64 - INTERRUPT_DISCARD_PREFIX.length;

/** Truncate a workspace key to fit within Telegram's 64-byte callback_data limit. */
export function safeCallbackKey(key: string): string {
    return key.length > MAX_CB_KEY_LEN ? key.substring(0, MAX_CB_KEY_LEN) : key;
}

/**
 * Build the interrupt keyboard shown when the user sends a message
 * while Antigravity is still generating a response.
 */
export function buildInterruptUI(channelKey: string, prompt: string): { text: string; keyboard: InlineKeyboard } {
    const preview = prompt.length > 80 ? prompt.slice(0, 80) + '…' : prompt;
    const cbKey = safeCallbackKey(channelKey);

    const text =
        `⏳ <b>Antigravity is working on a request.</b>\n\n` +
        `<i>${escapeHtml(preview)}</i>\n\n` +
        `Choose what to do with your message:`;

    const keyboard = new InlineKeyboard()
        .text('📥 Queue', `${INTERRUPT_QUEUE_PREFIX}${cbKey}`)
        .text('⚡ Send now', `${INTERRUPT_NOW_PREFIX}${cbKey}`)
        .row()
        .text('🗑 Don\'t send', `${INTERRUPT_DISCARD_PREFIX}${cbKey}`);

    return { text, keyboard };
}
