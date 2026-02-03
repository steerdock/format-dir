# Changelog

All notable changes to the "Format Directory" extension will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.6] - 2026-02-03

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

## [1.0.5] - 2026-01-XX

### Added
- Japanese (日本語) language support
- French (Français) language support

### Changed
- Enhanced internationalization system
- Now supports 4 languages: English, Chinese, Japanese, French

## [1.0.4] - 2026-01-XX

### Added
- Concurrent file formatting (up to 10 files at once) for faster processing
- Enhanced reconfigure mode with exclude patterns customization

### Changed
- Upgraded TypeScript to 5.7.2
- Upgraded ESLint to 9.17.0
- Updated other dependencies

### Fixed
- Synchronized default file extensions configuration (now includes .sql)

## [1.0.3] - 2025-XX-XX

### Added
- Initial release with basic directory formatting functionality
- Support for multiple file types
- Recursive directory formatting
- Exclude patterns support
- Progress tracking with cancellation
- English and Chinese (Simplified) language support

[1.0.6]: https://github.com/steerdock/format-dir/compare/v1.0.5...v1.0.6
[1.0.5]: https://github.com/steerdock/format-dir/compare/v1.0.4...v1.0.5
[1.0.4]: https://github.com/steerdock/format-dir/compare/v1.0.3...v1.0.4
[1.0.3]: https://github.com/steerdock/format-dir/releases/tag/v1.0.3
