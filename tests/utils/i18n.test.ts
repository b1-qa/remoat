jest.mock('fs', () => ({
    existsSync: jest.fn().mockReturnValue(false),
    readFileSync: jest.fn().mockReturnValue('{}'),
}));

import { t, initI18n } from '../../src/utils/i18n';

describe('i18n', () => {
    beforeEach(() => {
        // Reset to English with no translations loaded (files don't exist)
        initI18n('en');
    });

    describe('t()', () => {
        it('returns the key as-is when no translation exists', () => {
            expect(t('hello.world')).toBe('hello.world');
        });

        it('returns the key when translations are empty', () => {
            expect(t('some.key')).toBe('some.key');
        });

        it('substitutes variables using {{key}} syntax', () => {
            const result = t('Hello {{name}}, you have {{count}} messages', {
                name: 'Alice',
                count: 5,
            });
            expect(result).toBe('Hello Alice, you have 5 messages');
        });

        it('replaces all occurrences of the same variable', () => {
            const result = t('{{x}} and {{x}} again', { x: 'test' });
            expect(result).toBe('test and test again');
        });

        it('handles numeric variable values', () => {
            const result = t('Count: {{n}}', { n: 42 });
            expect(result).toBe('Count: 42');
        });

        it('handles boolean variable values', () => {
            const result = t('Active: {{val}}', { val: true });
            expect(result).toBe('Active: true');
        });

        it('handles null/undefined variable values', () => {
            const result = t('Value: {{v}}', { v: null });
            expect(result).toBe('Value: null');
        });

        it('does not substitute when no variables provided', () => {
            const result = t('Hello {{name}}');
            expect(result).toBe('Hello {{name}}');
        });

        it('handles empty variables object', () => {
            const result = t('Hello {{name}}', {});
            expect(result).toBe('Hello {{name}}');
        });

        // Bug fix: uses replaceAll instead of regex — special chars in keys are safe
        it('handles variable keys with dots (no regex interpretation)', () => {
            const result = t('Path: {{file.name}}', { 'file.name': 'test.ts' });
            expect(result).toBe('Path: test.ts');
        });

        it('handles empty string key', () => {
            expect(t('')).toBe('');
        });
    });

    describe('initI18n()', () => {
        it('defaults to English', () => {
            initI18n();
            // Should not throw, key returned as-is
            expect(t('test.key')).toBe('test.key');
        });

        it('accepts ja language', () => {
            initI18n('ja');
            // Falls back to key when no translation
            expect(t('test.key')).toBe('test.key');
        });
    });
});
