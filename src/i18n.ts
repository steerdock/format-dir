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
        'formatDirectory.excludePlaceholder': 'e.g., **/node_modules/**, **/dist/**',
        'formatDirectory.previewTitle': 'Format Directory Preview',
        'formatDirectory.confirmFormat': 'Confirm Format',
        'formatDirectory.cancelFormat': 'Cancel',
        'formatDirectory.previewDescription': 'Review the changes below before applying them.',
        'formatDirectory.applyChanges': 'Apply Changes',
        'formatDirectory.noChanges': 'No changes to apply.',
        'formatDirectory.undoTitle': 'Undo Format Directory',
        'formatDirectory.undoComplete': 'Undo complete. Reverted changes for {0} files.',
        'formatDirectory.undoFailed': 'Undo failed: {0}',
        'formatDirectory.noHistory': 'No formatting history found to undo.',
        'formatDirectory.formatterPriority': 'Formatter Priority Settings',
        'formatDirectory.configurePriority': 'Configure Formatter Priority'
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
        'formatDirectory.excludePlaceholder': '例如: **/node_modules/**, **/dist/**',
        'formatDirectory.previewTitle': '格式化目录预览',
        'formatDirectory.confirmFormat': '确认格式化',
        'formatDirectory.cancelFormat': '取消',
        'formatDirectory.previewDescription': '在应用更改之前，请检查以下内容。',
        'formatDirectory.applyChanges': '应用更改',
        'formatDirectory.noChanges': '没有可应用的更改。',
        'formatDirectory.undoTitle': '撤销格式化目录',
        'formatDirectory.undoComplete': '撤销完成。已还原 {0} 个文件的更改。',
        'formatDirectory.undoFailed': '撤销失败: {0}',
        'formatDirectory.noHistory': '未找到可撤销的历史记录。',
        'formatDirectory.formatterPriority': '格式化器优先级设置',
        'formatDirectory.configurePriority': '配置格式化器优先级'
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
    },
    'pt-br': {
        'formatDirectory.default': 'Formatar Diretório (Configurações Padrão): {0}',
        'formatDirectory.reconfigure': 'Abrir Configurações: {0}',
        'formatDirectory.noFiles': 'Nenhum arquivo encontrado para formatar',
        'formatDirectory.failed': 'Falha ao formatar diretório: {0}',
        'formatDirectory.formatting': 'Formatando arquivos',
        'formatDirectory.cancelled': 'Formatação cancelada',
        'formatDirectory.complete': 'Formatação concluída: {0} arquivos com sucesso',
        'formatDirectory.completeFailed': 'Formatação concluída: {0} arquivos com sucesso, {1} arquivos falharam',
        'formatDirectory.failedCount': '{0} arquivos falharam ao formatar',
        'formatDirectory.viewDetails': 'Ver Detalhes',
        'formatDirectory.failedFiles': 'Arquivos com falha:',
        'formatDirectory.inputExtensions': 'Digite as extensões de arquivo para formatar (separadas por vírgula)',
        'formatDirectory.extensionsPlaceholder': 'ex: .js, .ts, .json',
        'formatDirectory.recursive': 'Formatar subdiretórios recursivamente?',
        'formatDirectory.yes': 'Sim',
        'formatDirectory.no': 'Não',
        'formatDirectory.customizeExclude': 'Personalizar padrões de exclusão?',
        'formatDirectory.inputExcludePatterns': 'Digite padrões de exclusão (separados por vírgula)',
        'formatDirectory.excludePlaceholder': 'ex: **/node_modules/**, **/dist/**',
        'formatDirectory.previewTitle': 'Pré-visualização da Formatação',
        'formatDirectory.confirmFormat': 'Confirmar Formatação',
        'formatDirectory.cancelFormat': 'Cancelar',
        'formatDirectory.previewDescription': 'Revise as alterações abaixo antes de aplicá-las.',
        'formatDirectory.applyChanges': 'Aplicar Alterações',
        'formatDirectory.noChanges': 'Nenhuma alteração para aplicar.',
        'formatDirectory.undoTitle': 'Desfazer Formatação',
        'formatDirectory.undoComplete': 'Desfazer concluído. Alterações revertidas para {0} arquivos.',
        'formatDirectory.undoFailed': 'Falha ao desfazer: {0}',
        'formatDirectory.noHistory': 'Nenhum histórico de formatação encontrado para desfazer.',
        'formatDirectory.formatterPriority': 'Prioridade do Formatador',
        'formatDirectory.configurePriority': 'Configurar Prioridade do Formatador'
    },
    'ko': {
        'formatDirectory.default': '디렉토리 포맷 (기본 설정): {0}',
        'formatDirectory.reconfigure': '설정 열기: {0}',
        'formatDirectory.noFiles': '포맷할 파일을 찾을 수 없습니다',
        'formatDirectory.failed': '디렉토리 포맷 실패: {0}',
        'formatDirectory.formatting': '파일 포맷 중',
        'formatDirectory.cancelled': '포맷 취소됨',
        'formatDirectory.complete': '포맷 완료: {0}개 파일 성공',
        'formatDirectory.completeFailed': '포맷 완료: {0}개 파일 성공, {1}개 파일 실패',
        'formatDirectory.failedCount': '{0}개 파일 포맷 실패',
        'formatDirectory.viewDetails': '상세 보기',
        'formatDirectory.failedFiles': '실패한 파일:',
        'formatDirectory.inputExtensions': '포맷할 파일 확장자 입력 (콤마로 구분)',
        'formatDirectory.extensionsPlaceholder': '예: .js, .ts, .json',
        'formatDirectory.recursive': '하위 디렉토리도 재귀적으로 포맷하시겠습니까?',
        'formatDirectory.yes': '예',
        'formatDirectory.no': '아니요',
        'formatDirectory.customizeExclude': '제외 패턴을 사용자 정의하시겠습니까?',
        'formatDirectory.inputExcludePatterns': '제외 패턴 입력 (콤마로 구분)',
        'formatDirectory.excludePlaceholder': '예: **/node_modules/**, **/dist/**',
        'formatDirectory.previewTitle': '디렉토리 포맷 미리보기',
        'formatDirectory.confirmFormat': '포맷 확인',
        'formatDirectory.cancelFormat': '취소',
        'formatDirectory.previewDescription': '적용하기 전에 아래 변경 사항을 검토하십시오.',
        'formatDirectory.applyChanges': '변경 사항 적용',
        'formatDirectory.noChanges': '적용할 변경 사항이 없습니다.',
        'formatDirectory.undoTitle': '디렉토리 포맷 실행 취소',
        'formatDirectory.undoComplete': '실행 취소 완료. {0}개 파일의 변경 사항이 복구되었습니다.',
        'formatDirectory.undoFailed': '실행 취소 실패: {0}',
        'formatDirectory.noHistory': '실행 취소할 포맷 기록이 없습니다.',
        'formatDirectory.formatterPriority': '포맷터 우선순위 설정',
        'formatDirectory.configurePriority': '포맷터 우선순위 구성'
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
