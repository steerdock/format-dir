import * as vscode from "vscode";
import * as path from "path";
import * as crypto from "crypto";
import { t } from "./i18n";
import { escapeHtml } from "./utils";
export interface WebviewConfig {
    fileExtensions: string[];
    recursive: boolean;
    excludePatterns: string[];
    respectGitignore: boolean;
}
function isWebviewConfig(value: unknown): value is WebviewConfig {
    if (!value || typeof value !== "object") {
        return false;
    }
    const config = value as Partial<WebviewConfig>;
    return Array.isArray(config.fileExtensions) && config.fileExtensions.every(item => typeof item === "string") && Array.isArray(config.excludePatterns) && config.excludePatterns.every(item => typeof item === "string") && typeof config.recursive === "boolean" && typeof config.respectGitignore === "boolean";
}
export class ReconfigureWebview {
    private panel: vscode.WebviewPanel | undefined;
    constructor(private context: vscode.ExtensionContext) { }
    public async show(currentConfig: WebviewConfig): Promise<WebviewConfig | null> {
        return new Promise(resolve => {
            let settled = false;
            const doResolve = (value: WebviewConfig | null) => {
                if (settled) {
                    return;
                }
                settled = true;
                resolve(value);
            };
            const existingPanel = this.panel;
            if (existingPanel) {
                existingPanel.reveal();
            } else {
                this.panel = vscode.window.createWebviewPanel("reconfigureFormatDir", t("formatDirectory.reconfigureTitle") || "Reconfigure Format Directory", vscode.ViewColumn.One, {
                    enableScripts: true,
                    retainContextWhenHidden: true,
                    localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, "src"))]
                });
                const formatters = this.getInstalledFormatters();
                this.panel.webview.html = this.getHtmlContent(currentConfig, formatters);
            }
            const activePanel = this.panel!;
            const messageDisposable = activePanel.webview.onDidReceiveMessage(async message => {
                switch (message.command) {
                    case "save":
                        if (!isWebviewConfig(message.config)) {
                            return;
                        }
                        doResolve(message.config);
                        activePanel.dispose();
                        break;
                    case "cancel":
                        doResolve(null);
                        activePanel.dispose();
                        break;
                    case "openSettings":
                        const {
                            lang
                        } = message;
                        await vscode.commands.executeCommand("workbench.action.openSettings", `@lang:${lang} editor.defaultFormatter`);
                        break;
                }
            }, undefined, this.context.subscriptions);
            const disposeDisposable = activePanel.onDidDispose(() => {
                this.panel = undefined;
                messageDisposable.dispose();
                disposeDisposable.dispose();
                doResolve(null);
            });
        });
    }
    private getInstalledFormatters() {
        // Find extensions that provide formatting
        const formatters: {
            id: string;
            name: string;
            languages: string[];
        }[] = [];
        vscode.extensions.all.forEach(ext => {
            const pkg = ext.packageJSON;
            // More precise: check for documentFormattingEditProvider or Formatters category
            const isFormatter = pkg?.contributes?.documentFormattingEditProvider || pkg?.categories?.includes("Formatters");
            if (isFormatter && !ext.id.startsWith("vscode.")) {
                const langs = pkg?.contributes?.languages?.map((l: {
                    id: string;
                }) => l.id) || [];
                formatters.push({
                    id: ext.id,
                    name: pkg.displayName || ext.id,
                    languages: langs
                });
            }
        });
        return formatters;
    }
    private getHtmlContent(config: WebviewConfig, formatters: {
        id: string;
        name: string;
        languages: string[];
    }[]): string {
        const nonce = crypto.randomBytes(16).toString("hex");
        const extensionItems = escapeHtml(config.fileExtensions.join(", "));
        const excludeItems = escapeHtml(config.excludePatterns.join(", "));
        const formatterCheckboxes = formatters.map(f => {
            const safeName = escapeHtml(f.name);
            const safeId = escapeHtml(f.id);
            const safeLangs = escapeHtml(f.languages.slice(0, 5).join(", "));
            const safeFirstLang = escapeHtml(f.languages[0] || "");
            const escapedConfigure = escapeHtml(t("formatDirectory.configure") || "Configure");
            return `
            <div class="formatter-item">
                <div class="formatter-info">
                    <div class="formatter-name">${safeName}</div>
                    <div class="formatter-id">${safeId}</div>
                </div>
                <div class="formatter-langs">${safeLangs}${f.languages.length > 5 ? "..." : ""}</div>
                <button class="btn-link" data-lang="${safeFirstLang}" data-formatter="${safeId}">${escapedConfigure}</button>
            </div>
        `;
        }).join("");
        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reconfigure</title>
    <style nonce="${nonce}">
        :root {
            --padding: 20px;
            --border-radius: 4px;
        }
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-editor-foreground);
            background-color: var(--vscode-editor-background);
            padding: var(--padding);
            line-height: 1.6;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
        }
        h2 {
            font-weight: 500;
            margin-bottom: 20px;
            border-bottom: 1px solid var(--vscode-widget-border);
            padding-bottom: 10px;
        }
        .form-group {
            margin-bottom: 15px;
        }
        label {
            display: block;
            margin-bottom: 5px;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            opacity: 0.8;
        }
        input[type="text"] {
            width: 100%;
            padding: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: var(--border-radius);
            box-sizing: border-box;
        }
        input[type="text"]:focus {
            outline: 1px solid var(--vscode-focusBorder);
            border-color: var(--vscode-focusBorder);
        }
        .checkbox-group {
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            user-select: none;
        }
        .checkbox-group input {
            cursor: pointer;
        }
        .section-title {
            margin-top: 25px;
            margin-bottom: 10px;
            font-size: 14px;
            font-weight: bold;
        }
        .formatter-list {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-widget-border);
            border-radius: var(--border-radius);
            max-height: 200px;
            overflow-y: auto;
            box-shadow: inset 0 2px 4px rgba(0,0,0,0.1);
        }
        .formatter-item {
            padding: 12px 15px;
            border-bottom: 1px solid var(--vscode-widget-border);
            display: flex;
            justify-content: space-between;
            align-items: center;
            transition: background-color 0.2s;
        }
        .formatter-item:hover {
            background-color: var(--vscode-list-hoverBackground);
        }
        .formatter-item:last-child {
            border-bottom: none;
        }
        .formatter-info {
            flex: 1;
        }
        .formatter-name {
            font-weight: 600;
            font-size: 13px;
            color: var(--vscode-textLink-foreground);
        }
        .formatter-id {
            font-size: 11px;
            opacity: 0.5;
            font-family: var(--vscode-editor-font-family);
        }
        .formatter-langs {
            font-size: 11px;
            opacity: 0.7;
            margin: 0 15px;
            max-width: 150px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 6px;
            border-radius: 10px;
        }
        .actions {
            margin-top: 30px;
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        button {
            padding: 8px 16px;
            border: none;
            cursor: pointer;
            border-radius: var(--border-radius);
            font-size: 13px;
        }
        .btn-primary {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        .btn-primary:hover {
            background: var(--vscode-button-hoverBackground);
        }
        .btn-secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .btn-secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .btn-link {
            background: transparent;
            color: var(--vscode-textLink-foreground);
            padding: 0;
            text-decoration: underline;
        }
        .btn-link:hover {
            color: var(--vscode-textLink-activeForeground);
        }
    </style>
</head>
<body>
    <div class="container">
        <h2>${t("formatDirectory.reconfigure") || "Configuration"}</h2>
        
        <div class="form-group">
            <label>${t("formatDirectory.inputExtensions") || "File Extensions (comma separated)"}</label>
            <input type="text" id="extensions" value="${extensionItems}" placeholder=".js, .ts, ...">
        </div>

        <div class="form-group">
            <label class="checkbox-group" for="recursive">
                <input type="checkbox" id="recursive" ${config.recursive ? "checked" : ""}>
                <span>${t("formatDirectory.recursive") || "Recursive"}</span>
            </label>
        </div>

        <div class="form-group">
            <label>${t("formatDirectory.inputExcludePatterns") || "Exclude Patterns"}</label>
            <input type="text" id="exclude" value="${excludeItems}" placeholder="**/node_modules/**, ...">
        </div>

        <div class="form-group">
            <label class="checkbox-group" for="respectGitignore">
                <input type="checkbox" id="respectGitignore" ${config.respectGitignore ? "checked" : ""}>
                <span>${t("formatDirectory.respectGitignore") || "Respect .gitignore"}</span>
            </label>
        </div>

        <div class="section-title">Detected Formatters</div>
        <div class="formatter-list">
            ${formatterCheckboxes}
        </div>

        <div class="actions">
            <button class="btn-secondary" id="cancelButton">${t("formatDirectory.cancelFormat") || "Cancel"}</button>
            <button class="btn-primary" id="saveButton">${t("formatDirectory.applyChanges") || "Save & Format"}</button>
        </div>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();

        document.getElementById('saveButton').addEventListener('click', () => {
            const config = {
                fileExtensions: document.getElementById('extensions').value.split(',').map(s => s.trim()).filter(Boolean),
                recursive: document.getElementById('recursive').checked,
                excludePatterns: document.getElementById('exclude').value.split(',').map(s => s.trim()).filter(Boolean),
                respectGitignore: document.getElementById('respectGitignore').checked
            };
            vscode.postMessage({ command: 'save', config });
        });

        document.getElementById('cancelButton').addEventListener('click', () => {
            vscode.postMessage({ command: 'cancel' });
        });

        function openSettings(lang, formatter) {
            vscode.postMessage({ command: 'openSettings', lang, formatter });
        }

        document.querySelectorAll('.btn-link').forEach(button => {
            button.addEventListener('click', () => {
                openSettings(button.dataset.lang || '', button.dataset.formatter || '');
            });
        });
    </script>
</body>
</html>`;
    }
}
