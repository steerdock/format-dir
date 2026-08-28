import * as vscode from "vscode";
import { t } from "./i18n";
import { escapeHtml } from "./utils";
import * as path from "path";
import * as crypto from "crypto";
const pendingPreviewDeletions = new Map<string, vscode.Disposable>();
export class PreviewManager {
	private panel: vscode.WebviewPanel | undefined;
	constructor(private context: vscode.ExtensionContext) { }
	public async showPreview(files: vscode.Uri[], onConfirm: () => Promise<void>, onCancel: () => void) {
		if (this.panel) {
			this.panel.reveal();
			return;
		}
		await new Promise<void>((resolve, reject) => {
			this.openPreview(files, onConfirm, onCancel, resolve, reject);
		});
	}
	private openPreview(files: vscode.Uri[], onConfirm: () => Promise<void>, onCancel: () => void, resolve: () => void, reject: (reason: unknown) => void) {
		this.panel = vscode.window.createWebviewPanel("formatDirPreview", t("formatDirectory.previewTitle"), vscode.ViewColumn.One, {
			enableScripts: true,
			retainContextWhenHidden: true
		});
		this.panel.webview.html = this.getWebviewContent(files);
		let actionTaken = false;
		this.panel.webview.onDidReceiveMessage(async message => {
			switch (message.command) {
				case "confirm":
					if (actionTaken) {
						return;
					}
					actionTaken = true;
					try {
						await onConfirm();
						resolve();
					} catch (error) {
						reject(error);
					} finally {
						this.dispose();
					}
					break;
				case "cancel":
					if (actionTaken) {
						return;
					}
					actionTaken = true;
					onCancel();
					this.dispose();
					resolve();
					break;
				case "openDiff":
					await this.openDiff(vscode.Uri.parse(message.uri));
					break;
			}
		}, undefined, this.context.subscriptions);
		this.panel.onDidDispose(() => {
			this.panel = undefined;
			if (!actionTaken) {
				onCancel();
				resolve();
			}
		}, null, this.context.subscriptions);
	}
	private dispose() {
		if (this.panel) {
			this.panel.dispose();
			this.panel = undefined;
		}
	}
	private async createPreviewDir(): Promise<vscode.Uri> {
		const previewDir = vscode.Uri.joinPath(this.context.globalStorageUri, "preview");
		try {
			await vscode.workspace.fs.createDirectory(previewDir);
		} catch { }
		return previewDir;
	}
	private async openDiff(uri: vscode.Uri) {
		try {
			const document = await vscode.workspace.openTextDocument(uri);
			const editorConfig = vscode.workspace.getConfiguration("editor", document.uri);
			const options = {
				insertSpaces: editorConfig.get<boolean>("insertSpaces", true),
				tabSize: editorConfig.get<number>("tabSize", 4)
			};
			const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>("vscode.executeFormatDocumentProvider", document.uri, options);
			if (!edits || edits.length === 0) {
				vscode.window.showInformationMessage(t("formatDirectory.previewDiffNoChanges"));
				return;
			}
			let content = document.getText();
			const sortedEdits = [...edits].sort((a, b) => {
				const lineDiff = b.range.start.line - a.range.start.line;
				if (lineDiff !== 0) return lineDiff;
				return b.range.start.character - a.range.start.character;
			});
			for (const edit of sortedEdits) {
				const startOffset = document.offsetAt(edit.range.start);
				const endOffset = document.offsetAt(edit.range.end);
				content = content.slice(0, startOffset) + edit.newText + content.slice(endOffset);
			}
			const previewDir = await this.createPreviewDir();
			const hash = crypto.createHash("md5").update(uri.fsPath).digest("hex").slice(0, 12);
			const previewUri = vscode.Uri.joinPath(previewDir, `${hash}_${path.basename(uri.fsPath)}.preview`);
			await vscode.workspace.fs.writeFile(previewUri, Buffer.from(content, "utf8"));
			await vscode.commands.executeCommand("vscode.diff", uri, previewUri, `Preview: ${path.basename(uri.fsPath)}`);
			const previewKey = previewUri.toString();
			const closeDisposable = vscode.workspace.onDidCloseTextDocument(doc => {
				if (doc.uri.toString() === previewKey) {
					vscode.workspace.fs.delete(previewUri).then(() => { }, () => { });
					const d = pendingPreviewDeletions.get(previewKey);
					if (d) {
						d.dispose();
						pendingPreviewDeletions.delete(previewKey);
					}
				}
			});
			pendingPreviewDeletions.set(previewKey, closeDisposable);
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : String(e);
			vscode.window.showErrorMessage(t("formatDirectory.previewDiffFailed", message));
		}
	}
	private getWebviewContent(files: vscode.Uri[]): string {
		const nonce = crypto.randomBytes(16).toString("hex");
		const escapedTitle = escapeHtml(t("formatDirectory.previewTitle"));
		const escapedDesc = escapeHtml(t("formatDirectory.previewDescription"));
		const escapedApply = escapeHtml(t("formatDirectory.applyChanges"));
		const escapedCancel = escapeHtml(t("formatDirectory.cancelFormat"));
		const fileData = files.map(uri => {
			const fsPath = uri.fsPath;
			return {
				uri: uri.toString(),
				baseName: path.basename(fsPath),
				fullPath: fsPath
			};
		});
		const fileDataJson = JSON.stringify(fileData);
		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapedTitle}</title>
    <style nonce="${nonce}">
        body { font-family: var(--vscode-font-family); color: var(--vscode-editor-foreground); background-color: var(--vscode-editor-background); padding: 20px; margin: 0; }
        h2 { color: var(--vscode-editor-foreground); margin-top: 0; }
        .description { margin-bottom: 12px; opacity: 0.9; }
        .file-count { margin-bottom: 12px; font-size: 0.9em; opacity: 0.7; }
        .search-box { width: 100%; padding: 6px 10px; margin-bottom: 10px; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); border-radius: 2px; box-sizing: border-box; font-size: 13px; outline: none; }
        .search-box:focus { border-color: var(--vscode-focusBorder); }
        .file-list-container { position: relative; max-height: 420px; overflow-y: auto; border: 1px solid var(--vscode-widget-border); border-radius: 2px; }
        .file-list-spacer { width: 100%; }
        .file-item { padding: 6px 12px; cursor: pointer; border-bottom: 1px solid var(--vscode-widget-border); display: flex; align-items: center; box-sizing: border-box; }
        .file-item:hover { background-color: var(--vscode-list-hoverBackground); }
        .file-icon { margin-right: 8px; flex-shrink: 0; }
        .file-path { font-weight: bold; margin-right: 8px; white-space: nowrap; }
        .file-full-path { opacity: 0.6; font-size: 0.85em; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .empty-message { padding: 20px; text-align: center; opacity: 0.6; }
        .actions { margin-top: 16px; display: flex; gap: 10px; }
        button { padding: 8px 16px; border: none; cursor: pointer; font-size: 14px; border-radius: 2px; }
        .btn-primary { background-color: var(--vscode-button-background); color: var(--vscode-button-foreground); }
        .btn-primary:hover { background-color: var(--vscode-button-hoverBackground); }
        .btn-secondary { background-color: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); }
        .btn-secondary:hover { background-color: var(--vscode-button-secondaryHoverBackground); }
    </style>
