import { WorkspaceBindingRepository } from '../database/workspaceBindingRepository';
import { ChatSessionRepository } from '../database/chatSessionRepository';
import { WorkspaceService } from '../services/workspaceService';

export { PROJECT_SELECT_ID, WORKSPACE_SELECT_ID } from '../ui/projectListUi';

/**
 * Workspace command handler.
 * In Telegram mode, project selection is handled inline via callbacks in the main bot.
 * This handler provides utility methods for workspace resolution.
 */
export class WorkspaceCommandHandler {
    private readonly bindingRepo: WorkspaceBindingRepository;
    private readonly chatSessionRepo: ChatSessionRepository;
    private readonly workspaceService: WorkspaceService;

    constructor(
        bindingRepo: WorkspaceBindingRepository,
        chatSessionRepo: ChatSessionRepository,
        workspaceService: WorkspaceService,
    ) {
        this.bindingRepo = bindingRepo;
        this.chatSessionRepo = chatSessionRepo;
        this.workspaceService = workspaceService;
    }

    public getWorkspaceForChannel(channelId: string): string | undefined {
        const binding = this.bindingRepo.findByChannelId(channelId);
        if (!binding) return undefined;
        return this.workspaceService.getWorkspacePath(binding.workspacePath);
    }
}
