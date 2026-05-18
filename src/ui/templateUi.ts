import { InlineKeyboard } from 'grammy';
import { TemplateRecord } from '../database/templateRepository';
import { escapeHtml } from '../utils/telegramFormatter';

export const TEMPLATE_BTN_PREFIX = 'template_btn_';

const MAX_PROMPT_PREVIEW_LEN = 60;
const MAX_BUTTONS = 25;

export function parseTemplateButtonId(customId: string): number {
    if (!customId.startsWith(TEMPLATE_BTN_PREFIX)) return NaN;
    return parseInt(customId.slice(TEMPLATE_BTN_PREFIX.length), 10);
}

export async function sendTemplateUI(
    sendFn: (text: string, keyboard: InlineKeyboard) => Promise<void>,
    templates: TemplateRecord[],
): Promise<void> {
    if (templates.length === 0) {
        const text =
            `<b>Template Management</b>\n\n` +
            `No templates registered.\n\n` +
            `Use /template_add to add one.`;
        await sendFn(text, new InlineKeyboard());
        return;
    }

    const truncate = (text: string, max: number): string =>
        text.length > max ? `${text.substring(0, max - 3)}...` : text;

    const displayTemplates = templates.slice(0, MAX_BUTTONS);
    const hasMore = templates.length > MAX_BUTTONS;

    const description = displayTemplates
        .map((tpl, i) => `<b>${i + 1}. ${escapeHtml(tpl.name)}</b>\n  ${escapeHtml(truncate(tpl.prompt, MAX_PROMPT_PREVIEW_LEN))}`)
        .join('\n\n');

    const footerText = hasMore
        ? `\n\n${templates.length - MAX_BUTTONS} templates are hidden.`
        : '\n\nTap a button to execute the template.';

    const text =
        `<b>Template Management</b>\n\n` +
        `<b>Registered Templates (${templates.length})</b>\n\n` +
        description +
        footerText;

    const keyboard = new InlineKeyboard();
    for (const tpl of displayTemplates) {
        const safeLabel = tpl.name.length > 40 ? `${tpl.name.substring(0, 37)}...` : tpl.name;
        keyboard.text(`▶ ${safeLabel}`, `${TEMPLATE_BTN_PREFIX}${tpl.id}`).row();
    }

    await sendFn(text, keyboard);
}
