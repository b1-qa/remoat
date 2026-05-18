import { ProgressSender } from '../../src/services/progressSender';

describe('ProgressSender', () => {
    let mockSend: jest.Mock;

    beforeEach(() => {
        jest.useFakeTimers();
        mockSend = jest.fn().mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.useRealTimers();
        jest.clearAllMocks();
    });

    it('should throttle send calls', () => {
        const sender = new ProgressSender({ send: mockSend, throttleMs: 3000 });

        sender.append('chunk 1\n');
        sender.append('chunk 2\n');
        sender.append('chunk 3\n');

        expect(mockSend).not.toHaveBeenCalled();

        jest.advanceTimersByTime(3000);

        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend).toHaveBeenCalledWith(
            expect.stringContaining('chunk 1\nchunk 2\nchunk 3\n'),
        );
    });

    it('should send immediately if forced', () => {
        const sender = new ProgressSender({ send: mockSend, throttleMs: 3000 });

        sender.append('chunk 1\n');
        sender.forceEmit();

        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend).toHaveBeenCalledWith(
            expect.stringContaining('chunk 1\n'),
        );
    });

    it('should split if max length is exceeded', () => {
        const sender = new ProgressSender({ send: mockSend, throttleMs: 3000, maxLength: 50 });

        const longString = 'This is a very long string that will definitely exceed the fifty character limit for this test case.';

        sender.append(longString);

        jest.advanceTimersByTime(3000);

        const expectedChunks = Math.ceil(longString.length / 50);
        expect(mockSend).toHaveBeenCalledTimes(expectedChunks);

        const sentBody = mockSend.mock.calls
            .map((call) => String(call[0] ?? ''))
            .join('')
            .replace(/<\/?pre>/g, '')
            .replace(/\n/g, '');
        expect(sentBody).toContain(longString);
    });

    it('should use send function without code block wrapping', () => {
        const sender = new ProgressSender({
            send: mockSend,
            throttleMs: 1000,
            wrapInCodeBlock: false,
        });

        sender.append('line 1\n');
        jest.advanceTimersByTime(1000);

        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend).toHaveBeenCalledWith('line 1\n');
    });

    it('wraps in <pre> tags by default', () => {
        const sender = new ProgressSender({ send: mockSend, throttleMs: 1000 });

        sender.append('code output');
        jest.advanceTimersByTime(1000);

        expect(mockSend).toHaveBeenCalledTimes(1);
        expect(mockSend).toHaveBeenCalledWith('<pre>code output</pre>');
    });
});
