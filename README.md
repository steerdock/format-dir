# Format Directory - VS Code Extension

that formats entire directories or individual files using your configured VS Code formatter settings, accessible via right-click context menu.

## Changelog

### v1.1.2
- **Performance**: Optimized directory scanning with concurrent file size filtering, making it significantly faster on large projects.
- **Memory Optimization**: Fixed a severe storage leak in the Undo history. Backups now correctly use the extension's local storage instead of VS Code's internal state database.
- **Improved Preview**: The preview feature now generates a true Diff view, allowing users to accurately inspect formatting changes before applying.
- **Accurate Reporting**: Formatting results now precisely report whether files were successfully formatted, already formatted (skipped), or skipped due to missing formatters.
- **New Language Support**: Added Polish (Polski), Thai (ไทย), and Indonesian (Bahasa Indonesia) translations. Now supports 19 languages.

See [CHANGELOG.md](./CHANGELOG.md) for detailed release notes.

## Features

- **Right-click formatting**: Format individual files or entire directories directly from the Explorer
- **Recursive formatting**: Optionally format files in subdirectories
- **Customizable file types**: Configure which file extensions to format
- **Exclude patterns**: Skip specific directories or files (e.g., node_modules, dist)
- **.gitignore support**: Optionally respect `.gitignore` patterns for automatic exclusions
- **Progress tracking**: Visual progress notification with cancellation support
- **Error handling**: Detailed error reporting for failed files
- **Internationalization (i18n)**: automatically switches based on VS Code language settings
- **Respects user settings**: Uses your configured formatters and editor settings from `settings.json`
- **Install recommended formatters**: Quickly discover and install popular formatting extensions via the settings page or command palette
- **Performance optimization**: High-performance file scanning using VS Code's native index and concurrent file formatting for faster processing.

## Usage

### Format with Default Settings

1. Right-click on any file or folder in the Explorer
2. Select **"Format"** 
3. The extension will format all matching files based on your settings

## Internationalization

The extension automatically detects your VS Code language setting and displays the interface accordingly:

- **English**: When VS Code is set to English
- **中文**: When VS Code is set to Chinese (Simplified)
- **日本語 (Japanese)**: When VS Code is set to Japanese
- **Français (French)**: When VS Code is set to French
- **Deutsch (German)**: When VS Code is set to German
- **Español (Spanish)**: When VS Code is set to Spanish
- **Italiano (Italian)**: When VS Code is set to Italian
- **Русский (Russian)**: When VS Code is set to Russian
- **Português (Portuguese - Brazil)**: When VS Code is set to Portuguese (Brazil)
- **한국어 (Korean)**: When VS Code is set to Korean
- **Türkçe (Turkish)**: When VS Code is set to Turkish
- **繁體中文 (Traditional Chinese)**: When VS Code is set to Traditional Chinese
- **العربية (Arabic)**: When VS Code is set to Arabic
- **हिन्दी (Hindi)**: When VS Code is set to Hindi
- **Nederlands (Dutch)**: When VS Code is set to Dutch
- **Tiếng Việt (Vietnamese)**: When VS Code is set to Vietnamese
- **Polski (Polish)**: When VS Code is set to Polish
- **ไทย (Thai)**: When VS Code is set to Thai
- **Bahasa Indonesia (Indonesian)**: When VS Code is set to Indonesian
All menu items, notifications, and prompts will be displayed in the appropriate language.

## Configuration

Open VS Code settings and search for "Format Directory" to configure:

### `formatdir.fileExtensions`
Array of file extensions to format.

**Default:**
```json
[
  ".js", ".ts", ".jsx", ".tsx", ".json", ".css", ".scss", ".less",
  ".html", ".xml", ".md", ".yaml", ".yml", ".vue", ".py", ".java",
  ".c", ".cpp", ".h", ".cs", ".go", ".rs", ".php", ".rb", ".sql"
]
```

### `formatdir.recursive`
Whether to recursively format files in subdirectories.

**Default:** `true`

### `formatdir.excludePatterns`
Glob patterns to exclude from formatting.

