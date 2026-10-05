/*
 * @Author: Anthony Rivera && opcnlin@gmail.com
 * @FilePath: \src\extension.ts
 * Copyright (c) 2026 SteerDock Contributors
 * Licensed under the MIT License
 */
import * as vscode from "vscode";
import * as path from "path";
import { initializeLocale, t } from "./i18n";
import { PreviewManager } from "./preview";
import { HistoryManager } from "./history";
import { ReconfigureWebview } from "./reconfigure";
import { ResultTreeViewManager, FormatResult } from "./resultTreeView";
import { GitignoreRule, globToRegExp, parseGitignoreContent } from "./globUtils";
import { DEFAULT_RECOMMENDED_FORMATTERS, RecommendedFormatter } from "./constants";
interface FormatConfig {
	fileExtensions: string[];
	recursive: boolean;
	excludePatterns: string[];
	showProgress: boolean;
	concurrencyLimit: number;
	maxFileSize: number;
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
let resultTreeViewManager: ResultTreeViewManager;
let cachedLogLevel: string = "info";
let formatInProgress = false;
let statusBarHideTimer: ReturnType<typeof setTimeout> | undefined;
function hideStatusBarAfterDelay() {
	if (statusBarHideTimer) {
		clearTimeout(statusBarHideTimer);
	}
	statusBarHideTimer = setTimeout(() => {
		statusBarItem.hide();
		statusBarHideTimer = undefined;
	}, 3000);
}
export function activate(context: vscode.ExtensionContext) {
	initializeLocale();
	outputChannel = vscode.window.createOutputChannel("Format Directory");
	context.subscriptions.push(outputChannel);
	log("info", "Format Directory extension is now active!");

	// Cache log level to avoid repeated config reads
	cachedLogLevel = vscode.workspace.getConfiguration("formatdir").get<string>("logLevel", "info");
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
	statusBarItem.command = "formatdir.formatWithDefault";
	context.subscriptions.push(statusBarItem);
	previewManager = new PreviewManager(context);
	context.subscriptions.push({ dispose: () => previewManager.dispose() });
	historyManager = new HistoryManager(context);
	reconfigureWebview = new ReconfigureWebview(context);
	resultTreeViewManager = new ResultTreeViewManager(context);
	const handleFormatCommand = async (uri: vscode.Uri | undefined, reconfigure: boolean) => {
		if (!uri) {
			if (vscode.window.activeTextEditor) {
				uri = vscode.window.activeTextEditor.document.uri;
			} else {
				vscode.window.showWarningMessage(t("formatDirectory.noFiles"));
				return;
			}
		}
		await formatDirectory(uri, reconfigure);
	};
	context.subscriptions.push(vscode.commands.registerCommand("formatdir.formatWithDefault", uri => handleFormatCommand(uri, false)), vscode.commands.registerCommand("formatdir.formatFileWithDefault", uri => handleFormatCommand(uri, false)), vscode.commands.registerCommand("formatdir.formatWithConfig", uri => handleFormatCommand(uri, true)), vscode.commands.registerCommand("formatdir.undo", () => {
		if (formatInProgress) {
			return vscode.window.showWarningMessage(t("formatDirectory.alreadyRunning"));
		}
		return historyManager.undo();
	}), vscode.commands.registerCommand("formatdir.configurePriority", () => configurePriority()), vscode.commands.registerCommand("formatdir.installFormatters", () => installRecommendedFormatters()));

	// Listen for configuration changes to update locale
	context.subscriptions.push(vscode.workspace.onDidChangeConfiguration(e => {
		if (e.affectsConfiguration("formatdir.language")) {
			initializeLocale();
		}
		if (e.affectsConfiguration("formatdir.logLevel")) {
			cachedLogLevel = vscode.workspace.getConfiguration("formatdir").get<string>("logLevel", "info");
		}
	}));
}
export function deactivate() { }
async function formatDirectory(uri: vscode.Uri, reconfigure: boolean) {
	if (formatInProgress) {
		vscode.window.showWarningMessage(t("formatDirectory.alreadyRunning"));
		return;
	}
	formatInProgress = true;
	try {
		const config = await getFormatConfig(reconfigure);
		if (!config) {
			return;
		}
		let files: vscode.Uri[] = [];
		const stat = await vscode.workspace.fs.stat(uri);
		if (stat.type === vscode.FileType.File) {
			const extension = path.extname(uri.fsPath).toLowerCase();
			const allowedExtensions = config.fileExtensions.map(ext => ext.startsWith(".") ? ext.toLowerCase() : `.${ext.toLowerCase()}`);
			if (!allowedExtensions.includes(extension)) {
				vscode.window.showInformationMessage(t("formatDirectory.noFiles"));
				return;
			}
			if (config.maxFileSize > 0 && stat.size > config.maxFileSize) {
				vscode.window.showInformationMessage(t("formatDirectory.noFiles"));
				return;
			}
			files = [uri];
			log("info", `Formatting single file: ${uri.fsPath}`);
		} else {
			log("info", `Formatting directory: ${uri.fsPath}`);
			if (config.showProgress && !config.preview) {
				await vscode.window.withProgress({
					location: vscode.ProgressLocation.Notification,
					title: t("formatDirectory.formatting"),
					cancellable: true
				}, async (progress, token) => {
					progress.report({
						increment: 0,
						message: "Scanning..."
					});
					files = await collectFiles(uri, config, token);
					if (token.isCancellationRequested) {
						vscode.window.showInformationMessage(t("formatDirectory.cancelled"));
						return;
					}
					if (files.length === 0) {
						vscode.window.showInformationMessage(t("formatDirectory.noFiles"));
						return;
					}
					await executeFormat(files, config, progress, token);
				});
				return;
			}
			files = await collectFiles(uri, config);
		}
		if (files.length === 0) {
			vscode.window.showInformationMessage(t("formatDirectory.noFiles"));
			return;
		}
		if (config.preview) {
			// Preview and execution must operate on the same set. In particular,
			// dirty documents are intentionally skipped by formatFile().
			files = await filterPreviewFiles(files);
			if (files.length === 0) {
				vscode.window.showInformationMessage(t("formatDirectory.noFiles"));
				return;
			}
			await previewManager.showPreview(files, async () => {
				// Re-check at confirmation time because a document may have become
				// dirty while the preview panel was open.
				files = await filterPreviewFiles(files);
				if (files.length > 0) {
					await executeFormat(files, config);
				}
			}, () => {
				log("info", "Preview cancelled by user.");
			});
		} else {
			await executeFormat(files, config);
		}
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		log("error", `Error in formatDirectory: ${message}`);
		statusBarItem.text = `$(error) ${t("formatDirectory.failed", message)}`;
		hideStatusBarAfterDelay();
		vscode.window.showErrorMessage(t("formatDirectory.failed", message));
	} finally {
		formatInProgress = false;
	}
}

/** Keep the preview file set identical to the files that can be formatted. */
async function filterPreviewFiles(files: vscode.Uri[]): Promise<vscode.Uri[]> {
	const result: vscode.Uri[] = [];
	for (const file of files) {
		try {
			const document = await vscode.workspace.openTextDocument(file);
			if (!document.isDirty) {
				result.push(file);
			} else {
				log("info", `Skipping preview for ${path.basename(file.fsPath)}: file has unsaved changes`);
			}
		} catch {
			log("debug", `Failed to open ${file.fsPath} while preparing preview`);
		}
	}
	return result;
}
async function executeFormat(files: vscode.Uri[], config: FormatConfig, progress?: vscode.Progress<{
	message?: string;
	increment?: number;
}>, token?: vscode.CancellationToken) {
	// Save history before formatting
	const backupResult = await historyManager.add(files);
	if (backupResult.failed.length > 0) {
		vscode.window.showErrorMessage(t("formatDirectory.backupFailed", backupResult.failed.length));
		return;
	}
	const formattedFiles: vscode.Uri[] = [];
	try {
		await formatFiles(files, config, progress, token, file => {
			formattedFiles.push(file);
		});
	} finally {
		await historyManager.retain(backupResult.id, formattedFiles);
	}
}
async function getFormatConfig(reconfigure: boolean): Promise<FormatConfig | null> {
	const workspaceConfig = vscode.workspace.getConfiguration("formatdir");
	let fileExtensions = workspaceConfig.get<string[]>("fileExtensions", [".js", ".ts", ".jsx", ".tsx", ".json", ".css", ".scss", ".less", ".html", ".xml", ".md", ".yaml", ".yml", ".vue", ".py", ".java", ".c", ".cpp", ".h", ".cs", ".go", ".rs", ".php", ".rb", ".sql"]);
	let recursive = workspaceConfig.get<boolean>("recursive", true);
	let excludePatterns = workspaceConfig.get<string[]>("excludePatterns", ["**/node_modules/**", "**/dist/**", "**/build/**", "**/out/**", "**/.git/**", "**/vendor/**", "**/*.min.js", "**/*.min.css", "**/.next/**", "**/.nuxt/**", "**/coverage/**", "**/__pycache__/**", "**/target/**", "**/.gradle/**", "**/Pods/**", "**/*.min.d.ts"]);
	let showProgress = workspaceConfig.get<boolean>("showProgress", true);
	let concurrencyLimit = workspaceConfig.get<number>("concurrencyLimit", 10);
	let maxFileSize = workspaceConfig.get<number>("maxFileSize", 1048576);
	let openOutputAfterFormat = workspaceConfig.get<boolean>("openOutputAfterFormat", false);
	let preview = workspaceConfig.get<boolean>("preview", false); // Default to false
	let formatterPriority = workspaceConfig.get<Record<string, string>>("formatterPriority", {});
	let respectGitignore = workspaceConfig.get<boolean>("respectGitignore", true);
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
	concurrencyLimit = Math.max(1, Math.min(50, Math.floor(concurrencyLimit) || 10));
	maxFileSize = Math.max(0, Math.floor(maxFileSize) || 0);
	return {
		fileExtensions,
		recursive,
		excludePatterns,
		showProgress,
		concurrencyLimit,
		maxFileSize,
		openOutputAfterFormat,
		preview,
		formatterPriority,
		respectGitignore
	};
}

/**
 * Parse .gitignore file and convert patterns to glob exclude patterns
 */
async function parseGitignore(workspaceRoot: vscode.Uri): Promise<{
	patterns: string[];
	negationPatterns: string[];
	rules: GitignoreRule[];
}> {
	const gitignoreUri = vscode.Uri.joinPath(workspaceRoot, ".gitignore");
	const empty = {
		patterns: [] as string[],
		negationPatterns: [] as string[],
		rules: [] as GitignoreRule[]
	};
	try {
		const content = await vscode.workspace.fs.readFile(gitignoreUri);
		const text = Buffer.from(content).toString("utf-8");
		const result = parseGitignoreContent(text, "");
		if (result.negationPatterns.length > 0) {
			log("debug", `Found ${result.negationPatterns.length} negation patterns in .gitignore`);
		}
		log("info", `Parsed ${result.patterns.length} patterns from .gitignore`);
		return result;
	} catch {
		log("debug", "No .gitignore found or unable to read it");
		return empty;
	}
}

/**
 * Filter files by max size, preserving original order.
 * Shared by both gitignore and non-gitignore paths.
 */
async function filterFilesBySize(files: vscode.Uri[], maxFileSize: number, token?: vscode.CancellationToken): Promise<vscode.Uri[]> {
	if (maxFileSize <= 0) {
		return files;
	}
	const filteredFiles: vscode.Uri[] = [];
	const CONCURRENCY = 50;
	for (let i = 0; i < files.length; i += CONCURRENCY) {
		if (token?.isCancellationRequested) {
			return filteredFiles;
		}
		const batch = files.slice(i, i + CONCURRENCY);
		const batchResults = await Promise.all(batch.map(async file => {
			try {
				const stat = await vscode.workspace.fs.stat(file);
				return stat.size <= maxFileSize ? file : null;
			} catch {
				log("debug", `Failed to stat ${file.fsPath}`);
				return null;
			}
		}));
		for (let j = 0; j < batchResults.length; j++) {
			const result = batchResults[j];
			if (result) {
				filteredFiles.push(result);
			} else {
				log("info", `Skipping ${path.basename(batch[j].fsPath)}: exceeds size limit`);
			}
		}
	}
	return filteredFiles;
}
async function collectFiles(uri: vscode.Uri, config: FormatConfig, token?: vscode.CancellationToken): Promise<vscode.Uri[]> {
	// 1. Build include pattern from extensions: {*.js,*.ts,...}
	const exts = config.fileExtensions.map(ext => `*${ext}`).join(",");
	const includePattern = new vscode.RelativePattern(uri, config.recursive ? `**/{${exts}}` : `{${exts}}`);

	// 2. Build exclude patterns (combine configured patterns with .gitignore if enabled)
	const allExcludePatterns = [...config.excludePatterns];
	if (config.respectGitignore) {
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri);
		if (workspaceFolder) {
			// Only rules from the target workspace may affect the selected directory.
			const gitignoreResults = [await parseGitignore(workspaceFolder.uri)];
			const nestedGitignoreResults = await findNestedGitignores(workspaceFolder, token);
			const gitignoreRules = [...gitignoreResults, ...nestedGitignoreResults].flatMap(result => result.rules);
			// Find configured candidates first, then evaluate .gitignore paths relative
			// to the workspace root. RelativePattern exclusions are relative to the
			// selected directory and cannot correctly represent root-anchored rules.
			const excludeGlob = config.excludePatterns.length > 0 ? `{${config.excludePatterns.join(",")}}` : undefined;
			const candidates = await vscode.workspace.findFiles(includePattern, excludeGlob, undefined, token);
			const matchers = gitignoreRules.map(rule => ({
				negated: rule.negated,
				matcher: globToRegExp(rule.pattern)
			}));
			const files = candidates.filter(file => {
				const relative = path.relative(workspaceFolder.uri.fsPath, file.fsPath).replace(/\\/g, "/");
				let ignored = false;
				for (const rule of matchers) {
					if (rule.matcher.test(relative)) {
						ignored = !rule.negated;
					}
				}
				return !ignored;
			});

			// 4. File size filtering
			return filterFilesBySize(files, config.maxFileSize, token);
		}
	}

