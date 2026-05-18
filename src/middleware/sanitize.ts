import path from 'path';
import { realpathSync } from 'fs';

export const resolveSafePath = (inputPath: string, baseDir: string): string => {
    const resolvedPath = path.resolve(baseDir, inputPath);
    const normalizedBaseDir = path.resolve(baseDir);

    // SECURITY: Check for basic path traversal via ../
    const relative = path.relative(normalizedBaseDir, resolvedPath);
    if (relative && (relative.startsWith('..' + path.sep) || relative === '..')) {
        throw new Error('Path traversal detected');
    }

    // SECURITY: Resolve symlinks to prevent symlink-based path traversal on all platforms.
    // Without this, an attacker can create a symlink inside the workspace pointing outside it.
    try {
        const realPath = realpathSync(resolvedPath);
        const realBaseDir = realpathSync(normalizedBaseDir);

        if (!realPath.startsWith(realBaseDir + path.sep) && realPath !== realBaseDir) {
            throw new Error('Path traversal detected (symlink bypass attempt)');
        }

        return realPath;
    } catch (err: any) {
        // If realpath fails (e.g., file doesn't exist yet), fall back to resolved path.
        // Re-throw if it's our own traversal error.
        if (err.message.includes('Path traversal')) {
            throw err;
        }
        return resolvedPath;
    }
};
