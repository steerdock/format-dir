import * as vscode from 'vscode';
import { t } from './i18n';
import * as path from 'path';

export class PreviewManager {
    private panel: vscode.WebviewPanel | undefined;

    constructor(private context: vscode.ExtensionContext) { }

    public async showPreview(files: vscode.Uri[], onConfirm: () => Promise<void>, onCancel: () => void) {
        if (this.panel) {
            this.panel.reveal();
            return;
        }

        this.panel = vscode.window.createWebviewPanel(
            'formatDirPreview',
            t('formatDirectory.previewTitle'),
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true
            }
        );

        this.panel.webview.html = this.getWebviewContent(files);

        this.panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.command) {
                    case 'confirm':
                        await onConfirm();
                        this.dispose();
                        break;
                    case 'cancel':
                        onCancel();
                        this.dispose();
                        break;
                    case 'openDiff':
                        await this.openDiff(vscode.Uri.parse(message.uri));
                        break;
                }
            },
            undefined,
            this.context.subscriptions
        );

        this.panel.onDidDispose(
            () => {
                this.panel = undefined;
                onCancel(); // Treat closing as cancel if not confirmed
            },
            null,
            this.context.subscriptions
        );
    }

    private dispose() {
        if (this.panel) {
            this.panel.dispose();
            this.panel = undefined;
        }
    }

    private async openDiff(uri: vscode.Uri) {
        // To show a diff, we need the "formatted" content.
        // We can't easily show a diff of just "edits" without applying them to a virtual doc.
        // For now, let's just open the file. 
        // ideally we would generate a "formatted" version in memory and diff against that.

        try {
            const document = await vscode.workspace.openTextDocument(uri);
            // We need to calculate edits again or cache them to show the diff...
            // For this MVP, let's just open the file so they can see it. 
            // OR better: Execute the format provider on a virtual document?

            // A better user experience for "Preview" in this context (batch operation) 
            // might be just listing the files and letting them trust the formatter, 
            // or truly generating the diff.

            // Generating a true diff for potentially hundreds of files is expensive. 
            // Let's settle for opening the document.
            await vscode.window.showTextDocument(document);
        } catch (e) {
            console.error(e);
        }
    }

    // We will update this to actually calculate edits if we want true preview, 
    // but for now let's just list the files that WILL be formatted.
    private getWebviewContent(files: vscode.Uri[]): string {
        const fileListItems = files.map(uri => {
            const fsPath = uri.fsPath;
            // JSON stringify for the onclick handler
            const uriString = uri.toString();
            return `
                <li class="file-item" onclick="openDiff('${uriString}')">
                    <span class="file-icon">📄</span>
                    <span class="file-path">${path.basename(fsPath)}</span>
                    <span class="file-full-path">${fsPath}</span>
                </li>
            `;
        }).join('');

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${t('formatDirectory.previewTitle')}</title>
    <style>
        body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); padding: 20px; }
        h2 { color: var(--vscode-editor-foreground); }
        .description { margin-bottom: 20px; }
        .file-list { list-style: none; padding: 0; max-height: 400px; overflow-y: auto; border: 1px solid var(--vscode-widget-border); }
        .file-item { padding: 8px 12px; cursor: pointer; border-bottom: 1px solid var(--vscode-widget-border); display: flex; align-items: center; }
        .file-item:hover { background-color: var(--vscode-list-hoverBackground); }
        .file-icon { margin-right: 10px; }
        .file-path { font-weight: bold; margin-right: 10px; }
        .file-full-path { opacity: 0.7; font-size: 0.9em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .actions { margin-top: 20px; display: flex; gap: 10px; }
        button { padding: 8px 16px; border: none; cursor: pointer; font-size: 14px; border-radius: 2px; }
        .btn-primary { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); }
        .btn-primary:hover { background-color: var(--vscode-button-hoverBackground); }
        .btn-secondary { background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
        .btn-secondary:hover { background-color: var(--vscode-button-secondaryHoverBackground); }
    </style>
</head>
<body>
    <h2>${t('formatDirectory.previewTitle')}</h2>
    <div class="description">${t('formatDirectory.previewDescription')}</div>
    <ul class="file-list">
        ${fileListItems}
    </ul>
    <div class="actions">
        <button class="btn-primary" onclick="confirm()">${t('formatDirectory.applyChanges')}</button>
        <button class="btn-secondary" onclick="cancel()">${t('formatDirectory.cancelFormat')}</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        function openDiff(uri) {
            vscode.postMessage({ command: 'openDiff', uri: uri });
        }
        function confirm() {
            vscode.postMessage({ command: 'confirm' });
        }
        function cancel() {
            vscode.postMessage({ command: 'cancel' });
        }
    </script>
</body>
</html>`;
    }
}
