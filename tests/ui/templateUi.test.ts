import { sendTemplateUI, TEMPLATE_BTN_PREFIX, parseTemplateButtonId } from '../../src/ui/templateUi';
import { TemplateRecord } from '../../src/database/templateRepository';
import { InlineKeyboard } from 'grammy';

function makeTemplate(id: number, name: string, prompt: string): TemplateRecord {
    return { id, name, prompt, createdAt: '2026-01-01T00:00:00Z' };
}

describe('templateUi', () => {
    describe('sendTemplateUI', () => {
        it('shows empty state when no templates exist', async () => {
            const sendFn = jest.fn().mockResolvedValue(undefined);
            await sendTemplateUI(sendFn, []);

            expect(sendFn).toHaveBeenCalledTimes(1);
            const text = sendFn.mock.calls[0][0] as string;
            expect(text).toContain('No templates registered');
            expect(text).toContain('template_add');
            expect(sendFn.mock.calls[0][1]).toBeInstanceOf(InlineKeyboard);
        });

        it('shows template list with buttons', async () => {
            const templates = [
                makeTemplate(1, 'daily-report', 'Write a daily report'),
                makeTemplate(2, 'code-review', 'Review the latest code changes'),
            ];

            const sendFn = jest.fn().mockResolvedValue(undefined);
            await sendTemplateUI(sendFn, templates);

            const text = sendFn.mock.calls[0][0] as string;
            expect(text).toContain('Template Management');
            expect(text).toContain('daily-report');
            expect(text).toContain('code-review');
            expect(text).toContain('(2)');
            expect(sendFn.mock.calls[0][1]).toBeInstanceOf(InlineKeyboard);
        });

        it('truncates long prompts in description', async () => {
            const longPrompt = 'A'.repeat(100);
            const templates = [makeTemplate(1, 'long', longPrompt)];

            const sendFn = jest.fn().mockResolvedValue(undefined);
            await sendTemplateUI(sendFn, templates);

            const text = sendFn.mock.calls[0][0] as string;
            expect(text).toContain('...');
            expect(text).not.toContain('A'.repeat(100));
        });

        it('caps at 25 buttons and shows overflow message', async () => {
            const templates = Array.from({ length: 30 }, (_, i) =>
                makeTemplate(i + 1, `tpl-${i + 1}`, `prompt ${i + 1}`),
            );

            const sendFn = jest.fn().mockResolvedValue(undefined);
            await sendTemplateUI(sendFn, templates);

            const text = sendFn.mock.calls[0][0] as string;
            expect(text).toContain('5 templates are hidden');
        });
    });

    describe('parseTemplateButtonId', () => {
        it('parses valid template button customId', () => {
            expect(parseTemplateButtonId('template_btn_42')).toBe(42);
        });

        it('returns NaN for non-template customId', () => {
            expect(parseTemplateButtonId('model_btn_foo')).toBeNaN();
        });

        it('returns NaN for invalid number', () => {
            expect(parseTemplateButtonId('template_btn_abc')).toBeNaN();
        });
    });
});
