# Contributing to Format Directory

Thank you for your interest in contributing to Format Directory! We welcome contributions of all kinds, including bug fixes, new features, and improvements to documentation or translations.

## How to Contribute

### Reporting Bugs

If you find a bug, please [open an issue](https://github.com/steerdock/format-dir/issues) on GitHub. Include as much detail as possible, such as:
- Your VS Code version
- Extension version
- Steps to reproduce the bug
- Expected vs. actual behavior
- Any relevant logs from the "Format Directory" output channel

### Suggesting Features

We love hearing your ideas! Feel free to open an issue to suggest a new feature or improvement.

### Local Development

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/steerdock/format-dir.git
    cd format-dir
    ```
2.  **Install dependencies**:
    ```bash
    npm install
    ```
3.  **Run in Debug mode**:
    - Open the project in VS Code.
    - Press `F5` to start a new VS Code window with the extension running.
4.  **Run tests**:
    ```bash
    npm test
    ```

### Adding New Languages

If you'd like to help translate the extension into your language:
1.  Check `src/i18n.ts` and add your language to the `messages` object.
2.  Create a `package.nls.<lang-code>.json` file in the root directory.
3.  Update the `formatdir.language` configuration in `package.json`.

## Pull Request Process

1.  Fork the repository and create your branch from `main`.
2.  Ensure your code follows the existing style and passes the linter (`npm run lint`).
3.  Verify that `npm run compile` completes without errors.
4.  Submit a Pull Request with a clear description of the changes.

## Code of Conduct

Please be respectful and helpful in all interactions within this project.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
