import { JoinCommandHandler } from '../../src/commands/joinCommandHandler';

describe('JoinCommandHandler', () => {
    let handler: JoinCommandHandler;
    let mockWorkspaceService: { getWorkspacePath: jest.Mock };

    beforeEach(() => {
        mockWorkspaceService = { getWorkspacePath: jest.fn() };
        handler = new JoinCommandHandler(
            {} as any, // chatSessionService
            {} as any, // chatSessionRepo
            {} as any, // bindingRepo
            {} as any, // pool
            mockWorkspaceService as any,
        );
    });

    describe('resolveProjectPath()', () => {
        it('delegates to workspaceService.getWorkspacePath', () => {
            mockWorkspaceService.getWorkspacePath.mockReturnValue('/home/user/code/my-project');

            const result = handler.resolveProjectPath('my-project');

            expect(result).toBe('/home/user/code/my-project');
            expect(mockWorkspaceService.getWorkspacePath).toHaveBeenCalledWith('my-project');
        });
    });
});
