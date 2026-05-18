import { PromptDispatcher } from '../../src/services/promptDispatcher';

describe('PromptDispatcher — per-channel concurrency', () => {
    function createDispatcher(sendPromptImpl: jest.Mock) {
        return new PromptDispatcher({
            bridge: {} as any,
            modeService: {} as any,
            modelService: {} as any,
            sendPromptImpl,
        });
    }

    function makeReq(chatId: number, threadId?: number, prompt = 'hello', workspaceName = 'TestProject') {
        return {
            channel: { chatId, threadId } as any,
            prompt,
            cdp: { getCurrentWorkspaceName: () => workspaceName } as any,
            inboundImages: [],
        };
    }

    it('serializes sends to the same channel', async () => {
        const order: number[] = [];
        let resolveFirst: () => void;
        const firstDone = new Promise<void>(r => { resolveFirst = r; });

        const sendImpl = jest.fn()
            .mockImplementationOnce(async () => {
                order.push(1);
                await firstDone;
            })
            .mockImplementationOnce(async () => {
                order.push(2);
            });

        const dispatcher = createDispatcher(sendImpl);

        const p1 = dispatcher.send(makeReq(100, 1, 'first'));
        const p2 = dispatcher.send(makeReq(100, 1, 'second'));

        // First send should have started
        await new Promise(r => setTimeout(r, 10));
        expect(order).toEqual([1]);

        // Second should NOT have started yet
        expect(sendImpl).toHaveBeenCalledTimes(1);

        // Release first
        resolveFirst!();
        await Promise.all([p1, p2]);

        expect(order).toEqual([1, 2]);
        expect(sendImpl).toHaveBeenCalledTimes(2);
    });

    it('allows parallel sends to different channels', async () => {
        const order: string[] = [];

        const sendImpl = jest.fn().mockImplementation(async (_b: any, ch: any, prompt: string) => {
            order.push(prompt);
        });

        const dispatcher = createDispatcher(sendImpl);

        await Promise.all([
            dispatcher.send(makeReq(100, 1, 'channel-A', 'WorkspaceA')),
            dispatcher.send(makeReq(200, 2, 'channel-B', 'WorkspaceB')),
        ]);

        expect(sendImpl).toHaveBeenCalledTimes(2);
        expect(order).toContain('channel-A');
        expect(order).toContain('channel-B');
    });

    it('generates different keys for different threadIds', async () => {
        const calls: string[] = [];

        const sendImpl = jest.fn().mockImplementation(async (_b: any, _ch: any, prompt: string) => {
            calls.push(prompt);
        });

        const dispatcher = createDispatcher(sendImpl);

        await Promise.all([
            dispatcher.send(makeReq(100, 1, 'thread-1', 'WorkspaceA')),
            dispatcher.send(makeReq(100, 2, 'thread-2', 'WorkspaceB')),
        ]);

        // Different threads should be independent channels
        expect(calls).toHaveLength(2);
    });

    it('uses chatId only when no threadId', async () => {
        const sendImpl = jest.fn().mockResolvedValue(undefined);
        const dispatcher = createDispatcher(sendImpl);

        await dispatcher.send(makeReq(100, undefined, 'no-thread'));

        expect(sendImpl).toHaveBeenCalledTimes(1);
    });

    it('cleans up lock after send completes', async () => {
        const sendImpl = jest.fn().mockResolvedValue(undefined);
        const dispatcher = createDispatcher(sendImpl);

        await dispatcher.send(makeReq(100, 1));

        // Internal channelLocks should be cleaned up (no way to directly check,
        // but sending again should not block)
        await dispatcher.send(makeReq(100, 1));

        expect(sendImpl).toHaveBeenCalledTimes(2);
    });

    it('handles errors in sendPromptImpl without breaking serialization', async () => {
        const sendImpl = jest.fn()
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce(undefined);

        const dispatcher = createDispatcher(sendImpl);

        // First send fails, second should still run
        await dispatcher.send(makeReq(100, 1, 'will-fail'));
        await dispatcher.send(makeReq(100, 1, 'should-succeed'));

        expect(sendImpl).toHaveBeenCalledTimes(2);
    });
});
