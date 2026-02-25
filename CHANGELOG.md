# Changelog

All notable changes to the "Format Directory" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
