import { PromptDispatcher } from '../../src/services/promptDispatcher';

describe('PromptDispatcher', () => {
    it('invokes the send implementation via send()', async () => {
        const sendPromptImpl = jest.fn().mockResolvedValue(undefined);
        const dispatcher = new PromptDispatcher({
            bridge: {} as any,
            modeService: {} as any,
            modelService: {} as any,
            sendPromptImpl,
        });

        const req = {
            channel: { chatId: 12345, threadId: 1 } as any,
            prompt: 'hello',
            cdp: { getCurrentWorkspaceName: () => 'TestProject' } as any,
            inboundImages: [],
            options: { foo: 'bar' } as any,
        };

        await dispatcher.send(req);

        expect(sendPromptImpl).toHaveBeenCalledWith(
            {} as any,
            req.channel,
            'hello',
            req.cdp,
            {} as any,
            {} as any,
            [],
            req.options,
        );
    });
});
