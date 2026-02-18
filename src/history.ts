import * as vscode from 'vscode';
import { t } from './i18n';

interface FileChange {
    uri: string; // Stored as string for persistence
    originalContent: string;
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

    public async add(files: vscode.Uri[]): Promise<string> {
        const changes: FileChange[] = [];

        for (const file of files) {
            try {
                const document = await vscode.workspace.openTextDocument(file);
                changes.push({
                    uri: file.toString(),
                    originalContent: document.getText()
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
            id: Date.now().toString(),
            timestamp: Date.now(),
            files: changes
        };

        history.push(newItem);

        // Limit history size
        if (history.length > HistoryManager.MAX_HISTORY_ITEMS) {
            history.shift();
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
                        const edit = new vscode.WorkspaceEdit();

                        // We need to replace the entire content. 
                        // The safest way is to read the current doc to get the full range.
                        const document = await vscode.workspace.openTextDocument(uri);
                        const fullRange = new vscode.Range(
                            document.positionAt(0),
                            document.positionAt(document.getText().length)
                        );

                        edit.replace(uri, fullRange, change.originalContent);
                        await vscode.workspace.applyEdit(edit);
                        await document.save();
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
            // If failed, maybe we shouldn't pop? But it's partial... let's keep it popped to avoid consistency issues.
        }
    }
}
