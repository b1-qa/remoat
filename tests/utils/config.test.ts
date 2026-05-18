import { resolveResponseDeliveryMode } from '../../src/utils/config';

describe('config', () => {
    describe('resolveResponseDeliveryMode()', () => {
        it('always returns "stream"', () => {
            expect(resolveResponseDeliveryMode()).toBe('stream');
        });
    });
});
