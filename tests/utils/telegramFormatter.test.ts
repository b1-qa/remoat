import {
    escapeHtml,
    formatForTelegram,
    splitOutputAndLogs,
    separateOutputForDelivery,
    sanitizeActivityLines,
} from '../../src/utils/telegramFormatter';

describe('telegramFormatter', () => {
    describe('escapeHtml()', () => {
        it('escapes &, <, >', () => {
            expect(escapeHtml('a & b < c > d')).toBe('a &amp; b &lt; c &gt; d');
        });

        it('handles empty string', () => {
            expect(escapeHtml('')).toBe('');
        });

        it('handles strings with no special chars', () => {
            expect(escapeHtml('hello world')).toBe('hello world');
        });

        it('escapes multiple occurrences', () => {
            expect(escapeHtml('<<>>')).toBe('&lt;&lt;&gt;&gt;');
        });
    });

    describe('formatForTelegram()', () => {
        it('wraps code blocks in <pre>', () => {
            const text = '```\nconst x = 1;\n```';
            const result = formatForTelegram(text);
            expect(result).toContain('<pre>');
            expect(result).toContain('</pre>');
        });

        it('supports language-tagged code blocks', () => {
            const text = '```typescript\nconst x = 1;\n```';
            const result = formatForTelegram(text);
            expect(result).toContain('language-typescript');
        });

        it('escapes HTML inside code blocks', () => {
            const text = '```\n<div>test</div>\n```';
            const result = formatForTelegram(text);
            expect(result).toContain('&lt;div&gt;');
        });

        it('converts markdown headings to bold', () => {
            expect(formatForTelegram('## Heading')).toContain('<b>Heading</b>');
        });

        it('converts **bold** to <b>', () => {
            expect(formatForTelegram('**bold**')).toContain('<b>bold</b>');
        });

        it('converts *italic* to <i>', () => {
            expect(formatForTelegram('*italic*')).toContain('<i>italic</i>');
        });

        it('converts ~~strikethrough~~ to <s>', () => {
            expect(formatForTelegram('~~deleted~~')).toContain('<s>deleted</s>');
        });

        it('converts `inline code` to <code>', () => {
            expect(formatForTelegram('use `npm install`')).toContain('<code>npm install</code>');
        });

        it('converts markdown links to HTML links', () => {
            const result = formatForTelegram('[click](https://example.com)');
            expect(result).toContain('<a href="https://example.com">click</a>');
        });

        it('wraps table lines in <pre>', () => {
            const text = '| Name | Age |\n| --- | --- |\n| Alice | 30 |';
            const result = formatForTelegram(text);
            expect(result).toContain('<pre>');
        });

        it('wraps tree lines in <pre>', () => {
            const text = '├── src\n│   ├── index.ts\n└── package.json';
            const result = formatForTelegram(text);
            expect(result).toContain('<pre>');
        });

        it('handles blockquote lines (> text)', () => {
            const result = formatForTelegram('> This is a quote');
            expect(result).toContain('<blockquote>');
            expect(result).toContain('This is a quote');
        });

        it('closes unclosed code blocks', () => {
            const text = '```\nconst x = 1;';
            const result = formatForTelegram(text);
            expect(result).toContain('</pre>');
        });

        it('handles horizontal rules', () => {
            expect(formatForTelegram('---')).toContain('---');
        });

        it('wraps file references in <code>', () => {
            const result = formatForTelegram('See src/utils/config.ts for details');
            expect(result).toContain('<code>src/utils/config.ts</code>');
        });
    });

    describe('splitOutputAndLogs()', () => {
        it('returns empty output and logs for empty input', () => {
            const result = splitOutputAndLogs('');
            expect(result.output).toBe('');
            expect(result.logs).toBe('');
        });

        it('classifies UI chrome lines as logs', () => {
            const text = 'analyzed\nHello world\nreading files';
            const result = splitOutputAndLogs(text);
            expect(result.output).toContain('Hello world');
            expect(result.logs).toContain('analyzed');
            expect(result.logs).toContain('reading files');
        });

        it('classifies activity log lines as logs', () => {
            const text = 'reading src/index.ts\nHere is the result\nwriting output.txt';
            const result = splitOutputAndLogs(text);
            expect(result.output).toContain('Here is the result');
            expect(result.logs).toContain('reading src/index.ts');
        });

        it('preserves code blocks as output', () => {
            const text = '```\nconst x = 1;\n```';
            const result = splitOutputAndLogs(text);
            expect(result.output).toContain('const x = 1');
        });

        it('handles null/undefined input', () => {
            expect(splitOutputAndLogs(null as any).output).toBe('');
            expect(splitOutputAndLogs(undefined as any).output).toBe('');
        });

        it('handles text with only UI chrome', () => {
            const text = 'analyzed\nthinking\nprocessing';
            const result = splitOutputAndLogs(text);
            expect(result.output).toBe('');
            expect(result.logs.length).toBeGreaterThan(0);
        });

        it('handles text with no chrome lines', () => {
            const text = 'Hello world\nThis is output';
            const result = splitOutputAndLogs(text);
            expect(result.output).toContain('Hello world');
            expect(result.logs).toBe('');
        });
    });

    describe('separateOutputForDelivery()', () => {
        it('uses dom-structured source when available', () => {
            const result = separateOutputForDelivery({
                rawText: 'raw text',
                domSource: 'dom-structured',
                domOutputText: 'structured output',
                domActivityLines: ['line1', 'line2'],
            });
            expect(result.source).toBe('dom-structured');
            expect(result.output).toBe('structured output');
            expect(result.logs).toBe('line1\nline2');
        });

        it('falls back to legacy-fallback when domSource is not structured', () => {
            const result = separateOutputForDelivery({
                rawText: 'Hello world',
                domSource: 'legacy-fallback',
            });
            expect(result.source).toBe('legacy-fallback');
            expect(result.output).toContain('Hello world');
        });

        it('falls back when domOutputText is undefined', () => {
            const result = separateOutputForDelivery({
                rawText: 'Hello world',
                domSource: 'dom-structured',
                domOutputText: undefined,
            });
            expect(result.source).toBe('legacy-fallback');
        });
    });

    describe('sanitizeActivityLines()', () => {
        it('removes UI chrome lines', () => {
            const result = sanitizeActivityLines('analyzed\nreal content\nthinking');
            expect(result).toBe('real content');
        });

        it('deduplicates lines', () => {
            const result = sanitizeActivityLines('foo\nfoo\nbar');
            expect(result).toBe('foo\nbar');
        });

        it('trims and filters empty lines', () => {
            const result = sanitizeActivityLines('  hello  \n\n  world  ');
            expect(result).toBe('hello\nworld');
        });

        it('handles empty input', () => {
            expect(sanitizeActivityLines('')).toBe('');
            expect(sanitizeActivityLines(null as any)).toBe('');
        });
    });
});
