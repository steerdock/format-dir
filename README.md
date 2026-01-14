# Format Directory - VS Code Extension

A VS Code extension that allows you to format entire directories with a right-click context menu option.

## Features

- **Right-click directory formatting**: Format all files in a directory directly from the Explorer
- **Recursive formatting**: Optionally format files in subdirectories
- **Customizable file types**: Configure which file extensions to format
- **Exclude patterns**: Skip specific directories or files (e.g., node_modules, dist)
- **Progress tracking**: Visual progress notification with cancellation support
- **Error handling**: Detailed error reporting for failed files
- **Internationalization (i18n)**: Supports English and Chinese, automatically switches based on VS Code language settings
- **Respects user settings**: Uses your configured formatters and editor settings from `settings.json`
- **Two formatting modes**:
  - **Default**: Use saved configuration settings
  - **Reconfigure**: Customize settings on-the-fly before formatting

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
  ".c", ".cpp", ".h", ".cs", ".go", ".rs", ".php", ".rb"
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
  "formatdir.showProgress": true
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
