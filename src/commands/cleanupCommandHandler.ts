import { ChatSessionRepository, ChatSessionRecord } from '../database/chatSessionRepository';
import { WorkspaceBindingRepository, WorkspaceBindingRecord } from '../database/workspaceBindingRepository';

export const CLEANUP_ARCHIVE_BTN = 'cleanup_archive';
export const CLEANUP_DELETE_BTN = 'cleanup_delete';
export const CLEANUP_CANCEL_BTN = 'cleanup_cancel';

export interface InactiveSession {
    binding: WorkspaceBindingRecord;
    session: ChatSessionRecord | undefined;
}

/**
 * Cleanup handler.
 * In Telegram mode, cleanup of topics is handled in the main bot via Forum Topic API.
 * This class retains DB cleanup utilities.
 */
export class CleanupCommandHandler {
    private readonly chatSessionRepo: ChatSessionRepository;
    private readonly bindingRepo: WorkspaceBindingRepository;

    constructor(
        chatSessionRepo: ChatSessionRepository,
        bindingRepo: WorkspaceBindingRepository,
    ) {
        this.chatSessionRepo = chatSessionRepo;
        this.bindingRepo = bindingRepo;
    }

    public cleanupByChannelId(channelId: string): void {
        this.chatSessionRepo.deleteByChannelId(channelId);
        this.bindingRepo.deleteByChannelId(channelId);
    }

    public findInactiveSessions(guildId: string, days: number): InactiveSession[] {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        const cutoffIso = cutoff.toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, '');

        const bindings = this.bindingRepo.findByGuildId(guildId);
        const inactive: InactiveSession[] = [];

        for (const binding of bindings) {
            const session = this.chatSessionRepo.findByChannelId(binding.channelId);
            const createdAt = session?.createdAt ?? binding.createdAt;
            if (createdAt && createdAt < cutoffIso) {
                inactive.push({ binding, session });
            }
        }

        return inactive;
    }
}
