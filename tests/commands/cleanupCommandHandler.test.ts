import {
    CleanupCommandHandler,
    CLEANUP_ARCHIVE_BTN,
    CLEANUP_DELETE_BTN,
    CLEANUP_CANCEL_BTN,
} from '../../src/commands/cleanupCommandHandler';

describe('CleanupCommandHandler', () => {
    let handler: CleanupCommandHandler;
    let mockSessionRepo: { deleteByChannelId: jest.Mock };
    let mockBindingRepo: { deleteByChannelId: jest.Mock };

    beforeEach(() => {
        mockSessionRepo = { deleteByChannelId: jest.fn() };
        mockBindingRepo = { deleteByChannelId: jest.fn() };
        handler = new CleanupCommandHandler(mockSessionRepo as any, mockBindingRepo as any);
    });

    it('exports button ID constants', () => {
        expect(CLEANUP_ARCHIVE_BTN).toBe('cleanup_archive');
        expect(CLEANUP_DELETE_BTN).toBe('cleanup_delete');
        expect(CLEANUP_CANCEL_BTN).toBe('cleanup_cancel');
    });

    describe('cleanupByChannelId()', () => {
        it('deletes sessions and bindings for the channel', () => {
            handler.cleanupByChannelId('channel-123');

            expect(mockSessionRepo.deleteByChannelId).toHaveBeenCalledWith('channel-123');
            expect(mockBindingRepo.deleteByChannelId).toHaveBeenCalledWith('channel-123');
        });

        it('throws without calling binding repo when session repo throws', () => {
            mockSessionRepo.deleteByChannelId.mockImplementation(() => {
                throw new Error('DB error');
            });

            expect(() => handler.cleanupByChannelId('ch-1')).toThrow('DB error');
            // Binding repo is not called because session repo throws first
            expect(mockSessionRepo.deleteByChannelId).toHaveBeenCalled();
        });
    });
});
