import { ChatSessionService } from '../services/chatSessionService';
import { ChatSessionRepository } from '../database/chatSessionRepository';
import { WorkspaceBindingRepository } from '../database/workspaceBindingRepository';
import { CdpConnectionPool } from '../services/cdpConnectionPool';
import { WorkspaceService } from '../services/workspaceService';

/**
 * Chat command handler.
 * In Telegram mode, /new and /chat are handled directly in the main bot.
 * This class provides shared utilities.
 */
export class ChatCommandHandler {
    private readonly chatSessionService: ChatSessionService;
    private readonly chatSessionRepo: ChatSessionRepository;
    private readonly bindingRepo: WorkspaceBindingRepository;
    private readonly pool: CdpConnectionPool | null;
    private readonly workspaceService: WorkspaceService;

    constructor(
        chatSessionService: ChatSessionService,
        chatSessionRepo: ChatSessionRepository,
        bindingRepo: WorkspaceBindingRepository,
        workspaceService: WorkspaceService,
        pool?: CdpConnectionPool,
    ) {
        this.chatSessionService = chatSessionService;
        this.chatSessionRepo = chatSessionRepo;
        this.bindingRepo = bindingRepo;
        this.workspaceService = workspaceService;
        this.pool = pool ?? null;
    }

    public getSessionService(): ChatSessionService {
        return this.chatSessionService;
    }

    public getSessionRepo(): ChatSessionRepository {
        return this.chatSessionRepo;
    }
}
