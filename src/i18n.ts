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
        'formatDirectory.no': 'No',
        'formatDirectory.customizeExclude': 'Customize exclude patterns?',
        'formatDirectory.inputExcludePatterns': 'Enter exclude patterns (comma-separated)',
        'formatDirectory.excludePlaceholder': 'e.g., **/node_modules/**, **/dist/**'
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
        'formatDirectory.no': '否',
        'formatDirectory.customizeExclude': '是否自定义排除模式？',
        'formatDirectory.inputExcludePatterns': '输入排除模式（用逗号分隔）',
        'formatDirectory.excludePlaceholder': '例如: **/node_modules/**, **/dist/**'
    },
    'ja': {
        'formatDirectory.default': 'ディレクトリをフォーマット (デフォルト設定): {0}',
        'formatDirectory.reconfigure': '設定を開く: {0}',
        'formatDirectory.noFiles': 'フォーマットするファイルが見つかりません',
        'formatDirectory.failed': 'ディレクトリのフォーマットに失敗しました: {0}',
        'formatDirectory.formatting': 'ファイルをフォーマット中',
        'formatDirectory.cancelled': 'フォーマットがキャンセルされました',
        'formatDirectory.complete': 'フォーマット完了: {0} ファイル成功',
        'formatDirectory.completeFailed': 'フォーマット完了: {0} ファイル成功, {1} ファイル失敗',
        'formatDirectory.failedCount': '{0} ファイルのフォーマットに失敗しました',
        'formatDirectory.viewDetails': '詳細を表示',
        'formatDirectory.failedFiles': 'フォーマットに失敗したファイル:',
        'formatDirectory.inputExtensions': 'フォーマットするファイル拡張子を入力 (カンマ区切り)',
        'formatDirectory.extensionsPlaceholder': '例: .js, .ts, .json',
        'formatDirectory.recursive': 'サブディレクトリも再帰的にフォーマットしますか？',
        'formatDirectory.yes': 'はい',
        'formatDirectory.no': 'いいえ',
        'formatDirectory.customizeExclude': '除外パターンをカスタマイズしますか？',
        'formatDirectory.inputExcludePatterns': '除外パターンを入力 (カンマ区切り)',
        'formatDirectory.excludePlaceholder': '例: **/node_modules/**, **/dist/**'
    },
    'fr': {
        'formatDirectory.default': 'Formater le répertoire (Paramètres par défaut): {0}',
        'formatDirectory.reconfigure': 'Ouvrir les paramètres: {0}',
        'formatDirectory.noFiles': 'Aucun fichier à formater trouvé',
        'formatDirectory.failed': 'Échec du formatage du répertoire: {0}',
        'formatDirectory.formatting': 'Formatage des fichiers',
        'formatDirectory.cancelled': 'Formatage annulé',
        'formatDirectory.complete': 'Formatage terminé: {0} fichiers réussis',
        'formatDirectory.completeFailed': 'Formatage terminé: {0} fichiers réussis, {1} fichiers échoués',
        'formatDirectory.failedCount': '{0} fichiers n\'ont pas pu être formatés',
        'formatDirectory.viewDetails': 'Voir les détails',
        'formatDirectory.failedFiles': 'Fichiers échoués:',
        'formatDirectory.inputExtensions': 'Entrez les extensions de fichiers à formater (séparées par des virgules)',
        'formatDirectory.extensionsPlaceholder': 'ex: .js, .ts, .json',
        'formatDirectory.recursive': 'Formater récursivement les sous-répertoires?',
        'formatDirectory.yes': 'Oui',
        'formatDirectory.no': 'Non',
        'formatDirectory.customizeExclude': 'Personnaliser les modèles d\'exclusion?',
        'formatDirectory.inputExcludePatterns': 'Entrez les modèles d\'exclusion (séparés par des virgules)',
        'formatDirectory.excludePlaceholder': 'ex: **/node_modules/**, **/dist/**'
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
