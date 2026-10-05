# Changelog

All notable changes to the "Format Directory" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

### v1.2.1
- **Bug Fix**: Preview mode now filters unsaved files before showing changes and rechecks them when the user confirms, keeping the preview and actual formatting targets consistent.
- **Bug Fix**: Formatter priority configuration now uses the workspace scope when a workspace is open and the global scope otherwise, while preserving existing settings.
- **Bug Fix**: Cancellation feedback now reports files that were already formatted during the operation.
- **Bug Fix**: Gitignore parsing now supports escaped comment markers, exclamation marks, and spaces without misclassifying escaped negation patterns.
- **Resource Management**: Preview files are uniquely named, stale preview files are cleaned up on activation, and preview listeners are disposed when the extension deactivates.
- **Test**: Added regression coverage for escaped `.gitignore` pattern characters; the suite now contains 15 passing tests.

### v1.2.0
- **Feature**: Added a "Batch Format with Options" command and Explorer context-menu entry, making the existing per-run configuration webview accessible.
- **Bug Fix**: Undo history now retains only files that were actually formatted; backups for skipped, failed, cancelled, and unprocessed files are removed so undo cannot overwrite unrelated later edits.
- **Bug Fix**: Preview and reconfigure webview buttons now use nonce-authorized event listeners instead of CSP-blocked inline handlers.
- **Bug Fix**: Preview formatting now remains under the operation lock until the user confirms or cancels, and repeated confirmation messages cannot start duplicate runs.
- **Bug Fix**: Concurrent formatting operations and undo during an active format are now blocked to prevent interleaved file writes, history corruption, and formatter-setting races.
- **Bug Fix**: An empty `formatdir.recommendedFormatters` configuration now correctly falls back to the built-in recommended formatter list.
- **Bug Fix**: `.gitignore` processing is isolated to the selected directory's workspace folder, preventing rules from other roots in a multi-root workspace from affecting the operation.
- **Bug Fix**: `.gitignore` matching now anchors complete paths, keeps single-star wildcards within a path segment, and evaluates exclusion and negation rules in their original order.
- **Bug Fix**: Formatter-priority overrides now read, update, and restore `editor.defaultFormatter` at the matching language and configuration scope (global, workspace, or workspace folder).
- **Security**: Reconfigure webview messages are validated before their configuration data is used by the extension host.
- **Performance**: Removed unconditional `onStartupFinished` activation; the extension now activates through its contributed commands and view.
- **Build**: Reduced VSIX contents to runtime files by excluding tests, source maps, CI files, local workspace metadata, and development-only assets.
- **CI**: Reduced default GitHub Actions permissions to `contents: read` and moved release publishing into a dedicated job with scoped write permission.
- **Test**: Added regression coverage for anchored glob matching and ordered `.gitignore` exclusion/negation rules; the suite now contains 14 passing tests.
- **Code Quality**: Removed dead state and unused variables, and restored a zero-warning ESLint run.

### v1.1.9
- **Bug Fix**: Formatting is now cancelled when any target file cannot be backed up, preventing formatting operations that cannot be undone.
- **Bug Fix**: Formatting now checks whether edits were applied and files were saved before reporting success.
- **Bug Fix**: Undo keeps the history entry and backup files when any file restore fails, allowing the operation to be retried.
- **Bug Fix**: Single-file formatting now respects configured file extensions and maximum file size limits.
- **Bug Fix**: Nested `.gitignore` scanning no longer stops after the first 100 files.
- **Bug Fix**: Formatter priority restoration no longer overwrites settings changed by the user during formatting.
- **Security**: Reconfigure webview formatter actions no longer interpolate formatter metadata into inline JavaScript handlers.
- **Improvement**: Backup filenames are shorter and use SHA-256 path hashes to reduce Windows path-length issues.
- **Test**: Added regression coverage for nested `.gitignore` patterns and negation rules.
- **Security**: Updated test tooling and pinned patched transitive versions; `npm audit` now reports zero vulnerabilities.

