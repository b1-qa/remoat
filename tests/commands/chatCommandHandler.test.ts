import { ChatCommandHandler } from '../../src/commands/chatCommandHandler';

describe('ChatCommandHandler', () => {
    let handler: ChatCommandHandler;
    let mockSessionService: {};
    let mockSessionRepo: {};
    let mockBindingRepo: {};
    let mockWorkspaceService: {};

    beforeEach(() => {
        mockSessionService = { createSession: jest.fn() };
        mockSessionRepo = { findByChannelId: jest.fn() };
        mockBindingRepo = { findByChannelId: jest.fn() };
        mockWorkspaceService = { getWorkspacePath: jest.fn() };
    });

    it('returns session service via getSessionService()', () => {
        handler = new ChatCommandHandler(
            mockSessionService as any,
            mockSessionRepo as any,
            mockBindingRepo as any,
            mockWorkspaceService as any,
        );

        expect(handler.getSessionService()).toBe(mockSessionService);
    });

    it('returns session repo via getSessionRepo()', () => {
        handler = new ChatCommandHandler(
            mockSessionService as any,
            mockSessionRepo as any,
            mockBindingRepo as any,
            mockWorkspaceService as any,
        );

        expect(handler.getSessionRepo()).toBe(mockSessionRepo);
    });

    it('accepts optional CdpConnectionPool', () => {
        const mockPool = {} as any;
        handler = new ChatCommandHandler(
            mockSessionService as any,
            mockSessionRepo as any,
            mockBindingRepo as any,
            mockWorkspaceService as any,
            mockPool,
        );

        // Should not throw
        expect(handler).toBeDefined();
    });

    it('defaults pool to null when not provided', () => {
        handler = new ChatCommandHandler(
            mockSessionService as any,
            mockSessionRepo as any,
            mockBindingRepo as any,
            mockWorkspaceService as any,
        );

        expect(handler).toBeDefined();
    });
});