</head>
<body>
    <h2>${escapedTitle}</h2>
    <div class="description">${escapedDesc}</div>
    <div class="file-count" id="fileCount"></div>
    <input type="text" class="search-box" id="searchBox" placeholder="Filter files..." />
    <div class="file-list-container" id="fileListContainer">
        <div class="file-list-spacer" id="spacer"></div>
    </div>
    <div class="actions">
        <button class="btn-primary" id="confirmButton">${escapedApply}</button>
        <button class="btn-secondary" id="cancelButton">${escapedCancel}</button>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        const allFiles = ${fileDataJson};
        const ITEM_HEIGHT = 36;
        const BUFFER = 10;
        let filteredFiles = allFiles;
        let renderedStart = -1;
        let renderedEnd = -1;

        const container = document.getElementById('fileListContainer');
        const spacer = document.getElementById('spacer');
        const fileCount = document.getElementById('fileCount');
        const searchBox = document.getElementById('searchBox');

        function updateFileCount() {
            const total = allFiles.length;
            const shown = filteredFiles.length;
            if (total === shown) {
                fileCount.textContent = total + ' file' + (total !== 1 ? 's' : '');
            } else {
                fileCount.textContent = shown + ' / ' + total + ' files';
            }
        }

        function escapeHtml(str) {
            return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
        }

        function render() {
            const scrollTop = container.scrollTop;
            const viewHeight = container.clientHeight;
            const totalItems = filteredFiles.length;

            spacer.style.height = (totalItems * ITEM_HEIGHT) + 'px';

            const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
            const end = Math.min(totalItems, Math.ceil((scrollTop + viewHeight) / ITEM_HEIGHT) + BUFFER);

            if (start === renderedStart && end === renderedEnd) { return; }
            renderedStart = start;
            renderedEnd = end;

            const existing = container.querySelectorAll('.file-item');
            existing.forEach(el => el.remove());

            const frag = document.createDocumentFragment();
            for (let i = start; i < end; i++) {
                const f = filteredFiles[i];
                const div = document.createElement('div');
                div.className = 'file-item';
                div.style.position = 'absolute';
                div.style.top = (i * ITEM_HEIGHT) + 'px';
                div.style.width = '100%';
                div.style.height = ITEM_HEIGHT + 'px';
                div.onclick = () => vscode.postMessage({ command: 'openDiff', uri: f.uri });
                div.innerHTML = '<span class="file-icon">\uD83D\uDCC4</span><span class="file-path">' + escapeHtml(f.baseName) + '</span><span class="file-full-path">' + escapeHtml(f.fullPath) + '</span>';
                frag.appendChild(div);
            }
            container.appendChild(frag);
        }

        container.addEventListener('scroll', () => { render(); });

        searchBox.addEventListener('input', () => {
            const query = searchBox.value.toLowerCase().trim();
            if (!query) {
                filteredFiles = allFiles;
            } else {
                filteredFiles = allFiles.filter(f => f.baseName.toLowerCase().includes(query) || f.fullPath.toLowerCase().includes(query));
            }
            updateFileCount();
            renderedStart = -1;
            renderedEnd = -1;
            container.scrollTop = 0;
            render();
        });

        document.getElementById('confirmButton').addEventListener('click', () => {
            vscode.postMessage({ command: 'confirm' });
        });
        document.getElementById('cancelButton').addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
        });

        updateFileCount();
        render();
    </script>
</body>
</html>`;
	}
}
