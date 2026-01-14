import * as vscode from 'vscode';

interface Messages {
    [key: string]: string;
}

const messages: { [locale: string]: Messages } = {
    'en': {
        'formatDirectory.default': 'Format Directory (Default Settings): {0}',
        'formatDirectory.reconfigure': 'Open Settings: {0}',
        'formatDirectory.noFiles': 'No files found to format',
        'formatDirectory.failed': 'Failed to format directory: {0}',
        'formatDirectory.formatting': 'Formatting files',
        'formatDirectory.cancelled': 'Formatting cancelled',
        'formatDirectory.complete': 'Formatting complete: {0} files succeeded',
        'formatDirectory.completeFailed': 'Formatting complete: {0} files succeeded, {1} files failed',
        'formatDirectory.failedCount': '{0} files failed to format',
        'formatDirectory.viewDetails': 'View Details',
        'formatDirectory.failedFiles': 'Failed files:',
        'formatDirectory.inputExtensions': 'Enter file extensions to format (comma-separated)',
        'formatDirectory.extensionsPlaceholder': 'e.g., .js, .ts, .json',
        'formatDirectory.recursive': 'Recursively format subdirectories?',
        'formatDirectory.yes': 'Yes',
        'formatDirectory.no': 'No'
    },
    'zh-cn': {
        'formatDirectory.default': '格式化目录 (默认配置): {0}',
        'formatDirectory.reconfigure': '打开配置: {0}',
        'formatDirectory.noFiles': '未找到需要格式化的文件',
        'formatDirectory.failed': '格式化目录失败: {0}',
        'formatDirectory.formatting': '正在格式化文件',
        'formatDirectory.cancelled': '格式化已取消',
        'formatDirectory.complete': '格式化完成: {0} 个文件成功',
        'formatDirectory.completeFailed': '格式化完成: {0} 个文件成功, {1} 个文件失败',
        'formatDirectory.failedCount': '有 {0} 个文件格式化失败',
        'formatDirectory.viewDetails': '查看详情',
        'formatDirectory.failedFiles': '格式化失败的文件:',
        'formatDirectory.inputExtensions': '输入要格式化的文件扩展名（用逗号分隔）',
        'formatDirectory.extensionsPlaceholder': '例如: .js, .ts, .json',
        'formatDirectory.recursive': '是否递归格式化子目录？',
        'formatDirectory.yes': '是',
        'formatDirectory.no': '否'
    }
};

let currentLocale: string = 'en';

export function initializeLocale() {
    const vsCodeLocale = vscode.env.language;
    currentLocale = vsCodeLocale.toLowerCase();

    if (!messages[currentLocale]) {
        currentLocale = 'en';
    }
}

export function t(key: string, ...args: any[]): string {
    let message = messages[currentLocale]?.[key] || messages['en']?.[key] || key;

    args.forEach((arg, index) => {
        message = message.replace(`{${index}}`, String(arg));
    });

    return message;
}
