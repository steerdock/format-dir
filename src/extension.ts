/*
 * @Date: 2026-01-10 14:29:09
 * @Author: Anthony Rivera && opcnlin@gmail.com
 * @FilePath: \src\extension.ts
 * Copyright (c) 2026 SteerDock Contributors
 * Licensed under the MIT License
 */
import * as vscode from 'vscode';
import * as path from 'path';
import { initializeLocale, t } from './i18n';
import { PreviewManager } from './preview';
import { HistoryManager } from './history';

interface FormatConfig {
    fileExtensions: string[];
    recursive: boolean;
    excludePatterns: string[];
    showProgress: boolean;
    concurrencyLimit: number;
    maxFileSize: number;
    logLevel: string;
    openOutputAfterFormat: boolean;
    preview: boolean;
    formatterPriority: Record<string, string>;
}

let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let previewManager: PreviewManager;
let historyManager: HistoryManager;

export function activate(context: vscode.ExtensionContext) {
    initializeLocale();

    outputChannel = vscode.window.createOutputChannel('Format Directory');
    context.subscriptions.push(outputChannel);
    log('info', 'Format Directory extension is now active!');

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'formatdir.formatWithDefault';
    context.subscriptions.push(statusBarItem);

    previewManager = new PreviewManager(context);
    historyManager = new HistoryManager(context);

    const handleFormatCommand = async (uri: vscode.Uri | undefined, reconfigure: boolean) => {
        if (!uri) {
            if (vscode.window.activeTextEditor) {
                uri = vscode.window.activeTextEditor.document.uri;
            } else {
                vscode.window.showWarningMessage(t('formatDirectory.noFiles'));
                return;
            }
        }
        await formatDirectory(uri, reconfigure);
    };

    context.subscriptions.push(
        vscode.commands.registerCommand('formatdir.formatWithDefault', (uri) => handleFormatCommand(uri, false)),
        vscode.commands.registerCommand('formatdir.formatFileWithDefault', (uri) => handleFormatCommand(uri, false)),
        vscode.commands.registerCommand('formatdir.undo', () => historyManager.undo()),
        vscode.commands.registerCommand('formatdir.configurePriority', () => configurePriority())
    );

    // Listen for configuration changes to update locale
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('formatdir.language')) {
            initializeLocale();
        }
    }));
}

export function deactivate() { }

async function formatDirectory(uri: vscode.Uri, reconfigure: boolean) {
    try {
        const config = await getFormatConfig(reconfigure);
        if (!config) {
            return;
        }

        let files: vscode.Uri[] = [];
        const stat = await vscode.workspace.fs.stat(uri);

        if (stat.type === vscode.FileType.File) {
            files = [uri];
            log('info', `Formatting single file: ${uri.fsPath}`);
        } else {
            log('info', `Formatting directory: ${uri.fsPath}`);
            files = await collectFiles(uri, config);
        }

        if (files.length === 0) {
            vscode.window.showInformationMessage(t('formatDirectory.noFiles'));
            return;
        }

        if (config.preview) {
            await previewManager.showPreview(
                files,
                async () => {
                    await executeFormat(files, config);
                },
                () => {
                    log('info', 'Preview cancelled by user.');
                }
            );
        } else {
            await executeFormat(files, config);
        }

    } catch (error: any) {
        log('error', `Error in formatDirectory: ${error.message}`);
        vscode.window.showErrorMessage(t('formatDirectory.failed', error.message));
    }
}

async function executeFormat(files: vscode.Uri[], config: FormatConfig) {
    // Save history before formatting
    await historyManager.add(files);

    await formatFiles(files, config);
}