### v1.1.8
- **Bug Fix (Build)**: `src/resultTreeView.ts` was imported by `extension.ts` but untracked in git, causing `tsc` to fail on a fresh clone — now staged for version control.
- **Bug Fix (Build)**: Removed IDE-specific `.dish/workspace-id` from version control (was tracked but deleted in working tree).
- **Bug Fix**: `parseGitignoreContent` misclassified bare directory patterns (e.g. `node_modules` in `.gitignore`) as wildcards after the `**/` prefix was applied, so the contents entry (`node_modules/**`) was never emitted — affected files inside ignored directories could escape exclusion. Now detects wildcard on the original pattern before prefixing.
- **i18n**: Completed tree-view translation keys (`resultTreeSuccess`, `resultTreeSkipped`, `resultTreeFailed`, `resultsClearedMessage`, `resultsWithErrors`, `resultsSuccess`) for the 10 previously incomplete languages: Korean, Traditional Chinese, Turkish, Arabic, Hindi, Dutch, Vietnamese, Polish, Thai, Indonesian — they were previously falling back to English strings.
- **Refactor**: Extracted duplicated `escapeHtml` into `src/utils.ts`, shared by `preview.ts` and `reconfigure.ts`.
- **Refactor**: Extracted `globToRegExp` and `parseGitignoreContent` into `src/globUtils.ts`; `parseGitignore` and `parseGitignoreAtPath` in `extension.ts` now delegate to it, removing ~90 lines of duplicated parsing logic.
- **Refactor**: Moved the hardcoded 14-item recommended formatter list out of `installRecommendedFormatters` into `src/constants.ts` (`DEFAULT_RECOMMENDED_FORMATTERS`), and removed the duplicate `RecommendedFormatter` interface.
- **Refactor**: Removed duplicate `negIncludePattern` in `collectFiles` (identical to the existing `includePattern`), reusing the same value for the negation re-include scan.
- **Test**: Added `test/globUtils.test.ts` (10 cases) covering `globToRegExp` and `parseGitignoreContent` — wired up `test/tsconfig.json` and changed the `test` script to `tsc -p ./test/tsconfig.json && mocha`. Declared `mocha` as an explicit devDependency.

### v1.1.7
- **Bug Fix**: Fixed Promise leak in Reconfigure panel — first-time panel creation path now uses `settled` guard to prevent double resolution when both `onDidReceiveMessage` (save/cancel → resolve → dispose) and `onDidDispose` (resolve(null)) fire; panel reference is now properly cleaned up on disposal.
- **Performance**: Implemented virtual scrolling in Preview panel for large file lists — only visible items are rendered (36px height + 10 item buffer), eliminating DOM bloat and lag when previewing 500+ files; added search/filter box for quick file lookup.
- **Feature**: Added "Format Results" tree view in Explorer sidebar — displays formatting results grouped by status (✅ Successful / ⊘ Skipped / ❌ Failed) with file counts, failure reasons, and clickable file items; includes toolbar buttons for refresh and clear operations.
- **Feature**: Added `formatDirectory.clearResults` command to clear formatting results from tree view.
- **Feature**: Added `formatDirectory.refreshResults` command to manually refresh tree view.
- **Improvement**: Preview panel now passes file data as JSON for client-side rendering instead of server-side HTML concatenation, improving webview initialization time.
- **Improvement**: Format results are now automatically displayed in tree view after each formatting operation with summary statistics.
- **i18n**: Added `resultTreeSuccess`, `resultTreeSkipped`, `resultTreeFailed`, `resultsClearedMessage`, `resultsWithErrors`, and `resultsSuccess` translation keys for all 19 supported languages (en, zh-cn, ja, fr, de, es, it, ru, pt-br, ko, zh-tw, tr, ar, hi, nl, vi, pl, th, id).
- **UI**: Tree view displays real-time statistics in message area (e.g., "50/100 files formatted, 5 errors").
- **UI**: Tree view uses VS Code theme icons for status indicators (check, circle-slash, error) with semantic colors.

### v1.1.6
- **Bug Fix**: Fixed file size filter logging incorrect file name — was using `filteredFiles.length` as index instead of the actual batch index.
- **Bug Fix**: Removed unused `negationExts` variable in `collectFiles` that had incorrect logic.
- **Bug Fix**: Fixed negation pattern regex not escaping metacharacters (`.`, `?`, etc.) — now uses proper `globToRegExp()` helper.
- **Improvement**: Extracted `filterFilesBySize()` shared function — eliminates duplicated file-size filtering code between gitignore and non-gitignore paths.
- **Improvement**: `formatterPriority` now applies batch override before formatting starts and restores after completion, instead of per-file read/write — significantly reduces configuration churn and `onDidChangeConfiguration` event spam.
- **Improvement**: Added nested `.gitignore` support — scans subdirectories for `.gitignore` files and applies their patterns with correct path prefixes.
- **Improvement**: Added formatting elapsed time display in completion messages.
- **Improvement**: Status bar now uses i18n keys `formattingStatus` and `formattingFile` instead of hardcoded English strings.
- **Improvement**: `installRecommendedFormatters` now reads from `formatdir.recommendedFormatters` configuration, allowing users to customize the recommended list.
- **i18n**: Added `formattingStatus` and `formattingFile` translations for all 18 languages.
- **Build**: Updated ESLint config to use `@typescript-eslint/eslint-plugin` direct import for ESLint 9.x flat config compatibility.
- **Build**: Updated `lint` npm script to reference `eslint.config.mjs`.

