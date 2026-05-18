import { WorkspaceCommandHandler } from '../../src/commands/workspaceCommandHandler';

describe('WorkspaceCommandHandler', () => {
    let handler: WorkspaceCommandHandler;
    let mockBindingRepo: { findByChannelId: jest.Mock };
    let mockSessionRepo: {};
    let mockWorkspaceService: { getWorkspacePath: jest.Mock };

    beforeEach(() => {
        mockBindingRepo = { findByChannelId: jest.fn() };
        mockSessionRepo = {};
        mockWorkspaceService = { getWorkspacePath: jest.fn() };
        handler = new WorkspaceCommandHandler(
            mockBindingRepo as any,
            mockSessionRepo as any,
            mockWorkspaceService as any,
        );
    });

    describe('getWorkspaceForChannel()', () => {
        it('returns workspace path when binding exists', () => {
            mockBindingRepo.findByChannelId.mockReturnValue({ workspacePath: 'my-project' });
            mockWorkspaceService.getWorkspacePath.mockReturnValue('/home/user/my-project');

            const result = handler.getWorkspaceForChannel('channel-1');

            expect(result).toBe('/home/user/my-project');
            expect(mockBindingRepo.findByChannelId).toHaveBeenCalledWith('channel-1');
            expect(mockWorkspaceService.getWorkspacePath).toHaveBeenCalledWith('my-project');
        });

        it('returns undefined when no binding exists', () => {
            mockBindingRepo.findByChannelId.mockReturnValue(null);

            const result = handler.getWorkspaceForChannel('unknown-channel');

            expect(result).toBeUndefined();
            expect(mockWorkspaceService.getWorkspacePath).not.toHaveBeenCalled();
        });
    });
});
