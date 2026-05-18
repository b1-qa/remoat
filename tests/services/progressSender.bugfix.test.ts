import { ProgressSender } from '../../src/services/progressSender';

describe('ProgressSender — bug fix coverage', () => {
    let mockSend: jest.Mock;

    beforeEach(() => {
        jest.useFakeTimers();
        mockSend = jest.fn().mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    describe('dispose()', () => {
        it('clears pending timer so no emit happens', () => {
            const sender = new ProgressSender({ send: mockSend, throttleMs: 3000 });

            sender.append('data');
            sender.dispose();

            jest.advanceTimersByTime(5000);

            expect(mockSend).not.toHaveBeenCalled();
        });

        it('clears the buffer', () => {
            const sender = new ProgressSender({ send: mockSend, throttleMs: 3000 });

            sender.append('data');
            sender.dispose();

            // Force emit after dispose — buffer should be empty
            sender.forceEmit();
            expect(mockSend).not.toHaveBeenCalled();
        });

        it('is safe to call multiple times', () => {
            const sender = new ProgressSender({ send: mockSend, throttleMs: 3000 });

            sender.append('data');
            sender.dispose();
            sender.dispose();

            expect(mockSend).not.toHaveBeenCalled();
        });

        it('can append new data after dispose', () => {
            const sender = new ProgressSender({ send: mockSend, throttleMs: 1000 });

            sender.append('old');
            sender.dispose();

            sender.append('new');
            jest.advanceTimersByTime(1000);

            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(mockSend).toHaveBeenCalledWith('<pre>new</pre>');
        });
    });

    describe('emit edge cases', () => {
        it('does not send when buffer is empty', () => {
            const sender = new ProgressSender({ send: mockSend, throttleMs: 1000 });

            sender.forceEmit();

            expect(mockSend).not.toHaveBeenCalled();
        });

        it('swallows send errors silently', () => {
            mockSend.mockRejectedValue(new Error('network'));
            const sender = new ProgressSender({ send: mockSend, throttleMs: 1000 });

            sender.append('data');
            // Should not throw
            expect(() => sender.forceEmit()).not.toThrow();
        });

        it('only creates one timer for multiple appends', () => {
            const sender = new ProgressSender({ send: mockSend, throttleMs: 1000 });

            sender.append('a');
            sender.append('b');
            sender.append('c');

            jest.advanceTimersByTime(1000);

            expect(mockSend).toHaveBeenCalledTimes(1);
            expect(mockSend).toHaveBeenCalledWith('<pre>abc</pre>');
        });
    });

    describe('default options', () => {
        it('defaults throttleMs to 3000', () => {
            const sender = new ProgressSender({ send: mockSend });

            sender.append('data');

            jest.advanceTimersByTime(2999);
            expect(mockSend).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1);
            expect(mockSend).toHaveBeenCalledTimes(1);
        });

        it('defaults maxLength to 4000', () => {
            const sender = new ProgressSender({ send: mockSend });

            const longText = 'x'.repeat(8000);
            sender.append(longText);
            sender.forceEmit();

            expect(mockSend).toHaveBeenCalledTimes(2);
        });

        it('defaults wrapInCodeBlock to true', () => {
            const sender = new ProgressSender({ send: mockSend });

            sender.append('test');
            sender.forceEmit();

            expect(mockSend).toHaveBeenCalledWith('<pre>test</pre>');
        });
    });
});
