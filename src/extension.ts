/*
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
import { ReconfigureWebview } from './reconfigure';

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
    respectGitignore: boolean;
}

let statusBarItem: vscode.StatusBarItem;
let outputChannel: vscode.OutputChannel;
let previewManager: PreviewManager;
let historyManager: HistoryManager;
let reconfigureWebview: ReconfigureWebview;
let cachedLogLevel: string = 'info';

export function activate(context: vscode.ExtensionContext) {
    initializeLocale();

    outputChannel = vscode.window.createOutputChannel('Format Directory');
    context.subscriptions.push(outputChannel);
    log('info', 'Format Directory extension is now active!');

    // Cache log level to avoid repeated config reads
    cachedLogLevel = vscode.workspace.getConfiguration('formatdir').get<string>('logLevel', 'info');

    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.command = 'formatdir.formatWithDefault';
    context.subscriptions.push(statusBarItem);

    previewManager = new PreviewManager(context);
    historyManager = new HistoryManager(context);
    reconfigureWebview = new ReconfigureWebview(context);

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
        vscode.commands.registerCommand('formatdir.configurePriority', () => configurePriority()),
        vscode.commands.registerCommand('formatdir.installFormatters', () => installRecommendedFormatters())
    );

    // Listen for configuration changes to update locale
    context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
        if (e.affectsConfiguration('formatdir.language')) {
            initializeLocale();
        }
        if (e.affectsConfiguration('formatdir.logLevel')) {
            cachedLogLevel = vscode.workspace.getConfiguration('formatdir').get<string>('logLevel', 'info');
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
        '**/.git/**', '**/vendor/**', '**/*.min.js', '**/*.min.css',
        '**/.next/**', '**/.nuxt/**', '**/coverage/**', '**/__pycache__/**',
        '**/target/**', '**/.gradle/**', '**/Pods/**', '**/*.min.d.ts'
    ]);
    let showProgress = workspaceConfig.get<boolean>('showProgress', true);
    let concurrencyLimit = workspaceConfig.get<number>('concurrencyLimit', 10);
    let maxFileSize = workspaceConfig.get<number>('maxFileSize', 1048576);
    let logLevel = workspaceConfig.get<string>('logLevel', 'info');
    let openOutputAfterFormat = workspaceConfig.get<boolean>('openOutputAfterFormat', false);
    let preview = workspaceConfig.get<boolean>('preview', false); // Default to false
    let formatterPriority = workspaceConfig.get<Record<string, string>>('formatterPriority', {});
    let respectGitignore = workspaceConfig.get<boolean>('respectGitignore', true);

    if (reconfigure) {
        const result = await reconfigureWebview.show({
            fileExtensions,
            recursive,
            excludePatterns,
            respectGitignore
        });

        if (!result) {
            return null;
        }

        fileExtensions = result.fileExtensions;
        recursive = result.recursive;
        excludePatterns = result.excludePatterns;
        respectGitignore = result.respectGitignore;
    }

    return { fileExtensions, recursive, excludePatterns, showProgress, concurrencyLimit, maxFileSize, logLevel, openOutputAfterFormat, preview, formatterPriority, respectGitignore };
}

/**
 * Parse .gitignore file and convert patterns to glob exclude patterns
 */
async function parseGitignore(workspaceRoot: vscode.Uri): Promise<string[]> {
    const gitignoreUri = vscode.Uri.joinPath(workspaceRoot, '.gitignore');
    const patterns: string[] = [];
    const negationPatterns: string[] = [];

    try {
        const content = await vscode.workspace.fs.readFile(gitignoreUri);
        const text = Buffer.from(content).toString('utf-8');
        const lines = text.split(/\r?\n/);

        for (const line of lines) {
            const trimmed = line.trim();

            // Skip empty lines and comments
            if (!trimmed || trimmed.startsWith('#')) {
                continue;
            }

            // Handle negation patterns separately - add them at the end
            // so they can re-include files previously excluded
            if (trimmed.startsWith('!')) {
                const negated = trimmed.slice(1).trim();
                if (negated) {
                    let negGlob = negated;
                    if (negGlob.endsWith('/')) {
                        negGlob = negGlob.slice(0, -1);
                    }
                    if (negGlob.startsWith('/')) {
                        negGlob = negGlob.slice(1);
                    } else {
                        negGlob = '**/' + negGlob;
                    }
                    negationPatterns.push(negGlob);
                }
                continue;
            }

            // Convert .gitignore pattern to glob pattern
            let globPattern = trimmed;

            // Remove trailing slashes
            if (globPattern.endsWith('/')) {
                globPattern = globPattern.slice(0, -1);
            }

            // Handle patterns starting with /
            if (globPattern.startsWith('/')) {
                globPattern = globPattern.slice(1);
            } else {
                // If pattern doesn't start with /, it can match anywhere
                globPattern = '**/' + globPattern;
            }

            // Handle directory patterns (without wildcard)
            if (!globPattern.includes('*')) {
                // Add both the path itself and everything inside
                patterns.push(globPattern);
                patterns.push(globPattern + '/**');
            } else {
                patterns.push(globPattern);
            }
        }

        // Note: VS Code's findFiles doesn't support negation patterns in exclude glob.
        // We log the negation patterns but cannot fully apply them.
        // This is a known limitation; a proper solution would require post-filtering.
        if (negationPatterns.length > 0) {
            log('debug', `Found ${negationPatterns.length} negation patterns in .gitignore (negation support is limited in exclude glob)`);
        }

        log('info', `Parsed ${patterns.length} patterns from .gitignore`);
    } catch (e) {
        log('debug', 'No .gitignore found or unable to read it');
    }

    return patterns;
}