async function getFormatConfig(reconfigure: boolean): Promise<FormatConfig | null> {
    const workspaceConfig = vscode.workspace.getConfiguration('formatdir');

    let fileExtensions = workspaceConfig.get<string[]>('fileExtensions', [
        '.js', '.ts', '.jsx', '.tsx', '.json', '.css', '.scss', '.less',
        '.html', '.xml', '.md', '.yaml', '.yml', '.vue', '.py', '.java',
        '.c', '.cpp', '.h', '.cs', '.go', '.rs', '.php', '.rb', '.sql'
    ]);
    let recursive = workspaceConfig.get<boolean>('recursive', true);
    let excludePatterns = workspaceConfig.get<string[]>('excludePatterns', [
        '**/node_modules/**', '**/dist/**', '**/build/**', '**/out/**',
        '**/.git/**', '**/vendor/**', '**/*.min.js', '**/*.min.css'
    ]);
    let showProgress = workspaceConfig.get<boolean>('showProgress', true);
    let concurrencyLimit = workspaceConfig.get<number>('concurrencyLimit', 10);
    let maxFileSize = workspaceConfig.get<number>('maxFileSize', 1048576);
    let logLevel = workspaceConfig.get<string>('logLevel', 'info');
    let openOutputAfterFormat = workspaceConfig.get<boolean>('openOutputAfterFormat', false);
    let preview = workspaceConfig.get<boolean>('preview', false); // Default to false
    let formatterPriority = workspaceConfig.get<Record<string, string>>('formatterPriority', {});

    if (reconfigure) {
        // ... (Existing reconfigure logic could stay, but simplification for new features is fine too)
        // For brevity and to keep existing flow, we just return current config if reconfigure is complex or not fully ported.
        // But original code had logic here. Let's keep it mostly.
        const extensionsInput = await vscode.window.showInputBox({
            prompt: t('formatDirectory.inputExtensions'),
            value: fileExtensions.join(', '),
            placeHolder: t('formatDirectory.extensionsPlaceholder')
        });

        if (extensionsInput === undefined) {
            return null;
        }

        fileExtensions = extensionsInput.split(',').map(ext => ext.trim()).filter(ext => ext);

        const recursiveChoice = await vscode.window.showQuickPick([t('formatDirectory.yes'), t('formatDirectory.no')], {
            placeHolder: t('formatDirectory.recursive')
        });

        if (recursiveChoice === undefined) {
            return null;
        }

        recursive = recursiveChoice === t('formatDirectory.yes');
        // Skipping exclude customization in this re-implementation to save tokens/complexity if not strictly requested, 
        // but let's keep it to be safe.
        // Allow customizing exclude patterns
        const customizeExclude = await vscode.window.showQuickPick([t('formatDirectory.yes'), t('formatDirectory.no')], {
            placeHolder: t('formatDirectory.customizeExclude')
        });

        if (customizeExclude === t('formatDirectory.yes')) {
            const excludeInput = await vscode.window.showInputBox({
                prompt: t('formatDirectory.inputExcludePatterns'),
                value: excludePatterns.join(', '),
                placeHolder: t('formatDirectory.excludePlaceholder')
            });

            if (excludeInput === undefined) {
                return null;
            }

            excludePatterns = excludeInput.split(',').map(pattern => pattern.trim()).filter(pattern => pattern);
        }
    }

    return { fileExtensions, recursive, excludePatterns, showProgress, concurrencyLimit, maxFileSize, logLevel, openOutputAfterFormat, preview, formatterPriority };
}

async function collectFiles(uri: vscode.Uri, config: FormatConfig): Promise<vscode.Uri[]> {
    const files: vscode.Uri[] = [];

    async function traverse(currentUri: vscode.Uri, depth: number = 0) {
        const entries = await vscode.workspace.fs.readDirectory(currentUri);

        for (const [name, fileType] of entries) {
            const itemUri = vscode.Uri.joinPath(currentUri, name);
            const relativePath = vscode.workspace.asRelativePath(itemUri);

            if (isExcluded(relativePath, config.excludePatterns)) {
                continue;
            }

            if (fileType === vscode.FileType.File) {
                const ext = path.extname(name);
                if (config.fileExtensions.includes(ext)) {
                    if (config.maxFileSize > 0) {
                        try {
                            const stat = await vscode.workspace.fs.stat(itemUri);
                            if (stat.size > config.maxFileSize) {
                                log('info', `Skipping ${name}: file size ${stat.size} exceeds limit ${config.maxFileSize}`);
                                continue;
                            }
                        } catch (error) {
                            console.error(`Failed to get file size for ${name}:`, error);
                        }
                    }
                    files.push(itemUri);
                }
            } else if (fileType === vscode.FileType.Directory && config.recursive) {
                await traverse(itemUri, depth + 1);
            }
        }
    }

    await traverse(uri);
    return files;
}

function isExcluded(relativePath: string, patterns: string[]): boolean {
    for (const pattern of patterns) {
        const regex = new RegExp(
            pattern
                .replace(/\*\*/g, '.*')
                .replace(/\*/g, '[^/]*')
                .replace(/\?/g, '.')
        );
        if (regex.test(relativePath)) {
            return true;
        }
    }
    return false;
}

