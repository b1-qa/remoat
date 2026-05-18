import Database from 'better-sqlite3';

/**
 * Workspace binding record type definition
 */
export interface WorkspaceBindingRecord {
    /** Unique ID (auto-increment) */
    id: number;
    /** Channel / topic ID (unique) */
    channelId: string;
    /** Workspace relative path */
    workspacePath: string;
    /** Chat / group ID */
    guildId: string;
    /** Creation timestamp (ISO string) */
    createdAt?: string;
}

/**
 * Input type for binding creation
 */
export interface CreateWorkspaceBindingInput {
    channelId: string;
    workspacePath: string;
    guildId: string;
}

/**
 * Repository for persisting channel/topic to workspace directory bindings in SQLite.
 * Only one workspace can be bound per channel (UNIQUE constraint).
 */
export class WorkspaceBindingRepository {
    private readonly db: Database.Database;

    // Cached prepared statements
    private readonly stmtCreate: Database.Statement;
    private readonly stmtFindByChannelId: Database.Statement;
    private readonly stmtFindByWorkspacePathAndGuildId: Database.Statement;
    private readonly stmtFindByGuildId: Database.Statement;
    private readonly stmtFindAll: Database.Statement;
    private readonly stmtDeleteByChannelId: Database.Statement;
    private readonly stmtUpsert: Database.Statement;

    constructor(db: Database.Database) {
        this.db = db;
        this.initialize();

        this.stmtCreate = this.db.prepare(
            'INSERT INTO workspace_bindings (channel_id, workspace_path, guild_id) VALUES (?, ?, ?)'
        );
        this.stmtFindByChannelId = this.db.prepare(
            'SELECT * FROM workspace_bindings WHERE channel_id = ?'
        );
        this.stmtFindByWorkspacePathAndGuildId = this.db.prepare(
            'SELECT * FROM workspace_bindings WHERE workspace_path = ? AND guild_id = ? ORDER BY id ASC'
        );
        this.stmtFindByGuildId = this.db.prepare(
            'SELECT * FROM workspace_bindings WHERE guild_id = ? ORDER BY id ASC'
        );
        this.stmtFindAll = this.db.prepare(
            'SELECT * FROM workspace_bindings ORDER BY id ASC'
        );
        this.stmtDeleteByChannelId = this.db.prepare(
            'DELETE FROM workspace_bindings WHERE channel_id = ?'
        );
        this.stmtUpsert = this.db.prepare(`
            INSERT INTO workspace_bindings (channel_id, workspace_path, guild_id)
            VALUES (?, ?, ?)
            ON CONFLICT(channel_id) DO UPDATE SET
                workspace_path = excluded.workspace_path,
                guild_id = excluded.guild_id
        `);
    }

    private initialize(): void {
        this.db.exec(`
            CREATE TABLE IF NOT EXISTS workspace_bindings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                channel_id TEXT NOT NULL UNIQUE,
                workspace_path TEXT NOT NULL,
                guild_id TEXT NOT NULL,
                created_at TEXT NOT NULL DEFAULT (datetime('now'))
            )
        `);
    }

    public create(input: CreateWorkspaceBindingInput): WorkspaceBindingRecord {
        const result = this.stmtCreate.run(input.channelId, input.workspacePath, input.guildId);
        return {
            id: result.lastInsertRowid as number,
            channelId: input.channelId,
            workspacePath: input.workspacePath,
            guildId: input.guildId,
        };
    }

    public findByChannelId(channelId: string): WorkspaceBindingRecord | undefined {
        const row = this.stmtFindByChannelId.get(channelId) as any;
        if (!row) return undefined;
        return this.mapRow(row);
    }

    public findByWorkspacePathAndGuildId(workspacePath: string, guildId: string): WorkspaceBindingRecord[] {
        const rows = this.stmtFindByWorkspacePathAndGuildId.all(workspacePath, guildId) as any[];
        return rows.map(this.mapRow);
    }

    public findByGuildId(guildId: string): WorkspaceBindingRecord[] {
        const rows = this.stmtFindByGuildId.all(guildId) as any[];
        return rows.map(this.mapRow);
    }

    public findAll(): WorkspaceBindingRecord[] {
        const rows = this.stmtFindAll.all() as any[];
        return rows.map(this.mapRow);
    }

    public deleteByChannelId(channelId: string): boolean {
        const result = this.stmtDeleteByChannelId.run(channelId);
        return result.changes > 0;
    }

    public upsert(input: CreateWorkspaceBindingInput): WorkspaceBindingRecord {
        this.stmtUpsert.run(input.channelId, input.workspacePath, input.guildId);
        return this.findByChannelId(input.channelId)!;
    }

    private mapRow(row: any): WorkspaceBindingRecord {
        return {
            id: row.id,
            channelId: row.channel_id,
            workspacePath: row.workspace_path,
            guildId: row.guild_id,
            createdAt: row.created_at,
        };
    }
}
