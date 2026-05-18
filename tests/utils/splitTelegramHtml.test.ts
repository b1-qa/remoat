import { splitTelegramHtml } from '../../src/utils/telegramFormatter';

describe('splitTelegramHtml', () => {
    it('returns single chunk when text is under limit', () => {
        const text = 'Hello world';
        expect(splitTelegramHtml(text, 100)).toEqual([text]);
    });

    it('returns original text in array when exactly at limit', () => {
        const text = 'a'.repeat(100);
        expect(splitTelegramHtml(text, 100)).toEqual([text]);
    });

    it('splits at line boundaries', () => {
        const line1 = 'a'.repeat(40);
        const line2 = 'b'.repeat(40);
        const line3 = 'c'.repeat(40);
        const text = `${line1}\n${line2}\n${line3}`;
        const chunks = splitTelegramHtml(text, 85);
        expect(chunks.length).toBe(2);
        expect(chunks[0]).toBe(`${line1}\n${line2}`);
        expect(chunks[1]).toBe(line3);
    });

    it('closes and reopens <b> tags across chunks', () => {
        const inner = 'x'.repeat(50);
        const text = `<b>${inner}\n${inner}</b>`;
        const chunks = splitTelegramHtml(text, 60);
        expect(chunks.length).toBe(2);
        expect(chunks[0]).toContain('</b>');
        expect(chunks[1]).toMatch(/^<b>/);
        expect(chunks[1]).toContain('</b>');
    });

    it('closes and reopens <pre><code> across chunks', () => {
        const codeLine1 = 'const a = 1;';
        const codeLine2 = 'const b = 2;';
        const codeLine3 = 'const c = 3;';
        const text = `<pre><code>${codeLine1}\n${codeLine2}\n${codeLine3}</code></pre>`;
        const chunks = splitTelegramHtml(text, 50);
        expect(chunks.length).toBeGreaterThanOrEqual(2);
        // Each chunk should be valid HTML (closed tags)
        for (const chunk of chunks) {
            const opens = (chunk.match(/<pre>/g) || []).length;
            const closes = (chunk.match(/<\/pre>/g) || []).length;
            expect(opens).toBe(closes);
        }
    });

    it('handles nested <pre><code class="language-ts"> tags', () => {
        const lines = Array.from({ length: 10 }, (_, i) => `line ${i}`).join('\n');
        const text = `<pre><code class="language-ts">${lines}</code></pre>`;
        const chunks = splitTelegramHtml(text, 60);
        expect(chunks.length).toBeGreaterThanOrEqual(2);
        // First chunk should contain opening tag
        expect(chunks[0]).toContain('<pre>');
        // All chunks should close their tags
        for (const chunk of chunks) {
            if (chunk.includes('<pre>')) {
                expect(chunk).toContain('</pre>');
            }
            if (chunk.includes('<code')) {
                expect(chunk).toContain('</code>');
            }
        }
    });

    it('hard-splits a single very long line', () => {
        const text = 'x'.repeat(200);
        const chunks = splitTelegramHtml(text, 80);
        expect(chunks.length).toBe(3);
        expect(chunks.join('')).toBe(text);
    });

    it('handles empty string', () => {
        expect(splitTelegramHtml('', 100)).toEqual(['']);
    });

    it('handles text with <i> tags', () => {
        const text = `<i>${'a'.repeat(30)}\n${'b'.repeat(30)}</i>`;
        const chunks = splitTelegramHtml(text, 40);
        expect(chunks.length).toBeGreaterThanOrEqual(2);
        for (const chunk of chunks) {
            const opens = (chunk.match(/<i>/g) || []).length;
            const closes = (chunk.match(/<\/i>/g) || []).length;
            expect(opens).toBe(closes);
        }
    });

    it('preserves content across all chunks', () => {
        const lines = Array.from({ length: 20 }, (_, i) => `Line ${i}: ${'x'.repeat(30)}`);
        const text = lines.join('\n');
        const chunks = splitTelegramHtml(text, 200);
        // All original lines should appear across chunks
        const combined = chunks.join('\n');
        for (const line of lines) {
            expect(combined).toContain(line);
        }
    });

    it('does not produce chunks exceeding maxLen', () => {
        const lines = Array.from({ length: 50 }, (_, i) => `Line ${i}: ${'data'.repeat(10)}`);
        const text = lines.join('\n');
        const maxLen = 300;
        const chunks = splitTelegramHtml(text, maxLen);
        for (const chunk of chunks) {
            expect(chunk.length).toBeLessThanOrEqual(maxLen);
        }
    });

    it('handles mixed tags and plain text', () => {
        const text = `Hello\n<b>bold text</b>\n<pre>code here</pre>\nplain text\n<i>italic</i>`;
        const chunks = splitTelegramHtml(text, 40);
        expect(chunks.length).toBeGreaterThanOrEqual(2);
        const combined = chunks.join('\n');
        expect(combined).toContain('Hello');
        expect(combined).toContain('plain text');
    });
});
