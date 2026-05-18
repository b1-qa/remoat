import { ChatSessionService } from '../services/chatSessionService';
import { ChatSessionRepository } from '../database/chatSessionRepository';
import { WorkspaceBindingRepository } from '../database/workspaceBindingRepository';
import { CdpConnectionPool } from '../services/cdpConnectionPool';
import { WorkspaceService } from '../services/workspaceService';

/**
 * Join/mirror handler.
 * In Telegram mode, /join is handled via inline keyboard callbacks in the main bot.
 * This class provides utility methods.
 */
export class JoinCommandHandler {
    private readonly chatSessionService: ChatSessionService;
    private readonly chatSessionRepo: ChatSessionRepository;
    private readonly bindingRepo: WorkspaceBindingRepository;
    private readonly pool: CdpConnectionPool;
    private readonly workspaceService: WorkspaceService;

    constructor(
        chatSessionService: ChatSessionService,
        chatSessionRepo: ChatSessionRepository,
        bindingRepo: WorkspaceBindingRepository,
        pool: CdpConnectionPool,
        workspaceService: WorkspaceService,
    ) {
        this.chatSessionService = chatSessionService;
        this.chatSessionRepo = chatSessionRepo;
        this.bindingRepo = bindingRepo;
        this.pool = pool;
        this.workspaceService = workspaceService;
    }

    public resolveProjectPath(projectName: string): string {
        return this.workspaceService.getWorkspacePath(projectName);
    }
}
