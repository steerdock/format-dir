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
    },
    'de': {
        'formatDirectory.default': 'Verzeichnis formatieren (Standardeinstellungen): {0}',
        'formatDirectory.reconfigure': 'Einstellungen öffnen: {0}',
        'formatDirectory.noFiles': 'Keine zu formatierenden Dateien gefunden',
        'formatDirectory.failed': 'Fehler beim Formatieren des Verzeichnisses: {0}',
        'formatDirectory.formatting': 'Dateien werden formatiert',
        'formatDirectory.cancelled': 'Formatierung abgebrochen',
        'formatDirectory.complete': 'Formatierung abgeschlossen: {0} Dateien erfolgreich',
        'formatDirectory.completeFailed': 'Formatierung abgeschlossen: {0} Dateien erfolgreich, {1} Dateien fehlgeschlagen',
        'formatDirectory.failedCount': '{0} Dateien konnten nicht formatiert werden',
        'formatDirectory.viewDetails': 'Details anzeigen',
        'formatDirectory.failedFiles': 'Fehlgeschlagene Dateien:',
        'formatDirectory.inputExtensions': 'Geben Sie die zu formatierenden Dateierweiterungen ein (durch Kommas getrennt)',
        'formatDirectory.extensionsPlaceholder': 'z.B.: .js, .ts, .json',
        'formatDirectory.recursive': 'Unterverzeichnisse rekursiv formatieren?',
        'formatDirectory.yes': 'Ja',
        'formatDirectory.no': 'Nein',
        'formatDirectory.customizeExclude': 'Ausschlussmuster anpassen?',
        'formatDirectory.inputExcludePatterns': 'Geben Sie Ausschlussmuster ein (durch Kommas getrennt)',
        'formatDirectory.excludePlaceholder': 'z.B.: **/node_modules/**, **/dist/**'
    },
    'es': {
        'formatDirectory.default': 'Formatear directorio (Configuración predeterminada): {0}',
        'formatDirectory.reconfigure': 'Abrir configuración: {0}',
        'formatDirectory.noFiles': 'No se encontraron archivos para formatear',
        'formatDirectory.failed': 'Error al formatear el directorio: {0}',
        'formatDirectory.formatting': 'Formateando archivos',
        'formatDirectory.cancelled': 'Formateo cancelado',
        'formatDirectory.complete': 'Formateo completado: {0} archivos exitosos',
        'formatDirectory.completeFailed': 'Formateo completado: {0} archivos exitosos, {1} archivos fallidos',
        'formatDirectory.failedCount': '{0} archivos no se pudieron formatear',
        'formatDirectory.viewDetails': 'Ver detalles',
        'formatDirectory.failedFiles': 'Archivos fallidos:',
        'formatDirectory.inputExtensions': 'Ingrese las extensiones de archivo a formatear (separadas por comas)',
        'formatDirectory.extensionsPlaceholder': 'ej: .js, .ts, .json',
        'formatDirectory.recursive': '¿Formatear subdirectorios recursivamente?',
        'formatDirectory.yes': 'Sí',
        'formatDirectory.no': 'No',
        'formatDirectory.customizeExclude': '¿Personalizar patrones de exclusión?',
        'formatDirectory.inputExcludePatterns': 'Ingrese patrones de exclusión (separados por comas)',
        'formatDirectory.excludePlaceholder': 'ej: **/node_modules/**, **/dist/**'
    },
    'it': {
        'formatDirectory.default': 'Formatta Directory (Impostazioni predefinite): {0}',
        'formatDirectory.reconfigure': 'Apri Impostazioni: {0}',
        'formatDirectory.noFiles': 'Nessun file trovato da formattare',
        'formatDirectory.failed': 'Impossibile formattare la directory: {0}',
        'formatDirectory.formatting': 'Formattazione file in corso',
        'formatDirectory.cancelled': 'Formattazione annullata',
        'formatDirectory.complete': 'Formattazione completata: {0} file riusciti',
        'formatDirectory.completeFailed': 'Formattazione completata: {0} file riusciti, {1} file falliti',
        'formatDirectory.failedCount': '{0} file non riusciti a formattare',
        'formatDirectory.viewDetails': 'Visualizza dettagli',
        'formatDirectory.failedFiles': 'File falliti:',
        'formatDirectory.inputExtensions': 'Inserisci estensioni file da formattare (separate da virgola)',
        'formatDirectory.extensionsPlaceholder': 'es. .js, .ts, .json',
        'formatDirectory.recursive': 'Formattare sottodirectory ricorsivamente?',
        'formatDirectory.yes': 'Sì',
        'formatDirectory.no': 'No',
        'formatDirectory.customizeExclude': 'Personalizzare i pattern di esclusione?',
        'formatDirectory.inputExcludePatterns': 'Inserisci pattern di esclusione (separati da virgola)',
        'formatDirectory.excludePlaceholder': 'es. **/node_modules/**, **/dist/**'
    },
    'ru': {
        'formatDirectory.default': 'Форматировать каталог (Настройки по умолчанию): {0}',
        'formatDirectory.reconfigure': 'Открыть настройки: {0}',
        'formatDirectory.noFiles': 'Файлы для форматирования не найдены',
        'formatDirectory.failed': 'Не удалось отформатировать каталог: {0}',
        'formatDirectory.formatting': 'Форматирование файлов',
        'formatDirectory.cancelled': 'Форматирование отменено',
        'formatDirectory.complete': 'Форматирование завершено: успешно {0} файлов',
        'formatDirectory.completeFailed': 'Форматирование завершено: успешно {0} файлов, ошибка {1} файлов',
        'formatDirectory.failedCount': 'Не удалось отформатировать {0} файлов',
        'formatDirectory.viewDetails': 'Подробнее',
        'formatDirectory.failedFiles': 'Ошибки в файлах:',
        'formatDirectory.inputExtensions': 'Введите расширения файлов (через запятую)',
        'formatDirectory.extensionsPlaceholder': 'напр. .js, .ts, .json',
        'formatDirectory.recursive': 'Форматировать подкаталоги рекурсивно?',
        'formatDirectory.yes': 'Да',
        'formatDirectory.no': 'Нет',
        'formatDirectory.customizeExclude': 'Настроить исключения?',
        'formatDirectory.inputExcludePatterns': 'Введите шаблоны исключений (через запятую)',
        'formatDirectory.excludePlaceholder': 'напр. **/node_modules/**, **/dist/**'
    }
};

let currentLocale: string = 'en';

export function initializeLocale() {
    const config = vscode.workspace.getConfiguration('formatdir');
    const configuredLanguage = config.get<string>('language', 'auto');

    if (configuredLanguage !== 'auto' && messages[configuredLanguage]) {
        currentLocale = configuredLanguage;
    } else {
        const vsCodeLocale = vscode.env.language;
        currentLocale = vsCodeLocale.toLowerCase();
    }

    // Fallback to English if exact locale not found
    if (!messages[currentLocale]) {
        // Try to match language code only (e.g. "en-US" -> "en")
        const langCode = currentLocale.split('-')[0];
        if (messages[langCode]) {
            currentLocale = langCode;
        } else {
            currentLocale = 'en';
        }
    }
}

export function t(key: string, ...args: any[]): string {
    let message = messages[currentLocale]?.[key] || messages['en']?.[key] || key;

    args.forEach((arg, index) => {
        message = message.replace(`{${index}}`, String(arg));
    });

    return message;
}
