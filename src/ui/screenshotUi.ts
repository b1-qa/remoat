import { InputFile } from 'grammy';
import { CdpService } from '../services/cdpService';
import { ScreenshotService } from '../services/screenshotService';

/**
 * Capture a screenshot and send it via Telegram.
 */
export async function handleScreenshot(
    sendPhoto: (input: InputFile, caption?: string) => Promise<void>,
    sendText: (text: string) => Promise<void>,
    cdp: CdpService | null,
): Promise<void> {
    if (!cdp) {
        await sendText('Not connected to Antigravity.');
        return;
    }

    try {
        const screenshot = new ScreenshotService({ cdpService: cdp });
        const result = await screenshot.capture({ format: 'png' });
        if (result.success && result.buffer) {
            await sendPhoto(new InputFile(result.buffer, 'screenshot.png'), '📸 Screenshot');
        } else {
            await sendText(`Screenshot failed: ${result.error}`);
        }
    } catch (e: any) {
        await sendText(`Screenshot error: ${e.message}`);
    }
}
