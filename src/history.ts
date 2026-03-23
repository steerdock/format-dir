import * as vscode from 'vscode';
import { t } from './i18n';

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

    public async add(files: vscode.Uri[]): Promise<string> {
        const changes: FileChange[] = [];
        const backupDir = await this.createBackupDir();
        const batchId = Date.now().toString();

        for (const file of files) {
            try {
                // Fast read to buffer without loading to editor memory
                const content = await vscode.workspace.fs.readFile(file);
                
                const safeName = file.fsPath.replace(/[^a-zA-Z0-9.\-]/g, '_');
                const backupUri = vscode.Uri.joinPath(backupDir, `${batchId}_${safeName}.bak`);
                
                await vscode.workspace.fs.writeFile(backupUri, content);

                changes.push({
                    uri: file.toString(),
                    backupUri: backupUri.toString()
                });
            } catch (error) {
                console.error(`Failed to read file for history: ${file.fsPath}`, error);
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
            // Delete backing files for older history to reclaim storage
            if (removedItem) {
                for (const change of removedItem.files) {
                    try {
                        await vscode.workspace.fs.delete(vscode.Uri.parse(change.backupUri));
                    } catch (e) {
                        // ignore if file doesn't exist
                    }
                }
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

                for (const change of lastItem.files) {
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

                        // Cleanup restored backup manually
                        try {
                            await vscode.workspace.fs.delete(backupUri);
                        } catch (e) {
                            // ignore cleanup error
                        }

                        restoredCount++;
                    } catch (err) {
                        console.error(`Failed to restore file: ${change.uri}`, err);
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
