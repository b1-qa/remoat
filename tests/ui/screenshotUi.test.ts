import { handleScreenshot } from '../../src/ui/screenshotUi';

jest.mock('../../src/services/screenshotService');

import { ScreenshotService } from '../../src/services/screenshotService';

describe('screenshotUi', () => {
    let sendPhoto: jest.Mock;
    let sendText: jest.Mock;

    beforeEach(() => {
        sendPhoto = jest.fn().mockResolvedValue(undefined);
        sendText = jest.fn().mockResolvedValue(undefined);
    });

    it('sends "not connected" when cdp is null', async () => {
        await handleScreenshot(sendPhoto, sendText, null);

        expect(sendText).toHaveBeenCalledWith('Not connected to Antigravity.');
        expect(sendPhoto).not.toHaveBeenCalled();
    });

    it('sends photo when screenshot succeeds', async () => {
        const mockBuffer = Buffer.from('fake-png');
        (ScreenshotService as jest.MockedClass<typeof ScreenshotService>).mockImplementation(() => ({
            capture: jest.fn().mockResolvedValue({ success: true, buffer: mockBuffer }),
        } as any));

        const cdp = {} as any;
        await handleScreenshot(sendPhoto, sendText, cdp);

        expect(sendPhoto).toHaveBeenCalledTimes(1);
        expect(sendText).not.toHaveBeenCalled();
    });

    it('sends error text when screenshot fails', async () => {
        (ScreenshotService as jest.MockedClass<typeof ScreenshotService>).mockImplementation(() => ({
            capture: jest.fn().mockResolvedValue({ success: false, error: 'No page found' }),
        } as any));

        const cdp = {} as any;
        await handleScreenshot(sendPhoto, sendText, cdp);

        expect(sendText).toHaveBeenCalledWith('Screenshot failed: No page found');
        expect(sendPhoto).not.toHaveBeenCalled();
    });

    it('sends error text when capture throws', async () => {
        (ScreenshotService as jest.MockedClass<typeof ScreenshotService>).mockImplementation(() => ({
            capture: jest.fn().mockRejectedValue(new Error('CDP timeout')),
        } as any));

        const cdp = {} as any;
        await handleScreenshot(sendPhoto, sendText, cdp);

        expect(sendText).toHaveBeenCalledWith('Screenshot error: CDP timeout');
    });
});
