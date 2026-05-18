import { ModeService } from '../../src/services/modeService';
import { sendModeUI } from '../../src/ui/modeUi';
import { InlineKeyboard } from 'grammy';

describe('modeUi', () => {
    it('sends text and keyboard containing the current mode', async () => {
        const modeService = new ModeService();
        const sendFn = jest.fn().mockResolvedValue(undefined);

        await sendModeUI(sendFn, modeService);

        expect(sendFn).toHaveBeenCalledTimes(1);
        const text = sendFn.mock.calls[0][0] as string;
        expect(text).toContain('Mode Management');
        expect(sendFn.mock.calls[0][1]).toBeInstanceOf(InlineKeyboard);
    });

    it('syncs mode from CDP when deps.getCurrentCdp is provided', async () => {
        const modeService = new ModeService();
        const mockCdp = { getCurrentMode: jest.fn().mockResolvedValue('plan') };
        const sendFn = jest.fn().mockResolvedValue(undefined);

        await sendModeUI(sendFn, modeService, { getCurrentCdp: () => mockCdp as any });

        expect(mockCdp.getCurrentMode).toHaveBeenCalled();
        expect(modeService.getCurrentMode()).toBe('plan');
    });

    it('does not sync mode when CDP returns null', async () => {
        const modeService = new ModeService();
        const mockCdp = { getCurrentMode: jest.fn().mockResolvedValue(null) };
        const sendFn = jest.fn().mockResolvedValue(undefined);

        await sendModeUI(sendFn, modeService, { getCurrentCdp: () => mockCdp as any });

        expect(mockCdp.getCurrentMode).toHaveBeenCalled();
        expect(modeService.getCurrentMode()).toBe('fast');
    });

    it('works without deps parameter', async () => {
        const modeService = new ModeService();
        const sendFn = jest.fn().mockResolvedValue(undefined);

        await sendModeUI(sendFn, modeService, undefined);

        expect(sendFn).toHaveBeenCalledTimes(1);
    });

    it('works when getCurrentCdp returns null', async () => {
        const modeService = new ModeService();
        const sendFn = jest.fn().mockResolvedValue(undefined);

        await sendModeUI(sendFn, modeService, { getCurrentCdp: () => null });

        expect(sendFn).toHaveBeenCalledTimes(1);
        expect(modeService.getCurrentMode()).toBe('fast');
    });
});