async function collectFiles(uri: vscode.Uri, config: FormatConfig): Promise<vscode.Uri[]> {
    // 1. Build include pattern from extensions: {*.js,*.ts,...}
    const exts = config.fileExtensions.map(ext => `*${ext}`).join(',');
    const includePattern = new vscode.RelativePattern(uri, config.recursive ? `**/{${exts}}` : `{${exts}}`);

    // 2. Build exclude patterns (combine configured patterns with .gitignore if enabled)
    let allExcludePatterns = [...config.excludePatterns];

    if (config.respectGitignore) {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            // Collect .gitignore patterns from all workspace folders (multi-root support)
            const gitignoreResults = await Promise.all(
                workspaceFolders.map(ws => parseGitignore(ws.uri))
            );
            const allGitignorePatterns = gitignoreResults.flat();
            allExcludePatterns = [...allExcludePatterns, ...allGitignorePatterns];
        }
    }

    // 3. Build exclude glob for findFiles
    const excludeGlob = allExcludePatterns.length > 0
        ? `{${allExcludePatterns.join(',')}}`
        : undefined;

    // 4. Use findFiles for high performance
    const files = await vscode.workspace.findFiles(includePattern, excludeGlob);

    // 5. File size filtering (still needed since findFiles doesn't check size)
    if (config.maxFileSize > 0) {
        const filteredFiles: vscode.Uri[] = [];
        const CONCURRENCY = 50;

        for (let i = 0; i < files.length; i += CONCURRENCY) {
            const batch = files.slice(i, i + CONCURRENCY);
            await Promise.all(batch.map(async file => {
                try {
                    const stat = await vscode.workspace.fs.stat(file);
                    if (stat.size <= config.maxFileSize) {
                        filteredFiles.push(file);
                    } else {
                        log('info', `Skipping ${path.basename(file.fsPath)}: exceeds size limit`);
                    }
                } catch (e) {
                    log('debug', `Failed to stat ${file.fsPath}`);
                }
            }));
        }
        return filteredFiles;
    }

    return files;
}

async function processInBatches<T, R>(
    items: T[],
    concurrencyLimit: number,
    processor: (item: T) => Promise<R>
): Promise<R[]> {
    const results: R[] = [];
    for (let i = 0; i < items.length; i += concurrencyLimit) {
        const batch = items.slice(i, i + concurrencyLimit);
        const batchResults = await Promise.all(batch.map(processor));
        results.push(...batchResults);
    }
    return results;
}

async function formatFiles(files: vscode.Uri[], config: FormatConfig) {
    let successCount = 0;
    let skippedCount = 0;
    let noFormatterCount = 0;
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
                const results = await Promise.all(batch.map(file => formatFile(file, config)));

                for (let j = 0; j < batch.length; j++) {
                    const file = batch[j];
                    const fileName = path.basename(file.fsPath);

                    progress.report({
                        message: `${i + j + 1}/${files.length}: ${fileName}`,
                        increment: (100 / files.length)
                    });

                    statusBarItem.text = `$(sync~spin) Formatting: ${i + j + 1}/${files.length}`;

                    if (results[j] === 'formatted') {
                        successCount++;
                    } else if (results[j] === 'skipped') {
                        skippedCount++;
                    } else if (results[j] === 'no_formatter') {
                        noFormatterCount++;
                    } else {
                        failCount++;
                        failedFiles.push(fileName);
                    }
                }
            }
        });
    } else {
        // Respect concurrencyLimit even without progress UI to avoid OOM
        statusBarItem.text = `$(sync~spin) Formatting...`;
        const results = await processInBatches(files, config.concurrencyLimit, file => formatFile(file, config));
        results.forEach((result, index) => {
            if (result === 'formatted') {
                successCount++;
            } else if (result === 'skipped') {
                skippedCount++;
            } else if (result === 'no_formatter') {
                noFormatterCount++;
            } else {
                failCount++;
                failedFiles.push(path.basename(files[index].fsPath));
            }
        });
    }

    statusBarItem.text = `$(check) Format Directory Done`;
    setTimeout(() => statusBarItem.hide(), 3000);

    let message = t('formatDirectory.complete', successCount + skippedCount);
    if (noFormatterCount > 0) {
        message += ` (${noFormatterCount} skipped/no formatter)`;
    }
    log('info', message);

    if (failCount > 0) {
        message = t('formatDirectory.completeFailed', successCount + skippedCount, failCount);
        if (noFormatterCount > 0) {
            message += ` (${noFormatterCount} no formatter)`;
        }
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

// Return states: 'formatted', 'skipped' (already fine), 'no_formatter', 'failed'
async function formatFile(uri: vscode.Uri, config: FormatConfig): Promise<string> {
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

        if (edits) {
            if (edits.length > 0) {
                const workspaceEdit = new vscode.WorkspaceEdit();
                workspaceEdit.set(document.uri, edits);
                await vscode.workspace.applyEdit(workspaceEdit);
                await document.save();
                return 'formatted';
            } else {
                return 'skipped';
            }
        }

        return 'no_formatter';
    } catch (error: any) {
        log('error', `Failed to format ${uri.fsPath}: ${error}`);
        return 'failed';
    }
}