### v1.1.5
- **Bug Fix**: Fixed `.gitignore` negation patterns (e.g., `!important/`) not actually re-including matched files — post-filter logic was a no-op; now uses a second `findFiles` scan to correctly restore negated paths.
- **Bug Fix**: Fixed undo operation discarding history on restore failure — history is now preserved for retry until all files are successfully restored.
- **Bug Fix**: Fixed binary file corruption during undo — file restore now uses `Uint8Array` / `vscode.workspace.fs.writeFile` instead of UTF-8 string conversion.
- **Bug Fix**: Fixed dirty (unsaved) files being formatted and overwritten without warning — dirty files are now skipped during batch formatting.
- **Bug Fix**: Fixed `formatterPriority` not taking effect during batch formatting — now temporarily overrides `editor.defaultFormatter` per language for the duration of the format operation.
- **Bug Fix**: Fixed formatter detection in Reconfigure panel — removed unreliable heuristics (`contributes.languages`, `description.includes('format')`); now correctly checks `documentFormattingEditProvider` contribution and `Formatters` category.
- **Bug Fix**: Fixed `logLevel` enum missing `warning` level — changed from `["info","debug","error","off"]` to `["debug","info","warning","error","off"]`.
- **Security**: Replaced `unsafe-inline` CSP with nonce-based policy in both Preview and Reconfigure webviews.
- **Improvement**: Preview diff files are now deleted on document close (`onDidCloseTextDocument`) instead of immediately, preventing premature cleanup.
- **Improvement**: `configurePriority` command now queries all installed extensions for formatting providers and presents them as QuickPick items.
- **Improvement**: Status bar messages now use i18n keys for cancelled/completed states.
- **Build**: Upgraded TypeScript target from ES6 to ES2020.
- **Build**: Added ESLint 9.x flat config (`eslint.config.mjs`).

### v1.1.4
- **Bug Fix**: Fixed `log()` function silently dropping all `warning`-level messages due to missing entry in the levels array.
- **Bug Fix**: Fixed double invocation of `onCancel` callback in Preview panel — closing the panel after confirming or cancelling no longer triggers the cancel callback a second time.
- **Bug Fix**: Fixed Promise leak in Reconfigure panel when a second `show()` call reuses an existing panel; closing the panel without interacting no longer leaves the caller permanently suspended.
- **Bug Fix**: Added missing `formatDirectory.respectGitignore` translation key to all 19 supported languages; the Reconfigure panel was previously displaying the raw key string instead of localized text.
- **Performance**: Removed redundant `fs.stat` call in `collectFiles` — the URI is already known to be a directory at the call site.
- **Code Quality**: Simplified file extension map expression that had two identical branches.
- **Code Quality**: Extracted `processInBatches` helper to module level, avoiding unnecessary function allocation on each `formatFiles` call.
- **Security**: Added `Content-Security-Policy` meta tag to both Preview and Reconfigure webviews.
- **Resource**: Temporary diff preview files are now deleted immediately after the diff view is opened, preventing accumulation in extension storage.

### v1.1.3
- **Performance**: Batch processing for backup and undo operations with concurrency control, significantly improving speed on large projects.
- **Performance**: Cached log level setting to avoid repeated config reads during formatting.
- **Performance**: Added batch processing to enforce concurrency limits even when progress UI is disabled.
- **Security**: Fixed HTML injection vulnerability in Preview panel by escaping file paths and URIs.
- **Security**: Fixed HTML injection vulnerability in Reconfigure panel by escaping formatter names and IDs.
- **Multi-root Workspace**: `.gitignore` parsing now scans all workspace folders instead of only the first one.
- **Robustness**: Backup filenames now use MD5 hash to prevent collisions on files with identical names.
- **Bug Fix**: Fixed Promise leak in Reconfigure panel when reopening an existing webview.
- **Bug Fix**: `.gitignore` negation patterns (`!pattern`) are now properly parsed and logged.
- **I18n**: Added 12 missing translation keys (preview, undo, formatter priority labels) to ja/fr/de/es/it/ru locales.