**Default:**
```json
[
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/out/**",
  "**/.git/**",
  "**/vendor/**",
  "**/*.min.js",
  "**/*.min.css",
  "**/.next/**",
  "**/.nuxt/**",
  "**/coverage/**",
  "**/__pycache__/**",
  "**/target/**",
  "**/.gradle/**",
  "**/Pods/**",
  "**/*.min.d.ts"
]
```

### `formatdir.showProgress`
Show progress notification when formatting.

**Default:** `true`

### `formatdir.concurrencyLimit`
Maximum number of files to format concurrently. Higher values may improve performance but use more system resources.

**Default:** `10`
**Range:** `1-50`

### `formatdir.maxFileSize`
Maximum file size in bytes to format. Files larger than this will be skipped. Set to 0 for no limit.

**Default:** `1048576` (1MB)

### `formatdir.language`
Override the language used by the extension.
- `auto`: Use VS Code display language (default)
- `en`: English
- `zh-cn`: Chinese (Simplified)
- `ja`: Japanese
- `fr`: French
- `de`: German
- `es`: Spanish
- `it`: Italian
- `ru`: Russian
- `pt-br`: Portuguese (Brazil)
- `ko`: Korean
- `tr`: Turkish
- `zh-tw`: Chinese (Traditional)
- `ar`: Arabic
- `hi`: Hindi
- `nl`: Dutch
- `vi`: Vietnamese
- `pl`: Polish
- `th`: Thai
- `id`: Indonesian
### `formatdir.respectGitignore`
Automatically exclude files matching patterns in `.gitignore`. When enabled, the extension reads `.gitignore` from the workspace root and applies its patterns alongside the configured `excludePatterns`.

**Default:** `true`

## Example Configuration

Add to your `settings.json`:

```json
{
  "formatdir.fileExtensions": [".js", ".ts", ".json"],
  "formatdir.recursive": true,
  "formatdir.excludePatterns": [
    "**/node_modules/**",
    "**/dist/**"
  ],
  "formatdir.showProgress": true,
  "formatdir.concurrencyLimit": 10,
  "formatdir.maxFileSize": 1048576,
  "formatdir.language": "auto",
  "formatdir.respectGitignore": true
}
```

## Requirements

- VS Code 1.85.0 or higher
- Appropriate formatters installed for the file types you want to format (e.g., Prettier, ESLint)

## How It Works

The extension uses VS Code's built-in formatting API (`vscode.executeFormatDocumentProvider`), which means it will:

1. **Use your configured formatters**: Automatically applies the formatter you've set for each file type (e.g., Prettier for JavaScript, Black for Python)
2. **Respect your settings**: Reads formatting preferences from your `settings.json`, including:
   - `editor.tabSize` - Tab size for indentation
   - `editor.insertSpaces` - Use spaces or tabs
   - `editor.defaultFormatter` - Default formatter for each language
   - Language-specific formatter settings (e.g., `prettier.singleQuote`, `python.formatting.provider`)
3. **Apply workspace settings**: Uses workspace-specific settings if available

Make sure you have the appropriate formatters installed and configured in your `settings.json`.

## FAQ

### Why are some files being skipped?
Files might be skipped if:
- They don't match the configured `formatdir.fileExtensions`.
- They match an entry in `formatdir.excludePatterns`.
- They match patterns in `.gitignore` (if `respectGitignore` is enabled).
- Their file size exceeds `formatdir.maxFileSize` (default 1MB).
- There is no formatter installed/configured in VS Code for that file type.

### How do I use a specific formatter (e.g. Prettier instead of built-in)?
This extension uses your VS Code settings. Set the default formatter for a language in your `settings.json`:
```json
"[javascript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
}
```
You can also use the **"Format Directory: Configure Formatter Priority"** command to quickly jump to these settings.

### Can I undo a formatting operation?
Yes! Use the command **"Format Directory: Undo Last Format"** from the Command Palette (`Ctrl+Shift+P`) to revert the changes.

### How do I install formatters for my project?
Use the command **"Format Directory: Install Recommended Formatters"** from the Command Palette (`Ctrl+Shift+P`). This will show a list of popular formatters (Prettier, ESLint, Black, etc.) that you can select and install with one click.

## License

MIT License - Copyright (c) 2026 SteerDock Contributors