function log(level: string, message: string) {
    const configuredLevel = cachedLogLevel;

    const levels = ['debug', 'info', 'warning', 'error', 'off'];

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

/**
 * Recommended formatters loaded from configuration
 */
interface RecommendedFormatter {
    id: string;
    name: string;
    description: string;
}

async function installRecommendedFormatters() {
    // Get installed extensions
    const installed = vscode.extensions.all.map(ext => ext.id);

    // Hardcoded recommended formatters instead of reading from configuration
    // to avoid cluttering the user's settings.json file
    const recommendedFormatters: RecommendedFormatter[] = [
        {
            "id": "esbenp.prettier-vscode",
            "name": "Prettier",
            "description": "JavaScript, TypeScript, CSS, JSON, HTML, YAML, PHP, Markdown"
        },
        {
            "id": "ms-python.black-formatter",
            "name": "Black Formatter",
            "description": "Python"
        },
        {
            "id": "golang.go",
            "name": "Go",
            "description": "Go"
        },
        {
            "id": "rust-lang.rust-analyzer",
            "name": "rust-analyzer",
            "description": "Rust"
        },
        {
            "id": "redhat.java",
            "name": "Red Hat Java",
            "description": "Java"
        },
        {
            "id": "ms-vscode.cpptools",
            "name": "C/C++",
            "description": "C, C++"
        },
        {
            "id": "kokororin.vscode-phpfmt",
            "name": "phpfmt",
            "description": "PHP"
        },
        {
            "id": "Vue.volar",
            "name": "Vue - Official",
            "description": "Vue"
        },
        {
            "id": "redhat.vscode-yaml",
            "name": "YAML",
            "description": "YAML"
        },
        {
            "id": "rebornix.ruby",
            "name": "Ruby",
            "description": "Ruby"
        },
        {
            "id": "DotJoshJohnson.xml",
            "name": "XML Tools",
            "description": "XML"
        },
        {
            "id": "yzhang.markdown-all-in-one",
            "name": "Markdown All in One",
            "description": "Markdown"
        },
        {
            "id": "bowlerhatllc.vscode-as3mxml",
            "name": "ActionScript & MXML",
            "description": "ActionScript, MXML"
        },
        {
            "id": "GuTheSoftware.sqlinform",
            "name": "SQLinForm",
            "description": "SQL"
        }
    ];

    // Filter out already installed
    const notInstalled = recommendedFormatters.filter(f => !installed.includes(f.id));

    if (notInstalled.length === 0) {
        vscode.window.showInformationMessage(t('formatDirectory.allFormattersInstalled'));
        return;
    }

    // Show quick pick with multi-select
    const selected = await vscode.window.showQuickPick(
        notInstalled.map(f => ({
            label: f.name,
            description: f.description,
            detail: f.id,
            id: f.id,
            picked: true
        })),
        {
            placeHolder: t('formatDirectory.selectFormatters'),
            canPickMany: true
        }
    );

    if (!selected || selected.length === 0) {
        return;
    }

    // Install selected extensions
    let installedCount = 0;
    let failedCount = 0;

    await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: t('formatDirectory.installingFormatters'),
        cancellable: false
    }, async (progress) => {
        for (let i = 0; i < selected.length; i++) {
            const item = selected[i];
            progress.report({
                message: `${i + 1}/${selected.length}: ${item.label}`,
                increment: 100 / selected.length
            });

            try {
                await vscode.commands.executeCommand('workbench.extensions.installExtension', item.id);
                installedCount++;
                log('info', `Installed: ${item.label}`);
            } catch (e) {
                failedCount++;
                log('error', `Failed to install ${item.label}: ${e}`);
            }
        }
    });

    // Show result
    if (failedCount === 0) {
        vscode.window.showInformationMessage(t('formatDirectory.installComplete', installedCount));
    } else {
        vscode.window.showWarningMessage(t('formatDirectory.installPartial', installedCount, failedCount));
    }
}
