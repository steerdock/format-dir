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
}

export function activate(context: vscode.ExtensionContext) {
    initializeLocale();
    console.log('Format Directory extension is now active!');

    let disposableDefault = vscode.commands.registerCommand('formatdir.formatWithDefault', async (uri: vscode.Uri) => {
        await formatDirectory(uri, false);
    });

    let disposableReconfigure = vscode.commands.registerCommand('formatdir.reconfigure', async (uri: vscode.Uri) => {
        await formatDirectory(uri, true);
    });

    context.subscriptions.push(disposableDefault, disposableReconfigure);
}

export function deactivate() { }

async function formatDirectory(uri: vscode.Uri, reconfigure: boolean) {
    try {
        const config = await getFormatConfig(reconfigure);
        if (!config) {
            return;
        }

        const files = await collectFiles(uri, config);

        if (files.length === 0) {
            vscode.window.showInformationMessage(t('formatDirectory.noFiles'));
            return;
        }

        await formatFiles(files, config);

    } catch (error: any) {
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
    }

    return { fileExtensions, recursive, excludePatterns, showProgress };
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

    if (config.showProgress) {
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: t('formatDirectory.formatting'),
            cancellable: true
        }, async (progress, token) => {
            for (let i = 0; i < files.length; i++) {
                if (token.isCancellationRequested) {
                    vscode.window.showWarningMessage(t('formatDirectory.cancelled'));
                    return;
                }

                const file = files[i];
                const fileName = path.basename(file.fsPath);

                progress.report({
                    message: `${i + 1}/${files.length}: ${fileName}`,
                    increment: (100 / files.length)
                });

                const result = await formatFile(file);
                if (result) {
                    successCount++;
                } else {
                    failCount++;
                    failedFiles.push(path.basename(file.fsPath));
                }
            }
        });
    } else {
        for (const file of files) {
            const result = await formatFile(file);
            if (result) {
                successCount++;
            } else {
                failCount++;
                failedFiles.push(path.basename(file.fsPath));
            }
        }
    }

    let message = t('formatDirectory.complete', successCount);
    if (failCount > 0) {
        message = t('formatDirectory.completeFailed', successCount, failCount);
        vscode.window.showWarningMessage(message);

        const showDetails = await vscode.window.showWarningMessage(
            t('formatDirectory.failedCount', failCount),
            t('formatDirectory.viewDetails')
        );

        if (showDetails) {
            const outputChannel = vscode.window.createOutputChannel('Format Directory');
            outputChannel.appendLine(t('formatDirectory.failedFiles'));
            failedFiles.forEach(file => outputChannel.appendLine(`  - ${file}`));
            outputChannel.show();
        }
    } else {
        vscode.window.showInformationMessage(message);
    }
}

async function formatFile(uri: vscode.Uri): Promise<boolean> {
    try {
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
        console.error(`Failed to format ${uri.fsPath}:`, error);
        return false;
    }
}
