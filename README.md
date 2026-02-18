# Format Directory - VS Code Extension

A VS Code extension that allows you to format entire directories with a right-click context menu option.

## Changelog

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

## Features

- **Right-click directory formatting**: Format all files in a directory directly from the Explorer
- **Recursive formatting**: Optionally format files in subdirectories
- **Customizable file types**: Configure which file extensions to format
- **Exclude patterns**: Skip specific directories or files (e.g., node_modules, dist)
- **Progress tracking**: Visual progress notification with cancellation support
- **Error handling**: Detailed error reporting for failed files
- **Internationalization (i18n)**: automatically switches based on VS Code language settings
- **Respects user settings**: Uses your configured formatters and editor settings from `settings.json`
- **Performance optimization**: Concurrent file formatting for faster processing
- **Two formatting modes**:
  - **Default**: Use saved configuration settings
  - **Reconfigure**: Customize settings on-the-fly before formatting (including file extensions, recursive mode, and exclude patterns)

## Usage

### Format with Default Settings

1. Right-click on any folder in the Explorer
2. Select **"Format Directory (Default Settings)"** or **"格式化目录 (默认配置)"** (depending on your VS Code language)
3. The extension will format all matching files based on your settings

### Format with Custom Settings

1. Right-click on any folder in the Explorer
2. Select **"Format Directory (Reconfigure)"** or **"格式化目录 (重新配置)"**
3. Enter file extensions to format (comma-separated)
4. Choose whether to format subdirectories recursively
5. Formatting will begin with your custom settings

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
  "**/*.min.css"
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
  "formatdir.language": "auto"
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

## License

MIT License - Copyright (c) 2026 SteerDock Contributors