	// Non-gitignore path
	const excludeGlob = allExcludePatterns.length > 0 ? `{${allExcludePatterns.join(",")}}` : undefined;
	const files = await vscode.workspace.findFiles(includePattern, excludeGlob, undefined, token);
	return filterFilesBySize(files, config.maxFileSize, token);
}

/**
 * Find nested .gitignore files in subdirectories and parse them.
 * Returns patterns relative to their respective workspace root.
 */
async function findNestedGitignores(workspaceFolder: vscode.WorkspaceFolder, token?: vscode.CancellationToken): Promise<{
	patterns: string[];
	negationPatterns: string[];
	rules: GitignoreRule[];
}[]> {
	const results: {
		patterns: string[];
		negationPatterns: string[];
		rules: GitignoreRule[];
	}[] = [];
	try {
		// Find all .gitignore files under the workspace root
		const gitignoreFiles = await vscode.workspace.findFiles(new vscode.RelativePattern(workspaceFolder.uri, "**/.gitignore"), undefined, undefined, token);
		gitignoreFiles.sort((a, b) => a.fsPath.localeCompare(b.fsPath));
		for (const gitignoreUri of gitignoreFiles) {
			// Skip the root .gitignore (already handled by parseGitignore)
			const rootGitignore = vscode.Uri.joinPath(workspaceFolder.uri, ".gitignore");
			if (gitignoreUri.toString() === rootGitignore.toString()) {
				continue;
			}

			// Compute the relative directory prefix for this nested .gitignore
			const relativeDir = path.relative(workspaceFolder.uri.fsPath, path.dirname(gitignoreUri.fsPath)).replace(/\\/g, "/");
			const result = await parseGitignoreAtPath(gitignoreUri, relativeDir);
			if (result.patterns.length > 0 || result.negationPatterns.length > 0) {
				results.push(result);
			}
		}
	} catch {
		log("debug", `Failed to scan nested .gitignore files in ${workspaceFolder.name}`);
	}
	return results;
}

