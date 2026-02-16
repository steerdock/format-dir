# Changelog

All notable changes to the "Format Directory" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.7] - 2026-02-08

### Added
- **Language Selection**: Added setting to override extension language
- **Status Bar Integration**: Added progress tracking and status in the status bar
- **Single File Formatting**: Added context menu for formatting single files
- **Keyboard Shortcuts**: Added `Ctrl+Alt+L` (Cmd+Alt+L on Mac) to format current file
- **Enhanced Logging**: Added configurable log levels and output panel options
- **New language support**: Added Italian (Italiano) and Russian (Русский) translations

### Changed
- **Menu Refinement**: Simplified context menus (removed "Default Settings" and "Reconfigure" suffix)
- **Publisher Update**: Changed publisher to `steerdock`

### Added
- Configurable concurrency limit for parallel file formatting (1-50 files, default: 10)
- Maximum file size configuration to skip large files (default: 1MB, 0 = no limit)
- German (Deutsch) language support
- Spanish (Español) language support

### Changed
- Improved performance with configurable concurrent file processing
- Enhanced file filtering to skip files exceeding size limit

### Internationalization
- Now supports 6 languages: English, Chinese (Simplified), Japanese, French, German, Spanish
