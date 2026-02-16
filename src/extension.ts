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

interface FormatConfig {
    fileExtensions: string[];
    recursive: boolean;
    excludePatterns: string[];
    showProgress: boolean;
    concurrencyLimit: number;
    maxFileSize: number;
    logLevel: string;
    openOutputAfterFormat: boolean;
}

let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;

export function activate(context: vscode.ExtensionContext) {
    initializeLocale();

    outputChannel = vscode.window.createOutputChannel('Format Directory');
    context.subscriptions.push(outputChannel);
    log('info', 'Format Directory extension is now active!');

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'formatdir.formatWithDefault';
    context.subscriptions.push(statusBarItem);

    const handleCommand = async (uri: vscode.Uri | undefined, reconfigure: boolean) => {
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

    let disposableDefault = vscode.commands.registerCommand('formatdir.formatWithDefault', (uri) => handleCommand(uri, false));
    let disposableFileDefault = vscode.commands.registerCommand('formatdir.formatFileWithDefault', (uri) => handleCommand(uri, false));

    // Listen for configuration changes to update locale
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('formatdir.language')) {
            initializeLocale();
        }
    }));

    context.subscriptions.push(disposableDefault, disposableFileDefault);
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

        await formatFiles(files, config);

    } catch (error: any) {
        log('error', `Error in formatDirectory: ${error.message}`);
        vscode.window.showErrorMessage(t('formatDirectory.failed', error.message));
    }
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

    if (reconfigure) {
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

    return { fileExtensions, recursive, excludePatterns, showProgress, concurrencyLimit, maxFileSize, logLevel, openOutputAfterFormat };
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
                    // Check file size if maxFileSize is set (0 means no limit)
                    if (config.maxFileSize > 0) {
                        try {
                            const stat = await vscode.workspace.fs.stat(itemUri);
                            if (stat.size > config.maxFileSize) {
                                console.log(`Skipping ${name}: file size ${stat.size} exceeds limit ${config.maxFileSize}`);
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
                const results = await Promise.all(batch.map(file => formatFile(file)));

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
        const results = await Promise.all(files.map(file => formatFile(file)));
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

async function formatFile(uri: vscode.Uri): Promise<boolean> {
    try {
        log('debug', `Formatting file: ${uri.fsPath}`);
        const document = await vscode.workspace.openTextDocument(uri);

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
    // Index: debug(0), info(1), error(2), off(3)
    // We want matching level or Higher PRIORITY (which means HIGHER index in typical filtered logs? No).
    // Usually: If "info", show "info" and "error". Hide "debug".
    // So if currentLevelIndex >= configuredLevelIndex?
    // debug(0), info(1)
    // If config=info(1):
    // debug(0) >= 1 -> False.
    // info(1) >= 1 -> True.
    // error(2) >= 1 -> True.
    // So YES, index >= configIndex.

    if (levels.indexOf(level) >= levels.indexOf(configuredLevel) && configuredLevel !== 'off') {
        const timestamp = new Date().toLocaleTimeString();
        if (outputChannel) {
            outputChannel.appendLine(`[${timestamp}] [${level.toUpperCase()}] ${message}`);
        }
    }
}
