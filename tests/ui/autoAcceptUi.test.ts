import {
    AUTOACCEPT_BTN_OFF,
    AUTOACCEPT_BTN_ON,
    AUTOACCEPT_BTN_REFRESH,
    sendAutoAcceptUI,
} from '../../src/ui/autoAcceptUi';
import { AutoAcceptService } from '../../src/services/autoAcceptService';
import { InlineKeyboard } from 'grammy';

describe('autoAcceptUi', () => {
    it('shows OFF status and sends keyboard when disabled', async () => {
        const sendFn = jest.fn().mockResolvedValue(undefined);
        const service = new AutoAcceptService(false);

        await sendAutoAcceptUI(sendFn, service);

        expect(sendFn).toHaveBeenCalledTimes(1);
        const text = sendFn.mock.calls[0][0] as string;
        expect(text).toContain('Auto-accept Management');
        expect(text).toContain('OFF');
        expect(sendFn.mock.calls[0][1]).toBeInstanceOf(InlineKeyboard);
    });

    it('shows ON status when enabled', async () => {
        const sendFn = jest.fn().mockResolvedValue(undefined);
        const service = new AutoAcceptService(true);

        await sendAutoAcceptUI(sendFn, service);

        const text = sendFn.mock.calls[0][0] as string;
        expect(text).toContain('ON');
    });
});