### v1.1.2
- **Performance**: Optimized directory scanning with concurrent file size filtering, making it significantly faster on large projects.
- **Memory Optimization**: Fixed a severe storage leak in the Undo history. Backups now correctly use the extension's local storage instead of VS Code's internal state database.
- **Improved Preview**: The preview feature now generates a true Diff view, allowing users to accurately inspect formatting changes before applying.
- **Accurate Reporting**: Formatting results now precisely report whether files were successfully formatted, already formatted (skipped), or skipped due to missing formatters.
- **New Language Support**: Added Polish (Polski), Thai (ไทย), and Indonesian (Bahasa Indonesia) translations. Now supports 19 languages.

### v1.1.1
- **Enhanced Reconfigure UI**: Replaced sequential InputBox/QuickPick flow with a modern, intuitive Webview-based interface.
- **Smart Formatter Discovery**: Automatically detects installed formatting extensions and lists them for easy selection and configuration.
- **New Language Support**: Added Dutch (Nederlands) and Vietnamese (Tiếng Việt) translations. Now supports 16 languages.
- **Improved I18n**: Completed translations for all 16 supported languages for the new Webview UI.

### v1.1.0
- **Icon Update**: Redesigned the extension icon to remove the blue background and enlarge the icon elements for better visibility and a more modern look.
- **Exclusions**: Added more exclusion options to default formatting behavior.
- **New language support**: Added Arabic (العربية) and Hindi (हिन्दी) translations. Now supports 14 languages.
- **.gitignore support**: Added `respectGitignore` setting to automatically exclude files matching patterns in `.gitignore` (enabled by default).
- **Menu improvement**: Renamed context menu to "Batch Format" for directories and "Format File" for single files for clearer distinction.
- **Formatter installer**: Added "Install Recommended Formatters" command to help users quickly install popular formatters (Prettier, ESLint, Black, etc.) with one click.

### v1.0.9
- **Performance Optimization**: Replaced manual file recursion with high-performance `vscode.workspace.findFiles` API, significantly speeding up file scanning in large projects.
- **New language support**: Added Traditional Chinese (繁體中文) and Turkish (Türkçe) translations.

### v1.0.8
- **Preview Mode**: Added optional preview before applying formatting changes (`formatdir.preview`).
- **Undo Support**: Added ability to undo the last formatting operation (`Format Directory: Undo Last Format`).
- **Formatter Priority**: New command to help configure language-specific default formatters.
- **New Language Support**: Added Portuguese (Brazil) and Korean translations.
- **Enhanced Internationalization**: Improved existing translations and standardized command naming.

### v1.0.7
- **Language Selection**: Added setting to override extension language (supports `auto`, `en`, `zh-cn`, `ja`, `fr`, `de`, `es`, `it`, `ru`)
- **Menu Refinement**: Simplified context menus (removed "Default Settings" and "Reconfigure" options)
- **Publisher Update**: Changed publisher to `steerdock`
- **New language support**: Added Italian (Italiano) and Russian (Русский) translations
- **Single File Formatting**: Added context menu for formatting single files
- **Status Bar Integration**: Added progress tracking and status in the status bar
- **Keyboard Shortcuts**: Added `Ctrl+Alt+L` (Cmd+Alt+L on Mac) to format current file
- **Enhanced Logging**: Added configurable log levels and output panel options

### v1.0.6
- **Performance optimization**: Added configurable concurrency limit (1-50 files, default: 10)
- **File size limit**: Added maximum file size configuration to skip large files (default: 1MB, 0 = no limit)
- **New language support**: Added German (Deutsch) and Spanish (Español) translations
- **Enhanced internationalization**: Now supports 6 languages (English, Chinese, Japanese, French, German, Spanish)

### v1.0.5
- **New language support**: Added Japanese (日本語) and French (Français) translations
- **Enhanced internationalization**: Now supports 4 languages (English, Chinese, Japanese, French)
- **Performance optimization**: Added concurrent file formatting (up to 10 files at once) for faster processing
- **Enhanced reconfigure mode**: Now allows customizing exclude patterns in addition to file extensions and recursive mode
- **Dependency updates**: Upgraded TypeScript to 5.7.2, ESLint to 9.17.0, and other dependencies
- **Bug fix**: Synchronized default file extensions configuration across all files (now includes .sql)