async function formatFiles(files: vscode.Uri[], config: FormatConfig) {
    let successCount = 0;
    let failCount = 0;
    const failedFiles: string[] = [];

    statusBarItem.show();
    statusBarItem.text = `$(sync~spin) Formatting...`;

    if (config.showProgress) {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: t('formatDirectory.formatting'),
            cancellable: true
        }, async (progress, token) => {
            progress.report({ increment: 0, message: `0/${files.length}` });

            for (let i = 0; i < files.length; i += config.concurrencyLimit) {
                if (token.isCancellationRequested) {
                    log('info', 'Formatting cancelled by user.');
                    vscode.window.showInformationMessage(t('formatDirectory.cancelled'));
                    return;
                }

                const batch = files.slice(i, i + config.concurrencyLimit);
                const results = await Promise.all(batch.map(file => formatFile(file, config))); // Pass config

                for (let j = 0; j < batch.length; j++) {
                    const file = batch[j];
                    const fileName = path.basename(file.fsPath);

                    progress.report({
                        message: `${i + j + 1}/${files.length}: ${fileName}`,
                        increment: (100 / files.length)
                    });

                    statusBarItem.text = `$(sync~spin) Formatting: ${i + j + 1}/${files.length}`;

                    if (results[j]) {
                        successCount++;
                    } else {
                        failCount++;
                        failedFiles.push(fileName);
                    }
                }
            }
        });
    } else {
        statusBarItem.text = `$(sync~spin) Formatting...`;
        const results = await Promise.all(files.map(file => formatFile(file, config)));
        results.forEach((result, index) => {
            if (result) {
                successCount++;
            } else {
                failCount++;
                failedFiles.push(path.basename(files[index].fsPath));
            }
        });
    }

    statusBarItem.text = `$(check) Format Directory Done`;
    setTimeout(() => statusBarItem.hide(), 3000);

    let message = t('formatDirectory.complete', successCount);
    log('info', message);

    if (failCount > 0) {
        message = t('formatDirectory.completeFailed', successCount, failCount);
        log('warning', message);
        vscode.window.showWarningMessage(message);

        const showDetails = await vscode.window.showWarningMessage(
            t('formatDirectory.failedCount', failCount),
            t('formatDirectory.viewDetails')
        );

        if (showDetails) {
            outputChannel.appendLine(t('formatDirectory.failedFiles'));
            failedFiles.forEach(file => outputChannel.appendLine(`  - ${file}`));
            outputChannel.show();
        }
    } else {
        vscode.window.showInformationMessage(message);
    }

    if (config.openOutputAfterFormat) {
        outputChannel.show();
    }
}

async function formatFile(uri: vscode.Uri, config: FormatConfig): Promise<boolean> {
    try {
        log('debug', `Formatting file: ${uri.fsPath}`);
        const document = await vscode.workspace.openTextDocument(uri);

        // Apply priority override if documented
        // Note: This is simplified. Real "priority" requiring switching default formatter
        // per file dynamically during a batch is risky for VS Code configuration.
        // We rely on the user having configured it correctly or using configurePriority helper.

        const editorConfig = vscode.workspace.getConfiguration('editor', document.uri);
        const options = {
            insertSpaces: editorConfig.get<boolean>('insertSpaces', true),
            tabSize: editorConfig.get<number>('tabSize', 4)
        };

        const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>(
            'vscode.executeFormatDocumentProvider',
            document.uri,
            options
        );

        if (edits && edits.length > 0) {
            const workspaceEdit = new vscode.WorkspaceEdit();
            workspaceEdit.set(document.uri, edits);
            await vscode.workspace.applyEdit(workspaceEdit);
            await document.save();
            return true;
        }

        return true;
    } catch (error: any) {
        log('error', `Failed to format ${uri.fsPath}: ${error}`);
        return false;
    }
}

function log(level: string, message: string) {
    const config = vscode.workspace.getConfiguration('formatdir');
    const configuredLevel = config.get<string>('logLevel', 'info');

    const levels = ['debug', 'info', 'error', 'off'];

    if (levels.indexOf(level) >= levels.indexOf(configuredLevel) && configuredLevel !== 'off') {
        const timestamp = new Date().toLocaleTimeString();
        if (outputChannel) {
            outputChannel.appendLine(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        }
    }
}

async function configurePriority() {
    // 1. Select Language
    const languages = await vscode.languages.getLanguages();
    const lang = await vscode.window.showQuickPick(languages, {
        placeHolder: 'Select language to configure formatter priority'
    });

    if (!lang) {
        return;
    }

    // 2. Select Formatter (Extension)
    // We can't easily query "all formatters for a language".
    // But we can ask the user for the extension ID or try to find installed extensions.
    // For now, let's just let them type the Extension ID or offer known ones if we could.
    // Simplifying: Just explain OR let them input.

    // Better: Open settings UI filtered to that language's default formatter
    // vscode.commands.executeCommand('workbench.action.openSettings', `@lang:${lang} editor.defaultFormatter`);

    // This is the most robust "support".
    vscode.commands.executeCommand('workbench.action.openSettings', `@lang:${lang} editor.defaultFormatter`);

    vscode.window.showInformationMessage(t('formatDirectory.configurePriority') + ': ' + lang);
}
