import * as vscode from 'vscode';
import { t } from './i18n';
import * as crypto from 'crypto';

interface FileChange {
    uri: string; // Stored as string for persistence
    backupUri: string;
}

interface HistoryItem {
    id: string; // Unique ID for the batch
    timestamp: number;
    files: FileChange[];
}

export class HistoryManager {
    private static readonly STORAGE_KEY = 'formatDirectory.history';
    private static readonly MAX_HISTORY_ITEMS = 20;
    private static readonly BACKUP_CONCURRENCY = 50;

    constructor(private context: vscode.ExtensionContext) { }

    private getHistory(): HistoryItem[] {
        return this.context.globalState.get<HistoryItem[]>(HistoryManager.STORAGE_KEY) || [];
    }

    private async saveHistory(history: HistoryItem[]) {
        await this.context.globalState.update(HistoryManager.STORAGE_KEY, history);
    }

    private async createBackupDir(): Promise<vscode.Uri> {
        const backupDir = vscode.Uri.joinPath(this.context.globalStorageUri, 'backups');
        try {
            await vscode.workspace.fs.createDirectory(backupDir);
        } catch (e) {
            // Context might throw if it exists, perfectly fine to ignore
        }
        return backupDir;
    }

    /**
     * Generate a collision-resistant backup filename using path hash + short index
     */
    private getBackupFileName(batchId: string, fsPath: string, index: number): string {
        const hash = crypto.createHash('md5').update(fsPath).digest('hex').slice(0, 8);
        const baseName = fsPath.replace(/[^a-zA-Z0-9.\-]/g, '_');
        return `${batchId}_${index}_${baseName}_${hash}.bak`;
    }

    public async add(files: vscode.Uri[]): Promise<string> {
        const changes: FileChange[] = [];
        const backupDir = await this.createBackupDir();
        const batchId = Date.now().toString();

        // Parallelize backup operations in batches
        const CONCURRENCY = HistoryManager.BACKUP_CONCURRENCY;

        for (let i = 0; i < files.length; i += CONCURRENCY) {
            const batch = files.slice(i, i + CONCURRENCY);
            const batchResults = await Promise.all(batch.map(async (file, batchIdx) => {
                const globalIdx = i + batchIdx;
                try {
                    const content = await vscode.workspace.fs.readFile(file);
                    const backupFileName = this.getBackupFileName(batchId, file.fsPath, globalIdx);
                    const backupUri = vscode.Uri.joinPath(backupDir, backupFileName);

                    await vscode.workspace.fs.writeFile(backupUri, content);

                    return {
                        uri: file.toString(),
                        backupUri: backupUri.toString()
                    };
                } catch (error) {
                    console.error(`Failed to read file for history: ${file.fsPath}`, error);
                    return null;
                }
            }));

            for (const result of batchResults) {
                if (result) {
                    changes.push(result);
                }
            }
        }

        if (changes.length === 0) {
            return '';
        }

        const history = this.getHistory();
        const newItem: HistoryItem = {
            id: batchId,
            timestamp: Date.now(),
            files: changes
        };

        history.push(newItem);

        // Limit history size
        if (history.length > HistoryManager.MAX_HISTORY_ITEMS) {
            const removedItem = history.shift();
            // Delete backing files for older history to reclaim storage (parallel)
            if (removedItem) {
                await Promise.all(removedItem.files.map(change =>
                    vscode.workspace.fs.delete(vscode.Uri.parse(change.backupUri)).then(() => { }, () => { })
                ));
            }
        }

        await this.saveHistory(history);
        return newItem.id;
    }

    public async undo(): Promise<void> {
        const history = this.getHistory();
        if (history.length === 0) {
            vscode.window.showInformationMessage(t('formatDirectory.noHistory'));
            return;
        }

        const lastItem = history.pop();
        if (!lastItem) {
            return;
        }

        const progressOptions: vscode.ProgressOptions = {
            location: vscode.ProgressLocation.Notification,
            title: t('formatDirectory.undoTitle'),
            cancellable: false
        };

        try {
            await vscode.window.withProgress(progressOptions, async (progress) => {
                let restoredCount = 0;
                const CONCURRENCY = HistoryManager.BACKUP_CONCURRENCY;

                for (let i = 0; i < lastItem.files.length; i += CONCURRENCY) {
                    const batch = lastItem.files.slice(i, i + CONCURRENCY);
                    const batchResults = await Promise.all(batch.map(async (change) => {
                        try {
                            const uri = vscode.Uri.parse(change.uri);
                            const backupUri = vscode.Uri.parse(change.backupUri);

                            const backupContentBytes = await vscode.workspace.fs.readFile(backupUri);
                            const backupStr = Buffer.from(backupContentBytes).toString('utf8');

                            const edit = new vscode.WorkspaceEdit();

                            const document = await vscode.workspace.openTextDocument(uri);
                            const fullRange = new vscode.Range(
                                document.positionAt(0),
                                document.positionAt(document.getText().length)
                            );

                            edit.replace(uri, fullRange, backupStr);
                            await vscode.workspace.applyEdit(edit);
                            await document.save();

                            // Cleanup restored backup
                            await vscode.workspace.fs.delete(backupUri).then(() => { }, () => { });

                            return true;
                        } catch (err) {
                            console.error(`Failed to restore file: ${change.uri}`, err);
                            return false;
                        }
                    }));

                    for (const result of batchResults) {
                        if (result) {
                            restoredCount++;
                        }
                    }
                }

                await this.saveHistory(history);
                vscode.window.showInformationMessage(t('formatDirectory.undoComplete', restoredCount));
            });
        } catch (error: any) {
            vscode.window.showErrorMessage(t('formatDirectory.undoFailed', error.message));
        }
    }
}
