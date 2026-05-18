export interface ProgressSenderOptions {
    send: (content: string) => Promise<unknown>;
    throttleMs?: number;
    maxLength?: number;
    wrapInCodeBlock?: boolean;
}

export class ProgressSender {
    private throttleMs: number;
    private maxLength: number;
    private wrapInCodeBlock: boolean;

    private buffer: string = '';
    private timer: NodeJS.Timeout | null = null;

    private sendContent: (content: string) => Promise<unknown>;

    constructor(options: ProgressSenderOptions) {
        this.sendContent = options.send;
        this.throttleMs = options.throttleMs ?? 3000;
        this.maxLength = options.maxLength ?? 4000;
        this.wrapInCodeBlock = options.wrapInCodeBlock ?? true;
    }

    public append(text: string) {
        this.buffer += text;
        if (!this.timer) {
            this.timer = setTimeout(() => {
                this.emit();
            }, this.throttleMs);
        }
    }

    public forceEmit() {
        this.emit();
    }

    public dispose() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        this.buffer = '';
    }

    private emit() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }

        if (!this.buffer) return;
        const payload = this.buffer;
        this.buffer = '';

        const chunks = this.splitByLength(payload, this.maxLength);
        for (const chunk of chunks) {
            const escaped = chunk.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            const content = this.wrapInCodeBlock ? `<pre>${escaped}</pre>` : chunk;
            this.sendContent(content).catch(() => { });
        }
    }

    private splitByLength(text: string, maxLength: number): string[] {
        if (text.length <= maxLength) {
            return [text];
        }

        const result: string[] = [];
        let cursor = 0;
        while (cursor < text.length) {
            result.push(text.slice(cursor, cursor + maxLength));
            cursor += maxLength;
        }
        return result;
    }
}