/**
 * Parse a .gitignore file at a specific path, prefixing all patterns with the given relative directory.
 */
async function parseGitignoreAtPath(gitignoreUri: vscode.Uri, relativeDir: string): Promise<{
	patterns: string[];
	negationPatterns: string[];
	rules: GitignoreRule[];
}> {
	const empty = {
		patterns: [] as string[],
		negationPatterns: [] as string[],
		rules: [] as GitignoreRule[]
	};
	try {
		const content = await vscode.workspace.fs.readFile(gitignoreUri);
		const text = Buffer.from(content).toString("utf-8");
		const dirPrefix = relativeDir.replace(/\\/g, "/") + "/";
		const result = parseGitignoreContent(text, dirPrefix);
		if (result.patterns.length > 0 || result.negationPatterns.length > 0) {
			log("debug", `Parsed ${result.patterns.length} patterns from nested .gitignore at ${relativeDir}`);
		}
		return result;
	} catch {
		log("debug", `Failed to read nested .gitignore at ${gitignoreUri.fsPath}`);
		return empty;
	}
}
async function processInBatches<T, R>(items: T[], concurrencyLimit: number, processor: (item: T) => Promise<R>, token?: vscode.CancellationToken): Promise<R[]> {
	const results: R[] = [];
	for (let i = 0; i < items.length; i += concurrencyLimit) {
		if (token?.isCancellationRequested) {
			break;
		}
		const batch = items.slice(i, i + concurrencyLimit);
		const batchResults = await Promise.all(batch.map(processor));
		results.push(...batchResults);
	}
	return results;
}
async function formatFiles(files: vscode.Uri[], config: FormatConfig, externalProgress?: vscode.Progress<{
	message?: string;
	increment?: number;
}>, externalToken?: vscode.CancellationToken, onFormatted?: (file: vscode.Uri) => void): Promise<void> {
	let successCount = 0;
	let skippedCount = 0;
	let noFormatterCount = 0;
	let failCount = 0;
	const failedFiles: string[] = [];
	const formatResults: FormatResult[] = [];
	const startTime = Date.now();
	statusBarItem.show();
	if (statusBarHideTimer) {
		clearTimeout(statusBarHideTimer);
		statusBarHideTimer = undefined;
	}
	statusBarItem.text = `$(sync~spin) ${t("formatDirectory.formattingStatus")}`;

	// Pre-apply formatterPriority: batch-override defaultFormatter per language once
	const overriddenLangs = new Map<string, {
		config: vscode.WorkspaceConfiguration;
		target: vscode.ConfigurationTarget;
		formatterId: string;
		original?: string;
	}>();
	if (Object.keys(config.formatterPriority).length > 0) {
		const scopeUri = files[0];
		const workspaceFolder = vscode.workspace.getWorkspaceFolder(scopeUri);
		const target = workspaceFolder
			? vscode.ConfigurationTarget.WorkspaceFolder
			: (vscode.workspace.workspaceFile || (vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0)
				? vscode.ConfigurationTarget.Workspace
				: vscode.ConfigurationTarget.Global);
		for (const [langId, formatterId] of Object.entries(config.formatterPriority)) {
			const langConfig = vscode.workspace.getConfiguration("editor", {
				uri: scopeUri,
				languageId: langId
			});
			const inspection = langConfig.inspect<string>("defaultFormatter");
			const original = workspaceFolder ? inspection?.workspaceFolderLanguageValue : target === vscode.ConfigurationTarget.Workspace ? inspection?.workspaceLanguageValue : inspection?.globalLanguageValue;
			const current = langConfig.get<string>("defaultFormatter");
			if (current !== formatterId) {
				try {
					await langConfig.update("defaultFormatter", formatterId, target, true);
					overriddenLangs.set(langId, {
						config: langConfig,
						target,
						formatterId,
						original
					});
					log("debug", `Batch overrode formatter for ${langId} to ${formatterId}`);
				} catch (e) {
					log("warning", `Failed to override formatter for ${langId}: ${e}`);
				}
			}
		}
	}
	let cancelled = false;
	const runBatches = async (progress: vscode.Progress<{
		message?: string;
		increment?: number;
	}> | undefined, token: vscode.CancellationToken | undefined) => {
		if (progress) {
			progress.report({
				increment: 0,
				message: `0/${files.length}`
			});
		}
		for (let i = 0; i < files.length; i += config.concurrencyLimit) {
			if (token?.isCancellationRequested) {
				cancelled = true;
				log("info", "Formatting cancelled by user.");
				vscode.window.showInformationMessage(t("formatDirectory.cancelled"));
				return;
			}
			const batch = files.slice(i, i + config.concurrencyLimit);
			const results = await Promise.all(batch.map(file => formatFile(file, config, token)));
			for (let j = 0; j < batch.length; j++) {
				const file = batch[j];
				const fileName = path.basename(file.fsPath);
				if (progress) {
					progress.report({
						message: `${i + j + 1}/${files.length}: ${fileName}`,
						increment: 100 / files.length
					});
				}
				statusBarItem.text = `$(sync~spin) ${t("formatDirectory.formattingFile", String(i + j + 1), String(files.length))}`;
				if (results[j] === "formatted") {
					successCount++;
					onFormatted?.(file);
					formatResults.push({
						uri: file,
						status: "success"
					});
				} else if (results[j].startsWith("skipped")) {
					skippedCount++;
					formatResults.push({
						uri: file,
						status: "skipped",
						reason: results[j].slice("skipped".length).replace(/^:\s*/, "") || "Skipped"
					});
				} else if (results[j] === "no_formatter") {
					noFormatterCount++;
					formatResults.push({
						uri: file,
						status: "skipped",
						reason: "No formatter available"
					});
				} else if (results[j] === "cancelled") {
					cancelled = true;
				} else {
					failCount++;
					failedFiles.push(fileName);
					formatResults.push({
						uri: file,
						status: "failed",
						reason: results[j]
					});
				}
			}
			if (cancelled) {
				return;
			}
		}
	};
	try {
		if (externalProgress !== undefined) {
			await runBatches(externalProgress, externalToken);
		} else if (config.showProgress) {
			await vscode.window.withProgress({
				location: vscode.ProgressLocation.Notification,
				title: t("formatDirectory.formatting"),
				cancellable: true
			}, async (progress, token) => {
				await runBatches(progress, token);
			});
		} else {
			// Respect concurrencyLimit even without progress UI to avoid OOM
			const results = await processInBatches(files, config.concurrencyLimit, file => formatFile(file, config, externalToken), externalToken);
			results.forEach((result, index) => {
				const file = files[index];
				if (result === "formatted") {
					successCount++;
					onFormatted?.(file);
					formatResults.push({
						uri: file,
						status: "success"
					});
				} else if (result.startsWith("skipped")) {
					skippedCount++;
					formatResults.push({
						uri: file,
						status: "skipped",
						reason: result.slice("skipped".length).replace(/^:\s*/, "") || "Skipped"
					});
				} else if (result === "no_formatter") {
					noFormatterCount++;
					formatResults.push({
						uri: file,
						status: "skipped",
						reason: "No formatter available"
					});
				} else if (result === "cancelled") {
					cancelled = true;
				} else {
					failCount++;
					failedFiles.push(path.basename(file.fsPath));
					formatResults.push({
						uri: file,
						status: "failed",
						reason: result
					});
				}
			});
		}
	} finally {
		// Restore formatterPriority overrides
		for (const [langId, override] of overriddenLangs) {
			try {
				const current = override.config.get<string>("defaultFormatter");
				if (current !== override.formatterId) {
					continue;
				}
				await override.config.update("defaultFormatter", override.original, override.target, true);
				log("debug", `Restored formatter for ${langId}`);
			} catch (e) {
				log("warning", `Failed to restore formatter for ${langId}: ${e}`);
			}
		}
	}
	const elapsedMs = Date.now() - startTime;
	const elapsedSec = (elapsedMs / 1000).toFixed(1);
	if (cancelled) {
		statusBarItem.text = `$(x) ${t("formatDirectory.cancelled")}`;
		hideStatusBarAfterDelay();
		if (successCount > 0) {
			vscode.window.showInformationMessage(`${t("formatDirectory.cancelled")} (${successCount} ${t("formatDirectory.filesAlreadyFormatted")})`);
		}
		return;
	}

	// Show results in TreeView
	if (formatResults.length > 0) {
		resultTreeViewManager.showResults(formatResults);
	}
	statusBarItem.text = `$(check) ${t("formatDirectory.complete", "")}`;
	hideStatusBarAfterDelay();
	let message = t("formatDirectory.complete", successCount + skippedCount);
	if (noFormatterCount > 0) {
		message += " " + t("formatDirectory.noFormatterSuffix", noFormatterCount);
	}
	message += ` (${elapsedSec}s)`;
	log("info", message);
	if (failCount > 0) {
		message = t("formatDirectory.completeFailed", successCount + skippedCount, failCount);
		if (noFormatterCount > 0) {
			message += " " + t("formatDirectory.noFormatterSuffix", noFormatterCount);
		}
		message += ` (${elapsedSec}s)`;
		log("warning", message);
		const showDetails = await vscode.window.showWarningMessage(t("formatDirectory.failedCount", failCount), t("formatDirectory.viewDetails"));
		if (showDetails) {
			outputChannel.appendLine(t("formatDirectory.failedFiles"));
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
async function formatFile(uri: vscode.Uri, _config: FormatConfig, token?: vscode.CancellationToken): Promise<string> {
	try {
		if (token?.isCancellationRequested) {
			return "cancelled";
		}
		log("debug", `Formatting file: ${uri.fsPath}`);
		const document = await vscode.workspace.openTextDocument(uri);

		// Skip dirty (unsaved) files to avoid overwriting user's uncommitted changes
		if (document.isDirty) {
			log("info", `Skipping ${path.basename(uri.fsPath)}: file has unsaved changes`);
			return "skipped: file has unsaved changes";
		}
		const editorConfig = vscode.workspace.getConfiguration("editor", document.uri);
		const options = {
			insertSpaces: editorConfig.get<boolean>("insertSpaces", true),
			tabSize: editorConfig.get<number>("tabSize", 4)
		};
		const edits = await vscode.commands.executeCommand<vscode.TextEdit[]>("vscode.executeFormatDocumentProvider", document.uri, options);
		if (edits) {
			if (edits.length > 0) {
				const workspaceEdit = new vscode.WorkspaceEdit();
				workspaceEdit.set(document.uri, edits);
				const applied = await vscode.workspace.applyEdit(workspaceEdit);
				if (!applied) {
					return "failed: changes could not be applied";
				}
				const saved = await document.save();
				if (!saved) {
					return "failed: file could not be saved";
				}
				return "formatted";
			} else {
				return "skipped";
			}
		}
		return "no_formatter";
	} catch (error: unknown) {
		const message = error instanceof Error ? error.message : String(error);
		log("error", `Failed to format ${uri.fsPath}: ${message}`);
		return `failed: ${message}`;
	}
}
function log(level: string, message: string) {
	const configuredLevel = cachedLogLevel;
	const levels = ["debug", "info", "warning", "error", "off"];
	if (levels.indexOf(level) >= levels.indexOf(configuredLevel) && configuredLevel !== "off") {
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
		placeHolder: t("formatDirectory.configurePriority")
	});
	if (!lang) {
		return;
	}

	// 2. Find installed formatters for this language
	const formatters: {
		id: string;
		name: string;
	}[] = [];
	vscode.extensions.all.forEach(ext => {
		const pkg = ext.packageJSON;
		const hasFormatter = pkg?.contributes?.documentFormattingEditProvider || pkg?.categories?.includes("Formatters");
		if (hasFormatter && !ext.id.startsWith("vscode.")) {
			const langs = pkg?.contributes?.languages?.map((l: {
				id: string;
			}) => l.id) || [];
			if (langs.length === 0 || langs.includes(lang)) {
				formatters.push({
					id: ext.id,
					name: pkg.displayName || ext.id
				});
			}
		}
	});
	if (formatters.length === 0) {
		// No formatter found, open settings
		vscode.commands.executeCommand("workbench.action.openSettings", `@lang:${lang} editor.defaultFormatter`);
		return;
	}

	// 3. Let user select a formatter
	const selected = await vscode.window.showQuickPick(formatters.map(f => ({
		label: f.name,
		description: f.id,
		id: f.id
	})), {
		placeHolder: t("formatDirectory.configurePriority") + ": " + lang
	});
	if (!selected) {
		return;
	}

	// 4. Write to settings.json
	const config = vscode.workspace.getConfiguration("formatdir");
	const currentPriority = {
		...config.get<Record<string, string>>("formatterPriority", {})
	};
	currentPriority[lang] = selected.id;
	const target = vscode.workspace.workspaceFolders && vscode.workspace.workspaceFolders.length > 0
		? vscode.ConfigurationTarget.Workspace
		: vscode.ConfigurationTarget.Global;
	await config.update("formatterPriority", currentPriority, target);
	vscode.window.showInformationMessage(t("formatDirectory.configurePriority") + `: ${lang} -> ${selected.label}`);
}

/**
 * Recommended formatters loaded from configuration
 */
async function installRecommendedFormatters() {
	// Get installed extensions
	const installed = vscode.extensions.all.map(ext => ext.id);

	// Load recommended formatters from configuration, fallback to built-in defaults
	const config = vscode.workspace.getConfiguration("formatdir");
	const configuredFormatters = config.get<RecommendedFormatter[]>("recommendedFormatters");
	const recommendedFormatters = configuredFormatters?.length ? configuredFormatters : DEFAULT_RECOMMENDED_FORMATTERS;

	// Filter out already installed
	const notInstalled = recommendedFormatters.filter(f => !installed.includes(f.id));
	if (notInstalled.length === 0) {
		vscode.window.showInformationMessage(t("formatDirectory.allFormattersInstalled"));
		return;
	}

	// Show quick pick with multi-select
	const selected = await vscode.window.showQuickPick(notInstalled.map(f => ({
		label: f.name,
		description: f.description,
		detail: f.id,
		id: f.id,
		picked: true
	})), {
		placeHolder: t("formatDirectory.selectFormatters"),
		canPickMany: true
	});
	if (!selected || selected.length === 0) {
		return;
	}

	// Install selected extensions
	let installedCount = 0;
	let failedCount = 0;
	await vscode.window.withProgress({
		location: vscode.ProgressLocation.Notification,
		title: t("formatDirectory.installingFormatters"),
		cancellable: false
	}, async progress => {
		for (let i = 0; i < selected.length; i++) {
			const item = selected[i];
			progress.report({
				message: `${i + 1}/${selected.length}: ${item.label}`,
				increment: 100 / selected.length
			});
			try {
				await vscode.commands.executeCommand("workbench.extensions.installExtension", item.id);
				installedCount++;
				log("info", `Installed: ${item.label}`);
			} catch (e) {
				failedCount++;
				log("error", `Failed to install ${item.label}: ${e}`);
			}
		}
	});

	// Show result
	if (failedCount === 0) {
		vscode.window.showInformationMessage(t("formatDirectory.installComplete", installedCount));
	} else {
		vscode.window.showWarningMessage(t("formatDirectory.installPartial", installedCount, failedCount));
	}
}
