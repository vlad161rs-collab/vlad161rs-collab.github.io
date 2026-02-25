// Состояние приложения
let projects = [];
let currentEditId = null;
let isAuthenticated = false;
// Определяем язык по умолчанию: сначала из localStorage, затем из браузера, затем 'en'
function getDefaultLanguage() {
    const saved = localStorage.getItem('portfolioLanguage');
    if (saved === 'en' || saved === 'ru') {
        return saved;
    }
    // Определяем язык браузера
    const browserLang = (navigator.language || navigator.userLanguage || 'en').toLowerCase();
    if (browserLang.startsWith('ru')) {
        return 'ru';
    }
    // По умолчанию английский
    return 'en';
}

let currentLanguage = getDefaultLanguage(); // 'en' или 'ru'

const PLACEHOLDER_IMAGE = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='800' height='600' viewBox='0 0 800 600'><defs><linearGradient id='g' x1='0' x2='1' y1='0' y2='1'><stop stop-color='%23666eea' offset='0'/><stop stop-color='%23764ba2' offset='1'/></linearGradient></defs><rect width='800' height='600' fill='url(%23g)'/></svg>";
let draftProjectsCache = null;
let draftStoreWriteSucceeded = null;

const PORTFOLIO_DB_NAME = 'portfolio-drafts-db';
const PORTFOLIO_DB_VERSION = 1;
const PORTFOLIO_DB_STORE = 'kv';
const PORTFOLIO_DRAFTS_KEY = 'projects';
let portfolioDbPromise = null;

function cloneProjectsData(value) {
    if (!Array.isArray(value)) return [];
    try {
        return JSON.parse(JSON.stringify(value));
    } catch (error) {
        console.warn('Failed to clone projects data:', error);
        return value.map(item => ({ ...item }));
    }
}

function isIndexedDbSupported() {
    return typeof indexedDB !== 'undefined';
}

function openPortfolioDb() {
    if (!isIndexedDbSupported()) {
        return Promise.reject(new Error('IndexedDB is not supported'));
    }
    if (!portfolioDbPromise) {
        portfolioDbPromise = new Promise((resolve, reject) => {
            const request = indexedDB.open(PORTFOLIO_DB_NAME, PORTFOLIO_DB_VERSION);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(PORTFOLIO_DB_STORE)) {
                    db.createObjectStore(PORTFOLIO_DB_STORE);
                }
            };
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
        });
    }
    return portfolioDbPromise;
}

async function idbGetValue(key) {
    const db = await openPortfolioDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PORTFOLIO_DB_STORE, 'readonly');
        const store = tx.objectStore(PORTFOLIO_DB_STORE);
        const request = store.get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error || new Error('IndexedDB read failed'));
    });
}

async function idbSetValue(key, value) {
    const db = await openPortfolioDb();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(PORTFOLIO_DB_STORE, 'readwrite');
        const store = tx.objectStore(PORTFOLIO_DB_STORE);
        const request = store.put(value, key);
        request.onsuccess = () => resolve(true);
        request.onerror = () => reject(request.error || new Error('IndexedDB write failed'));
        tx.onerror = () => reject(tx.error || new Error('IndexedDB transaction failed'));
    });
}

function getLegacyLocalProjectsSafe() {
    const saved = localStorage.getItem('portfolioProjects');
    if (!saved) return [];
    try {
        const localProjects = JSON.parse(saved);
        return Array.isArray(localProjects) ? localProjects : [];
    } catch (e) {
        console.error('Error parsing localStorage:', e);
        return [];
    }
}

async function getLocalProjectsSafe() {
    if (Array.isArray(draftProjectsCache)) {
        return cloneProjectsData(draftProjectsCache);
    }

    if (isIndexedDbSupported()) {
        try {
            const storedProjects = await idbGetValue(PORTFOLIO_DRAFTS_KEY);
            if (Array.isArray(storedProjects)) {
                draftProjectsCache = cloneProjectsData(storedProjects);
                return cloneProjectsData(draftProjectsCache);
            }
        } catch (error) {
            console.error('Failed to load draft projects from IndexedDB:', error);
        }
    }

    const legacyProjects = getLegacyLocalProjectsSafe();
    draftProjectsCache = cloneProjectsData(legacyProjects);

    if (legacyProjects.length > 0 && isIndexedDbSupported()) {
        try {
            await idbSetValue(PORTFOLIO_DRAFTS_KEY, cloneProjectsData(legacyProjects));
            localStorage.removeItem('portfolioProjects');
            console.log(`Migrated ${legacyProjects.length} project draft(s) from localStorage to IndexedDB`);
        } catch (error) {
            console.error('Failed to migrate legacy localStorage drafts to IndexedDB:', error);
        }
    }

    return cloneProjectsData(draftProjectsCache);
}

function getCachedLocalProjectsSafe() {
    return Array.isArray(draftProjectsCache) ? cloneProjectsData(draftProjectsCache) : [];
}

async function saveDraftProjects(projectList) {
    draftProjectsCache = cloneProjectsData(projectList);
    if (!isIndexedDbSupported()) {
        draftStoreWriteSucceeded = false;
        return false;
    }
    try {
        await idbSetValue(PORTFOLIO_DRAFTS_KEY, draftProjectsCache);
        draftStoreWriteSucceeded = true;
        try {
            localStorage.removeItem('portfolioProjects');
        } catch (error) {
            console.warn('Failed to clear legacy localStorage drafts:', error);
        }
        return true;
    } catch (error) {
        draftStoreWriteSucceeded = false;
        console.error('Failed to save projects draft to IndexedDB:', error);
        return false;
    }
}

function getImageList(project) {
    if (Array.isArray(project?.images) && project.images.length > 0) {
        return project.images.slice();
    }
    if (project?.image) {
        return [project.image];
    }
    return [];
}

function isBase64ImageDataUrl(value) {
    return typeof value === 'string' && /^data:image\/[^;]+;base64,/.test(value);
}

function mimeTypeToExtension(mimeType) {
    const normalized = (mimeType || '').toLowerCase();
    if (normalized.includes('jpeg') || normalized.includes('jpg')) return 'jpg';
    if (normalized.includes('png')) return 'png';
    if (normalized.includes('webp')) return 'webp';
    if (normalized.includes('gif')) return 'gif';
    return 'bin';
}

function extractBase64ImageParts(dataUrl) {
    const match = /^data:(image\/[^;]+);base64,(.+)$/s.exec(dataUrl || '');
    if (!match) return null;
    return {
        mimeType: match[1],
        base64: match[2]
    };
}

function sanitizePathSegment(value) {
    return String(value ?? '')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '') || 'item';
}

function buildProjectImagePath(project, imageIndex, imageDataUrl) {
    const parts = extractBase64ImageParts(imageDataUrl);
    const ext = mimeTypeToExtension(parts?.mimeType);
    const projectId = sanitizePathSegment(project?.id ?? 'project');
    const versionTag = sanitizePathSegment(String(project?.updatedAt || project?.date || new Date().toISOString()).replace(/[:.]/g, '-'));
    return `data/images/${projectId}/${versionTag}-${imageIndex + 1}.${ext}`;
}

// Переводы
const translations = {
    en: {
        // Header
        login: '🔐 Login',
        logout: '🔓 Logout',
        addProject: 'Add Project',
        settings: '⚙️',
        greeting: "Hi, I'm",
        greetingSub: "Nice to meet you!",
        
        // Empty state
        emptyTitle: 'Portfolio is empty',
        emptyText: 'Click "Add Project" button to get started',
        
        // Project modal
        addProjectTitle: 'Add Project',
        editProjectTitle: 'Edit Project',
        imagesLabel: 'Images (multiple selection available)',
        imagesHint: 'Click on an image to set it as main (will be shown on card)',
        selectImages: 'Select Images',
        addMoreImages: '+ Add More Images',
        titleLabel: 'Project Title',
        titlePlaceholder: 'Enter title',
        descriptionLabel: 'Description',
        descriptionPlaceholder: 'Describe your project...',
        linkLabel: 'Link (optional)',
        linkPlaceholder: 'https://example.com',
        cancel: 'Cancel',
        save: 'Save',
        
        // Auth modal
        authTitle: 'Login',
        passwordLabel: 'Admin Password',
        passwordPlaceholder: 'Enter password',
        passwordHint: 'Enter password to access editing',
        enter: 'Login',
        wrongPassword: 'Wrong password. Please try again.',
        
        // Project card
        view: 'View',
        edit: 'Edit',
        delete: 'Delete',
        deleteConfirm: 'Are you sure you want to delete this project?',
        
        // Image modal
        imageOf: 'Image',
        
        // Notifications
        projectSaved: 'Project saved successfully!',
        projectDeleted: 'Project deleted successfully!',
        projectsSaved: 'Projects saved to server!',
        projectsSavedWithCount: 'Projects saved to server! ({count} project(s), {size} MB)',
        projectsVerified: 'Projects saved and verified on server! ({count} project(s), {size} MB)',
        saveMismatch: 'Warning: {saved} of {expected} projects saved on server. Please try saving again.',
        fileTooLarge: 'File too large ({size} MB). GitHub API limits file size. Try reducing the number or size of images.',
        githubTokenRequired: 'GitHub token required to save projects to server.',
        enterToken: 'Enter GitHub Personal Access Token',
        tokenPlaceholder: 'Paste your token here',
        tokenHint: 'Token will be stored locally in your browser',
        tokenSaved: 'Token saved successfully!',
        migrationOffer: 'Found {count} project(s) in local storage. Would you like to migrate them to the server?',
        migrationSuccess: 'Projects migrated to server successfully!',
        migrationError: 'Error migrating projects: {error}',
        
        // Settings
        settingsTitle: 'GitHub Settings',
        tokenLabel: 'GitHub Personal Access Token',
        tokenDescription: 'Required to save projects to server. Create token at: https://github.com/settings/tokens',
        saveToken: 'Save Token',
        removeToken: 'Remove Token',
        tokenRemoved: 'Token removed successfully'
    },
    ru: {
        // Header
        login: '🔐 Войти',
        logout: '🔓 Выйти',
        addProject: 'Добавить проект',
        settings: '⚙️',
        greeting: 'Привет, я',
        greetingSub: 'Рад познакомиться!',
        
        // Empty state
        emptyTitle: 'Портфолио пусто',
        emptyText: 'Нажмите кнопку "Добавить проект", чтобы начать',
        
        // Project modal
        addProjectTitle: 'Добавить проект',
        editProjectTitle: 'Редактировать проект',
        imagesLabel: 'Изображения (можно выбрать несколько)',
        imagesHint: 'Кликните на изображение, чтобы сделать его главным (будет показано на карточке)',
        selectImages: 'Выберите изображения',
        addMoreImages: '+ Добавить еще изображения',
        titleLabel: 'Название проекта',
        titlePlaceholder: 'Введите название',
        descriptionLabel: 'Описание',
        descriptionPlaceholder: 'Опишите ваш проект...',
        linkLabel: 'Ссылка (опционально)',
        linkPlaceholder: 'https://example.com',
        cancel: 'Отмена',
        save: 'Сохранить',
        
        // Auth modal
        authTitle: 'Вход в систему',
        passwordLabel: 'Пароль администратора',
        passwordPlaceholder: 'Введите пароль',
        passwordHint: 'Введите пароль для доступа к редактированию',
        enter: 'Войти',
        wrongPassword: 'Неверный пароль. Попробуйте снова.',
        
        // Project card
        view: 'Просмотр',
        edit: 'Редактировать',
        delete: 'Удалить',
        deleteConfirm: 'Вы уверены, что хотите удалить этот проект?',
        
        // Image modal
        imageOf: 'Изображение',
        
        // Notifications
        projectSaved: 'Проект успешно сохранен!',
        projectDeleted: 'Проект успешно удален!',
        projectsSaved: 'Проекты сохранены на сервере!',
        projectsSavedWithCount: 'Проекты сохранены на сервере! ({count} проект(ов), {size} MB)',
        projectsVerified: 'Проекты успешно сохранены и проверены на сервере! ({count} проект(ов), {size} MB)',
        saveMismatch: 'Внимание: На сервере сохранено {saved} из {expected} проектов. Попробуйте сохранить снова.',
        fileTooLarge: 'Файл слишком большой ({size} MB). GitHub API ограничивает размер файлов. Попробуйте уменьшить количество или размер изображений.',
        githubTokenRequired: 'Требуется GitHub токен для сохранения проектов на сервер.',
        enterToken: 'Введите GitHub Personal Access Token',
        tokenPlaceholder: 'Вставьте ваш токен здесь',
        tokenHint: 'Токен будет сохранен локально в вашем браузере',
        tokenSaved: 'Токен успешно сохранен!',
        migrationOffer: 'Найдено {count} проект(ов) в локальном хранилище. Хотите перенести их на сервер?',
        migrationSuccess: 'Проекты успешно перенесены на сервер!',
        migrationError: 'Ошибка при переносе проектов: {error}',
        
        // Settings
        settingsTitle: 'Настройки GitHub',
        tokenLabel: 'GitHub Personal Access Token',
        tokenDescription: 'Требуется для сохранения проектов на сервер. Создайте токен на: https://github.com/settings/tokens',
        saveToken: 'Сохранить токен',
        removeToken: 'Удалить токен',
        tokenRemoved: 'Токен успешно удален'
    }
};

// Получить перевод
function t(key, params = {}) {
    let text = translations[currentLanguage][key] || translations.en[key] || key;
    // Замена параметров {param}
    Object.keys(params).forEach(param => {
        text = text.replace(`{${param}}`, params[param]);
    });
    return text;
}

// Получить текст проекта на текущем языке
function getProjectText(project, field) {
    // Если проект имеет структуру с переводами
    if (project[field] && typeof project[field] === 'object') {
        // Пробуем получить текст на текущем языке
        if (project[field][currentLanguage]) {
            let text = project[field][currentLanguage];
            // Проверяем, не является ли текст ошибкой API
            if (text && !text.includes('QUERY LENGTH LIMIT') && !text.includes('MAX ALLOWED QUERY')) {
                return text;
            }
        }
        
        // Если перевода на текущий язык нет или он содержит ошибку, пробуем другой язык как fallback
        const otherLang = currentLanguage === 'ru' ? 'en' : 'ru';
        if (project[field][otherLang]) {
            const text = project[field][otherLang];
            if (text && !text.includes('QUERY LENGTH LIMIT') && !text.includes('MAX ALLOWED QUERY')) {
                // Если перевода на текущий язык нет, запускаем миграцию в фоне
                if (!project[field][currentLanguage] && !project._migrationQueued) {
                    project._migrationQueued = true;
                    console.log(`Missing translation for ${field} in ${currentLanguage}, starting migration for project...`);
                    migrateProjectAsync(project).then(() => {
                        // После перевода обновляем карточки
                        renderProjects();
                    });
                }
                // Временно возвращаем текст на другом языке, но это не идеально
                // Лучше показать индикатор загрузки или пустую строку
                return text; // Возвращаем текст на другом языке как временный fallback
            }
        }
        
        // Если оба языка содержат ошибку или пусты, возвращаем пустую строку
        return '';
    }
    
    // Если есть переводы в старом формате (title_en, title_ru)
    if (project[`${field}_${currentLanguage}`]) {
        const text = project[`${field}_${currentLanguage}`];
        if (text && !text.includes('QUERY LENGTH LIMIT') && !text.includes('MAX ALLOWED QUERY')) {
            return text;
        }
    }
    
    // Пробуем другой язык в старом формате
    const otherLang = currentLanguage === 'ru' ? 'en' : 'ru';
    if (project[`${field}_${otherLang}`]) {
        const text = project[`${field}_${otherLang}`];
        if (text && !text.includes('QUERY LENGTH LIMIT') && !text.includes('MAX ALLOWED QUERY')) {
            return text;
        }
    }
    
    // Если есть переводы в новом формате (translations)
    if (project.translations && project.translations[field]) {
        if (project.translations[field][currentLanguage]) {
            const text = project.translations[field][currentLanguage];
            if (text && !text.includes('QUERY LENGTH LIMIT') && !text.includes('MAX ALLOWED QUERY')) {
                return text;
            }
        }
        // Пробуем другой язык
        if (project.translations[field][otherLang]) {
            const text = project.translations[field][otherLang];
            if (text && !text.includes('QUERY LENGTH LIMIT') && !text.includes('MAX ALLOWED QUERY')) {
                return text;
            }
        }
    }
    
    // Если это старый формат (просто строка), возвращаем исходный текст
    // Но помечаем проект для миграции
    if (project[field] && typeof project[field] === 'string') {
        const text = project[field];
        // Проверяем, не является ли текст ошибкой API
        if (text && (text.includes('QUERY LENGTH LIMIT') || text.includes('MAX ALLOWED QUERY'))) {
            return ''; // Возвращаем пустую строку вместо ошибки
        }
        // Помечаем проект для миграции (асинхронно)
        if (!project._migrationQueued) {
            project._migrationQueued = true;
            migrateProjectAsync(project);
        }
        return text;
    }
    
    return '';
}

function getProjectTimestamp(project) {
    if (!project) return 0;
    const value = project.updatedAt || project.date || 0;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
}

function getProjectsSignature(projectList) {
    if (!Array.isArray(projectList) || projectList.length === 0) return '';
    const normalized = projectList
        .filter(project => project && project.id !== undefined && project.id !== null)
        .map(project => {
            const title = project.title || '';
            const description = project.description || '';
            const titleEn = typeof title === 'object' ? (title.en || '').length : 0;
            const titleRu = typeof title === 'object' ? (title.ru || '').length : 0;
            const titleText = typeof title === 'string' ? title.length : 0;
            const descEn = typeof description === 'object' ? (description.en || '').length : 0;
            const descRu = typeof description === 'object' ? (description.ru || '').length : 0;
            const descText = typeof description === 'string' ? description.length : 0;
            const imageLengths = Array.isArray(project.images)
                ? project.images.map(img => (img ? img.length : 0)).join(',')
                : (project.image ? project.image.length : 0);

            return {
                id: project.id,
                updatedAt: project.updatedAt || project.date || '',
                titleEn,
                titleRu,
                titleText,
                descEn,
                descRu,
                descText,
                imageLengths,
                mainImageIndex: project.mainImageIndex ?? 0,
                link: project.link || ''
            };
        })
        .sort((a, b) => (a.id > b.id ? 1 : a.id < b.id ? -1 : 0));

    return JSON.stringify(normalized);
}

// Асинхронная миграция проекта (перевод старых проектов)
async function migrateProjectAsync(project) {
    // Проверяем, нужна ли миграция
    if (!project.title || typeof project.title !== 'string') return;
    if (project.title && typeof project.title === 'object') return; // Уже мигрирован
    
    const originalTitle = project.title;
    const originalDescription = project.description || '';
    
    // Определяем язык исходного текста
    const sourceLang = detectLanguage(originalTitle + ' ' + originalDescription);
    const targetLang = sourceLang === 'ru' ? 'en' : 'ru';
    
    console.log(`Migrating project "${originalTitle}" from ${sourceLang} to ${targetLang}`);
    
    try {
        // Переводим на другой язык
        const [translatedTitle, translatedDescription] = await Promise.all([
            translateText(originalTitle, targetLang),
            originalDescription ? translateText(originalDescription, targetLang) : Promise.resolve('')
        ]);
        
        // Обновляем структуру проекта
        project.title = {
            [sourceLang]: originalTitle,
            [targetLang]: translatedTitle
        };
        project.description = {
            [sourceLang]: originalDescription,
            [targetLang]: translatedDescription
        };
        
        // Сохраняем обновленные проекты
        await saveProjects();
        console.log(`Project "${originalTitle}" migrated successfully`);
        
        // Перерисовываем проекты
        renderProjects();
    } catch (error) {
        console.error('Error migrating project:', error);
        project._migrationQueued = false; // Разрешаем повторную попытку
    }
}

// Миграция всех старых проектов при загрузке
async function migrateOldProjects() {
    let needsMigration = false;
    
    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        
        // Проверяем, нужна ли миграция
        if (project.title && typeof project.title === 'string') {
            needsMigration = true;
            project._migrationQueued = true;
            await migrateProjectAsync(project);
        }
    }
    
    if (needsMigration) {
        console.log('Old projects migration completed');
        showNotification(currentLanguage === 'ru' ? 'Старые проекты переведены!' : 'Old projects translated!', 'success');
    }
}

// Автоматический перевод текста через API с несколькими fallback методами
// Глобальная переменная для отслеживания доступности API
let myMemoryAvailable = true;
let lastMyMemoryError = null;

async function translateText(text, targetLang) {
    if (!text || text.trim() === '') return '';
    
    // Определяем исходный язык
    const sourceLang = targetLang === 'ru' ? 'en' : 'ru';
    
    // Пробуем несколько методов перевода с fallback
    let result = null;
    
    // Метод 1: LibreTranslate API (приоритет - бесплатный, без лимитов)
    try {
        result = await translateWithLibreTranslate(text, sourceLang, targetLang);
        if (result && result !== text && result.trim() !== '') {
            console.log('✓ Translation via LibreTranslate');
            return result;
        }
    } catch (error) {
        console.warn('LibreTranslate translation failed, trying alternative...', error);
    }
    
    // Метод 2: MyMemory API (если ранее не было ошибки 429)
    if (myMemoryAvailable) {
        try {
            result = await translateWithMyMemory(text, sourceLang, targetLang);
            if (result && result !== text && !result.includes('QUERY LENGTH LIMIT') && !result.includes('MAX ALLOWED QUERY') && !result.includes('MYMEMORY WARNING')) {
                console.log('✓ Translation via MyMemory');
                lastMyMemoryError = null;
                return result;
            }
            // Если получили ошибку, помечаем как недоступный
            if (result && (result.includes('QUERY LENGTH LIMIT') || result.includes('MYMEMORY WARNING'))) {
                myMemoryAvailable = false;
                lastMyMemoryError = Date.now();
                console.warn('MyMemory API unavailable, will skip for 1 hour');
            }
        } catch (error) {
            console.warn('MyMemory translation failed, trying alternative...', error);
            // Если ошибка 429, помечаем как недоступный на час
            if (error.message && error.message.includes('429')) {
                myMemoryAvailable = false;
                lastMyMemoryError = Date.now();
            }
        }
    } else {
        // Проверяем, прошёл ли час с последней ошибки
        if (lastMyMemoryError && Date.now() - lastMyMemoryError > 3600000) {
            myMemoryAvailable = true;
            lastMyMemoryError = null;
            console.log('Retrying MyMemory API after cooldown...');
        }
    }
    
    // Метод 3: Альтернативный LibreTranslate endpoint
    try {
        result = await translateWithLibreTranslateAlt(text, sourceLang, targetLang);
        if (result && result !== text && result.trim() !== '') {
            console.log('✓ Translation via LibreTranslate (alternative)');
            return result;
        }
    } catch (error) {
        console.warn('LibreTranslate alternative failed...', error);
    }
    
    // Метод 4: Google Translate через прокси (если доступен)
    try {
        result = await translateWithGoogleProxy(text, sourceLang, targetLang);
        if (result && result !== text && result.trim() !== '') {
            console.log('✓ Translation via Google Translate');
            return result;
        }
    } catch (error) {
        console.warn('Google Translate proxy failed...', error);
    }
    
    // Если все методы не сработали, возвращаем исходный текст
    console.warn('All translation methods failed, using original text');
    return text;
}

const TRANSLATION_ERROR_SNIPPETS = [
    'QUERY LENGTH LIMIT',
    'MAX ALLOWED QUERY',
    'MYMEMORY WARNING',
    'YOU USED ALL AVAILABLE FREE TRANSLATIONS'
];

function isTranslationUsable(sourceText, translatedText, targetLang) {
    if (!translatedText || !translatedText.trim()) return false;
    const trimmed = translatedText.trim();
    if (TRANSLATION_ERROR_SNIPPETS.some(snippet => trimmed.includes(snippet))) return false;
    const sourceTrimmed = (sourceText || '').trim();
    if (sourceTrimmed && trimmed === sourceTrimmed) return false;
    if (/[A-Za-zА-Яа-яЁё]/.test(trimmed)) {
        const detected = detectLanguage(trimmed);
        if (detected !== targetLang) return false;
    }
    return true;
}

// Перевод через MyMemory API с правильным разбиением
async function translateWithMyMemory(text, sourceLang, targetLang) {
    const BASE_URL_LENGTH = 58;
    const MAX_URL_LENGTH = 500;
    const MAX_ENCODED_TEXT_LENGTH = MAX_URL_LENGTH - BASE_URL_LENGTH; // 442
    const MAX_TEXT_LENGTH = 100; // Консервативный лимит
    
    // Всегда разбиваем текст на части для гарантии
    return await translateLongText(text, sourceLang, targetLang, MAX_TEXT_LENGTH, MAX_ENCODED_TEXT_LENGTH, 'mymemory');
}

// Перевод через LibreTranslate API (более надежный для длинных текстов)
async function translateWithLibreTranslate(text, sourceLang, targetLang) {
    // LibreTranslate имеет более высокие лимиты, но разбиваем для надежности
    const MAX_CHUNK_LENGTH = 2000; // LibreTranslate поддерживает до 5000 символов
    
    if (text.length <= MAX_CHUNK_LENGTH) {
        try {
            const response = await fetch('https://libretranslate.com/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang,
                    target: targetLang,
                    format: 'text'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.translatedText && data.translatedText.trim() !== '') {
                    return data.translatedText;
                }
            } else if (response.status === 429) {
                console.warn('LibreTranslate rate limit, will try alternative...');
                throw new Error('Rate limit');
            }
        } catch (error) {
            if (error.message !== 'Rate limit') {
                console.error('LibreTranslate error:', error);
            }
            throw error;
        }
    }
    
    // Для длинных текстов разбиваем на части
    return await translateLongTextLibre(text, sourceLang, targetLang, MAX_CHUNK_LENGTH);
}

// Альтернативный endpoint для LibreTranslate
async function translateWithLibreTranslateAlt(text, sourceLang, targetLang) {
    const MAX_CHUNK_LENGTH = 2000;
    
    if (text.length <= MAX_CHUNK_LENGTH) {
        try {
            // Пробуем другой публичный endpoint
            const response = await fetch('https://translate.argosopentech.com/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    q: text,
                    source: sourceLang,
                    target: targetLang,
                    format: 'text'
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.translatedText && data.translatedText.trim() !== '') {
                    return data.translatedText;
                }
            }
        } catch (error) {
            console.error('LibreTranslate alternative error:', error);
        }
    }
    
    return null;
}

// Перевод через Google Translate прокси (если доступен)
async function translateWithGoogleProxy(text, sourceLang, targetLang) {
    // Используем публичный прокси для Google Translate
    try {
        const langCode = targetLang === 'ru' ? 'ru' : 'en';
        const sourceCode = sourceLang === 'ru' ? 'ru' : 'en';
        
        // Пробуем через простой прокси (может не работать из-за CORS)
        const response = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=${sourceCode}&tl=${langCode}&dt=t&q=${encodeURIComponent(text)}`);
        
        if (response.ok) {
            const data = await response.json();
            if (data && data[0] && data[0][0] && data[0][0][0]) {
                return data[0].map(item => item[0]).join('');
            }
        }
    } catch (error) {
        // Google Translate может блокировать CORS, это нормально
        console.warn('Google Translate CORS blocked, skipping...');
    }
    
    return null;
}

// Разбиение и перевод длинного текста через LibreTranslate
async function translateLongTextLibre(text, sourceLang, targetLang, maxChunkLength) {
    // Разбиваем на предложения для сохранения контекста
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const translatedParts = [];
    let currentChunk = '';
    
    for (const sentence of sentences) {
        if ((currentChunk + sentence).length <= maxChunkLength) {
            currentChunk += sentence;
        } else {
            if (currentChunk.trim()) {
                const translated = await translateChunkLibre(currentChunk.trim(), sourceLang, targetLang);
                translatedParts.push(translated || currentChunk);
            }
            currentChunk = sentence;
        }
    }
    
    if (currentChunk.trim()) {
        const translated = await translateChunkLibre(currentChunk.trim(), sourceLang, targetLang);
        translatedParts.push(translated || currentChunk);
    }
    
    return translatedParts.join(' ');
}

// Перевод части текста через LibreTranslate
async function translateChunkLibre(chunk, sourceLang, targetLang) {
    try {
        const response = await fetch('https://libretranslate.com/translate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                q: chunk,
                source: sourceLang,
                target: targetLang,
                format: 'text'
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.translatedText) {
                return data.translatedText;
            }
        }
    } catch (error) {
        console.error('LibreTranslate chunk error:', error);
    }
    
    return chunk;
}

// Перевод длинного текста по частям с строгим контролем длины
async function translateLongText(text, sourceLang, targetLang, maxTextLength, maxEncodedLength, apiType = 'mymemory') {
    if (!text || text.trim() === '') return '';
    
    console.log(`Translating text (${text.length} chars) using ${apiType}, splitting into safe chunks...`);
    
    // Улучшенное разбиение: сначала по предложениям (сохраняет контекст), затем по словам
    // Разбиваем на предложения для лучшего контекста
    const sentencePattern = /([^.!?]+[.!?]+|\n+)/g;
    const sentences = text.match(sentencePattern) || [text];
    const translatedParts = [];
    let currentChunk = '';
    
    for (let i = 0; i < sentences.length; i++) {
        const sentence = sentences[i];
        const testChunk = currentChunk ? currentChunk + sentence : sentence;
        
        // Проверяем длину исходного текста
        if (testChunk.length > maxTextLength) {
            // Переводим накопленный chunk
            if (currentChunk.trim()) {
                const translated = await translateTextChunkSafe(currentChunk.trim(), sourceLang, targetLang, maxEncodedLength, apiType);
                if (translated && !translated.includes('QUERY LENGTH LIMIT')) {
                    translatedParts.push(translated);
                } else {
                    translatedParts.push(currentChunk); // Fallback на исходный текст
                }
            }
            
            // Если одно предложение слишком длинное, разбиваем по словам
            if (sentence.length > maxTextLength) {
                const words = sentence.split(/(\s+)/);
                let wordChunk = '';
                
                for (const word of words) {
                    const testWordChunk = wordChunk ? wordChunk + word : word;
                    const encoded = encodeURIComponent(testWordChunk);
                    
                    if (testWordChunk.length > maxTextLength || encoded.length > maxEncodedLength) {
                        if (wordChunk.trim()) {
                            const translated = await translateTextChunkSafe(wordChunk.trim(), sourceLang, targetLang, maxEncodedLength, apiType);
                            if (translated && !translated.includes('QUERY LENGTH LIMIT')) {
                                translatedParts.push(translated);
                            } else {
                                translatedParts.push(wordChunk);
                            }
                        }
                        wordChunk = word;
                    } else {
                        wordChunk = testWordChunk;
                    }
                }
                
                if (wordChunk.trim()) {
                    const translated = await translateTextChunkSafe(wordChunk.trim(), sourceLang, targetLang, maxEncodedLength, apiType);
                    if (translated && !translated.includes('QUERY LENGTH LIMIT')) {
                        translatedParts.push(translated);
                    } else {
                        translatedParts.push(wordChunk);
                    }
                }
                currentChunk = '';
            } else {
                currentChunk = sentence;
            }
        } else {
            // Проверяем длину закодированного текста
            const encoded = encodeURIComponent(testChunk);
            if (encoded.length > maxEncodedLength) {
                // Переводим накопленный chunk
                if (currentChunk.trim()) {
                    const translated = await translateTextChunkSafe(currentChunk.trim(), sourceLang, targetLang, maxEncodedLength, apiType);
                    if (translated && !translated.includes('QUERY LENGTH LIMIT')) {
                        translatedParts.push(translated);
                    } else {
                        translatedParts.push(currentChunk);
                    }
                }
                currentChunk = sentence;
            } else {
                currentChunk = testChunk;
            }
        }
    }
    
    // Переводим последний chunk
    if (currentChunk.trim()) {
        const translated = await translateTextChunkSafe(currentChunk.trim(), sourceLang, targetLang, maxEncodedLength, apiType);
        if (translated && !translated.includes('QUERY LENGTH LIMIT')) {
            translatedParts.push(translated);
        } else {
            translatedParts.push(currentChunk);
        }
    }
    
    return translatedParts.join(' ');
}

// Безопасный перевод части текста с гарантией длины URL < 500
async function translateTextChunkSafe(chunk, sourceLang, targetLang, maxEncodedLength, apiType = 'mymemory') {
    if (!chunk || chunk.trim() === '') return '';
    
    // ВАЖНО: Никогда не переводим сообщения об ошибках
    if (chunk.includes('QUERY LENGTH LIMIT') || chunk.includes('MAX ALLOWED QUERY')) {
        console.error('Chunk contains error message, skipping translation');
        return '';
    }
    
    if (apiType === 'mymemory') {
        // СТРОГАЯ ПРОВЕРКА: проверяем длину URL перед каждым запросом
        const encodedText = encodeURIComponent(chunk);
        const fullUrl = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=${sourceLang}|${targetLang}`;
        
        // Если URL все еще слишком длинный, разбиваем рекурсивно
        if (fullUrl.length > 500 || encodedText.length > maxEncodedLength) {
            console.warn(`URL too long (${fullUrl.length} chars), splitting chunk: "${chunk.substring(0, 30)}..."`);
            
            // Разбиваем пополам
            const midPoint = Math.floor(chunk.length / 2);
            const part1 = chunk.substring(0, midPoint).trim();
            const part2 = chunk.substring(midPoint).trim();
            
            if (part1 && part2) {
                const [translated1, translated2] = await Promise.all([
                    translateTextChunkSafe(part1, sourceLang, targetLang, maxEncodedLength, apiType),
                    translateTextChunkSafe(part2, sourceLang, targetLang, maxEncodedLength, apiType)
                ]);
                const result = (translated1 + ' ' + translated2).trim();
                // Проверяем, что результат не является ошибкой
                if (result && !result.includes('QUERY LENGTH LIMIT') && !result.includes('MAX ALLOWED QUERY')) {
                    return result;
                }
            } else if (part1) {
                return await translateTextChunkSafe(part1, sourceLang, targetLang, maxEncodedLength, apiType);
            } else if (part2) {
                return await translateTextChunkSafe(part2, sourceLang, targetLang, maxEncodedLength, apiType);
            }
            return chunk;
        }
        
        // URL безопасной длины - выполняем запрос
        try {
            const response = await fetch(fullUrl);
            
            if (response.ok) {
                const data = await response.json();
                if (data.responseData && data.responseData.translatedText) {
                    const translated = data.responseData.translatedText;
                    // Проверяем, что результат не является ошибкой
                    if (translated && 
                        !translated.includes('QUERY LENGTH LIMIT') && 
                        !translated.includes('MAX ALLOWED QUERY') &&
                        !translated.includes('MYMEMORY WARNING') &&
                        !translated.includes('YOU USED ALL AVAILABLE FREE TRANSLATIONS')) {
                        return translated;
                    } else {
                        console.warn('Translation API returned error message, using original text');
                        return chunk; // Возвращаем исходный текст вместо ошибки
                    }
                }
            } else {
                const errorText = await response.text();
                
                // Обработка ошибки 429 (Too Many Requests)
                if (response.status === 429) {
                    console.warn('Translation API rate limit exceeded (429). Using original text. Please try again later.');
                    return chunk; // Возвращаем исходный текст
                }
                
                if (errorText.includes('QUERY LENGTH LIMIT') || errorText.includes('MAX ALLOWED QUERY')) {
                    console.error('API reports length limit, splitting further...');
                    // Еще больше разбиваем
                    const midPoint = Math.floor(chunk.length / 2);
                    const part1 = chunk.substring(0, midPoint).trim();
                    const part2 = chunk.substring(midPoint).trim();
                    if (part1 && part2) {
                        const [translated1, translated2] = await Promise.all([
                            translateTextChunkSafe(part1, sourceLang, targetLang, maxEncodedLength, apiType),
                            translateTextChunkSafe(part2, sourceLang, targetLang, maxEncodedLength, apiType)
                        ]);
                        const result = (translated1 + ' ' + translated2).trim();
                        if (result && !result.includes('QUERY LENGTH LIMIT') && !result.includes('MAX ALLOWED QUERY')) {
                            return result;
                        }
                    }
                    // Если даже после разбиения получили ошибку, возвращаем исходный текст
                    console.warn('Translation failed after splitting, returning original text');
                    return chunk;
                } else {
                    console.error('Translation API error:', response.status, errorText.substring(0, 100));
                    return chunk; // Возвращаем исходный текст при любой ошибке
                }
            }
        } catch (error) {
            console.error('Translation chunk error:', error);
        }
    }
    
    // Если перевод не удался, возвращаем исходный chunk
    return chunk;
}

// Определить язык текста (простая эвристика)
function detectLanguage(text) {
    if (!text) return 'en';
    
    // Простая проверка на кириллицу
    const cyrillicPattern = /[А-Яа-яЁё]/;
    return cyrillicPattern.test(text) ? 'ru' : 'en';
}

// Переключение языка
async function setLanguage(lang) {
    if (translations[lang]) {
        currentLanguage = lang;
        localStorage.setItem('portfolioLanguage', lang);
        updateLanguageUI();
        
        // Мигрируем все проекты без переводов
        await migrateAllProjects();
        
        // On language switch we must refresh project cards too; skipping cards
        // here leaves them in the previous language when no migration/save runs.
        updateAllTexts();
    }
}

// Миграция всех проектов без переводов
async function migrateAllProjects() {
    console.log('Checking projects for translation migration...');
    let needsSave = false;
    let translatedCount = 0;
    
    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        let projectNeedsUpdate = false;
        console.log(`\n=== Project ${i}: ${project.title?.en || project.title?.ru || project.title || 'Untitled'} ===`);
        
        // Очищаем ошибки из title
        if (project.title && typeof project.title === 'object') {
            if (project.title.en && (project.title.en.includes('QUERY LENGTH LIMIT') || project.title.en.includes('MAX ALLOWED QUERY'))) {
                delete project.title.en;
                projectNeedsUpdate = true;
            }
            if (project.title.ru && (project.title.ru.includes('QUERY LENGTH LIMIT') || project.title.ru.includes('MAX ALLOWED QUERY'))) {
                delete project.title.ru;
                projectNeedsUpdate = true;
            }
        }
        
        // Очищаем ошибки из description
        if (project.description && typeof project.description === 'object') {
            if (project.description.en && (project.description.en.includes('QUERY LENGTH LIMIT') || project.description.en.includes('MAX ALLOWED QUERY'))) {
                delete project.description.en;
                projectNeedsUpdate = true;
            }
            if (project.description.ru && (project.description.ru.includes('QUERY LENGTH LIMIT') || project.description.ru.includes('MAX ALLOWED QUERY'))) {
                delete project.description.ru;
                projectNeedsUpdate = true;
            }
        }
        
        // Получаем исходные тексты (приоритет: исходный язык, затем другой язык, затем старый формат)
        let originalTitle = '';
        let originalDesc = '';
        
        if (project.title) {
            if (typeof project.title === 'string') {
                originalTitle = project.title;
                console.log(`  Title: string format "${originalTitle.substring(0, 50)}..."`);
            } else if (typeof project.title === 'object') {
                // Берем текст на любом языке, который не является ошибкой
                const titleEn = project.title.en && !project.title.en.includes('QUERY LENGTH LIMIT') ? project.title.en : null;
                const titleRu = project.title.ru && !project.title.ru.includes('QUERY LENGTH LIMIT') ? project.title.ru : null;
                originalTitle = titleEn || titleRu || '';
                console.log(`  Title: object format - en: ${titleEn ? '✓' : '✗'}, ru: ${titleRu ? '✓' : '✗'}`);
            }
        }
        
        if (project.description) {
            if (typeof project.description === 'string') {
                originalDesc = project.description;
                console.log(`  Description: string format (${originalDesc.length} chars)`);
            } else if (typeof project.description === 'object') {
                const descEn = project.description.en && !project.description.en.includes('QUERY LENGTH LIMIT') ? project.description.en : null;
                const descRu = project.description.ru && !project.description.ru.includes('QUERY LENGTH LIMIT') ? project.description.ru : null;
                originalDesc = descEn || descRu || '';
                console.log(`  Description: object format - en: ${descEn ? '✓' : '✗'}, ru: ${descRu ? '✓' : '✗'}`);
            }
        }
        
        // Определяем язык исходного текста
        if (originalTitle || originalDesc) {
            const sourceLang = detectLanguage((originalTitle || '') + ' ' + (originalDesc || ''));
            const targetLang = sourceLang === 'ru' ? 'en' : 'ru';
            console.log(`  Detected source language: ${sourceLang}, target: ${targetLang}`);
            
            // Проверяем и переводим title на оба языка
            if (originalTitle && originalTitle.trim() !== '') {
                if (!project.title || typeof project.title !== 'object') {
                    project.title = {};
                }
                
                // Сохраняем исходный текст
                if (!project.title[sourceLang] || project.title[sourceLang].includes('QUERY LENGTH LIMIT')) {
                    project.title[sourceLang] = originalTitle;
                    projectNeedsUpdate = true;
                    console.log(`  ✓ Saved original title in ${sourceLang}`);
                }
                
                // Переводим на другой язык, если перевода нет или он содержит ошибку
                const needsTitleTranslation = !project.title[targetLang] || 
                    project.title[targetLang].includes('QUERY LENGTH LIMIT') || 
                    project.title[targetLang].includes('MAX ALLOWED QUERY');
                
                // Также проверяем, нужен ли перевод на текущий язык интерфейса
                const currentTitle = project.title[currentLanguage];
                const currentTitleLang = currentTitle ? detectLanguage(currentTitle) : null;
                const needsCurrentLangTranslation = !currentTitle || 
                    currentTitle.trim() === '' ||
                    currentTitleLang !== currentLanguage ||
                    currentTitle.includes('QUERY LENGTH LIMIT') || 
                    currentTitle.includes('MAX ALLOWED QUERY');
                
                if (needsTitleTranslation) {
                    console.log(`  → Translating title (${originalTitle.length} chars) from ${sourceLang} to ${targetLang}...`);
                    const translatedTitle = await translateText(originalTitle, targetLang);
                    
                    if (isTranslationUsable(originalTitle, translatedTitle, targetLang)) {
                        project.title[targetLang] = translatedTitle;
                        projectNeedsUpdate = true;
                        translatedCount++;
                        console.log(`  ✓ Title translated successfully to ${targetLang}`);
                    } else {
                        console.warn(`  ✗ Translation failed for title, keeping existing`);
                    }
                } else {
                    console.log(`  ✓ Title already has translation in ${targetLang}`);
                }
                
                // Всегда проверяем и переводим на текущий язык интерфейса, если перевода нет
                if (needsCurrentLangTranslation) {
                    // Выбираем исходный текст для перевода: приоритет исходному языку, затем целевому
                    const sourceForCurrent = project.title[sourceLang] || project.title[targetLang] || originalTitle;
                    if (sourceForCurrent && sourceForCurrent.trim() !== '') {
                        const fromLang = sourceForCurrent === project.title[sourceLang] ? sourceLang : 
                                       sourceForCurrent === project.title[targetLang] ? targetLang : 
                                       detectLanguage(sourceForCurrent);
                        console.log(`  → Translating title to current language ${currentLanguage} from ${fromLang}...`);
                        if (currentTitle && currentTitleLang !== currentLanguage) {
                            console.log(`  ⚠ Current title in ${currentLanguage} is actually in ${currentTitleLang}, will retranslate`);
                        }
                        const translatedTitle = await translateText(sourceForCurrent, currentLanguage);
                        if (isTranslationUsable(sourceForCurrent, translatedTitle, currentLanguage)) {
                            project.title[currentLanguage] = translatedTitle;
                            projectNeedsUpdate = true;
                            translatedCount++;
                            console.log(`  ✓ Title translated successfully to ${currentLanguage}`);
                        } else {
                            console.warn(`  ✗ Translation to ${currentLanguage} failed for title`);
                        }
                    }
                } else {
                    console.log(`  ✓ Title already has correct translation in ${currentLanguage}`);
                }
            }
            
            // Проверяем и переводим description на оба языка
            if (originalDesc && originalDesc.trim() !== '') {
                if (!project.description || typeof project.description !== 'object') {
                    project.description = {};
                }
                
                // Сохраняем исходный текст
                if (!project.description[sourceLang] || project.description[sourceLang].includes('QUERY LENGTH LIMIT')) {
                    project.description[sourceLang] = originalDesc;
                    projectNeedsUpdate = true;
                    console.log(`  ✓ Saved original description in ${sourceLang}`);
                }
                
                // Переводим на другой язык, если перевода нет или он содержит ошибку
                const needsDescTranslation = !project.description[targetLang] || 
                    project.description[targetLang].includes('QUERY LENGTH LIMIT') || 
                    project.description[targetLang].includes('MAX ALLOWED QUERY');
                
                // Также проверяем, нужен ли перевод на текущий язык интерфейса
                const currentDesc = project.description[currentLanguage];
                // Проверяем не только наличие, но и что текст действительно на нужном языке
                const currentDescLang = currentDesc ? detectLanguage(currentDesc) : null;
                const needsCurrentLangDescTranslation = !currentDesc || 
                    currentDesc.trim() === '' ||
                    currentDescLang !== currentLanguage ||
                    currentDesc.includes('QUERY LENGTH LIMIT') || 
                    currentDesc.includes('MAX ALLOWED QUERY');
                
                if (needsDescTranslation) {
                    console.log(`  → Translating description (${originalDesc.length} chars) from ${sourceLang} to ${targetLang}...`);
                    const translatedDesc = await translateText(originalDesc, targetLang);
                    
                    if (isTranslationUsable(originalDesc, translatedDesc, targetLang)) {
                        project.description[targetLang] = translatedDesc;
                        projectNeedsUpdate = true;
                        translatedCount++;
                        console.log(`  ✓ Description translated successfully to ${targetLang}`);
                    } else {
                        console.warn(`  ✗ Translation failed for description, keeping existing`);
                    }
                } else {
                    console.log(`  ✓ Description already has translation in ${targetLang}`);
                }
                
                // Всегда проверяем и переводим на текущий язык интерфейса, если перевода нет
                if (needsCurrentLangDescTranslation) {
                    // Выбираем исходный текст для перевода: приоритет исходному языку, затем целевому
                    const sourceForCurrent = project.description[sourceLang] || project.description[targetLang] || originalDesc;
                    if (sourceForCurrent && sourceForCurrent.trim() !== '') {
                        // Определяем, с какого языка переводить
                        const fromLang = sourceForCurrent === project.description[sourceLang] ? sourceLang : 
                                       sourceForCurrent === project.description[targetLang] ? targetLang : 
                                       detectLanguage(sourceForCurrent);
                        console.log(`  → Translating description to current language ${currentLanguage} from ${fromLang} (${sourceForCurrent.length} chars)...`);
                        const translatedDesc = await translateText(sourceForCurrent, currentLanguage);
                        if (isTranslationUsable(sourceForCurrent, translatedDesc, currentLanguage)) {
                            project.description[currentLanguage] = translatedDesc;
                            projectNeedsUpdate = true;
                            translatedCount++;
                            console.log(`  ✓ Description translated successfully to ${currentLanguage}`);
                        } else {
                            console.warn(`  ✗ Translation to ${currentLanguage} failed for description`);
                        }
                    } else {
                        console.warn(`  ⚠ No source text available for translating description to ${currentLanguage}`);
                    }
                } else {
                    if (currentDescLang !== currentLanguage) {
                        console.warn(`  ⚠ Description in ${currentLanguage} is actually in ${currentDescLang}, but check failed`);
                    } else {
                        console.log(`  ✓ Description already has correct translation in ${currentLanguage}`);
                    }
                }
            }
        } else {
            console.log(`  ⚠ No original text found for this project`);
        }

        if (project.translationPending) {
            const pendingTitle = project.translationPending.title;
            if (pendingTitle && pendingTitle.from && pendingTitle.to) {
                const sourceText = (project.title && typeof project.title === 'object' && project.title[pendingTitle.from]) ||
                    originalTitle ||
                    '';
                if (sourceText.trim() !== '') {
                    console.log(`  → Retrying title translation from ${pendingTitle.from} to ${pendingTitle.to}...`);
                    const translatedTitle = await translateText(sourceText, pendingTitle.to);
                    if (isTranslationUsable(sourceText, translatedTitle, pendingTitle.to)) {
                        if (!project.title || typeof project.title !== 'object') {
                            project.title = {};
                        }
                        project.title[pendingTitle.to] = translatedTitle;
                        delete project.translationPending.title;
                        projectNeedsUpdate = true;
                        translatedCount++;
                        console.log(`  ✓ Pending title translated to ${pendingTitle.to}`);
                    } else {
                        console.warn(`  ✗ Pending title translation failed`);
                    }
                }
            }

            const pendingDescription = project.translationPending.description;
            if (pendingDescription && pendingDescription.from && pendingDescription.to) {
                const sourceText = (project.description && typeof project.description === 'object' && project.description[pendingDescription.from]) ||
                    originalDesc ||
                    '';
                if (sourceText.trim() !== '') {
                    console.log(`  → Retrying description translation from ${pendingDescription.from} to ${pendingDescription.to}...`);
                    const translatedDesc = await translateText(sourceText, pendingDescription.to);
                    if (isTranslationUsable(sourceText, translatedDesc, pendingDescription.to)) {
                        if (!project.description || typeof project.description !== 'object') {
                            project.description = {};
                        }
                        project.description[pendingDescription.to] = translatedDesc;
                        delete project.translationPending.description;
                        projectNeedsUpdate = true;
                        translatedCount++;
                        console.log(`  ✓ Pending description translated to ${pendingDescription.to}`);
                    } else {
                        console.warn(`  ✗ Pending description translation failed`);
                    }
                }
            }

            if (project.translationPending &&
                !project.translationPending.title &&
                !project.translationPending.description) {
                delete project.translationPending;
                projectNeedsUpdate = true;
            }
        }
        
        if (projectNeedsUpdate) {
            project.updatedAt = new Date().toISOString();
            needsSave = true;
        }
    }
    
    if (needsSave) {
        console.log(`Saving migrated projects... (translated ${translatedCount} texts)`);
        await saveProjects();
        renderProjects(); // Обновляем отображение
        if (translatedCount > 0) {
            showNotification(currentLanguage === 'ru' ? `Проекты переведены! (${translatedCount} текстов)` : `Projects translated! (${translatedCount} texts)`, 'success');
        }
    } else {
        console.log('All projects already have translations');
    }
}

// Обновление UI переключения языка
function updateLanguageUI() {
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
        const span = langBtn.querySelector('span');
        // Показываем текущий язык, а не язык для переключения
        if (span) {
            span.textContent = currentLanguage === 'en' ? '🇬🇧 EN' : '🇷🇺 RU';
        } else {
            langBtn.textContent = currentLanguage === 'en' ? '🇬🇧 EN' : '🇷🇺 RU';
        }
        langBtn.title = currentLanguage === 'en' ? 'Switch to Russian' : 'Переключить на английский';
    }
}

// Обновление всех текстов на странице
function updateAllTexts(options = {}) {
    const { skipProjectCards = false } = options;
    // Header
    if (authBtnText) {
        authBtnText.textContent = isAuthenticated ? t('logout') : t('login');
    }
    if (addBtn) {
        const addBtnText = addBtn.querySelector('span:last-child');
        if (addBtnText) addBtnText.textContent = t('addProject');
    }
    
    // Greeting
    const greetingLine = document.querySelector('.greeting-line');
    const greetingSubline = document.querySelector('.greeting-subline');
    if (greetingLine) {
        greetingLine.innerHTML = `${t('greeting')} <span class="name-highlight">Vlad</span>`;
    }
    if (greetingSubline) {
        greetingSubline.innerHTML = `${t('greetingSub')} <span class="emoji-inline">😊</span>`;
    }
    
    // Empty state
    const emptyStateTitle = document.querySelector('#emptyState h2');
    const emptyStateText = document.querySelector('#emptyState p');
    if (emptyStateTitle) emptyStateTitle.textContent = t('emptyTitle');
    if (emptyStateText) emptyStateText.textContent = t('emptyText');
    
    // Project modal
    if (modalTitle) {
        modalTitle.textContent = currentEditId ? t('editProjectTitle') : t('addProjectTitle');
    }
    const imagesLabel = document.querySelector('label[for="projectImages"]');
    if (imagesLabel) imagesLabel.textContent = t('imagesLabel');
    const imagesHint = document.querySelector('.form-hint');
    if (imagesHint && imagesHint.previousElementSibling === imagesLabel) {
        imagesHint.textContent = t('imagesHint');
    }
    const uploadPlaceholder = document.getElementById('uploadPlaceholder');
    if (uploadPlaceholder) uploadPlaceholder.textContent = t('selectImages');
    const addMoreBtn = document.getElementById('addMoreImagesBtn');
    if (addMoreBtn) addMoreBtn.textContent = t('addMoreImages');
    const titleLabel = document.querySelector('label[for="projectTitle"]');
    if (titleLabel) titleLabel.textContent = t('titleLabel');
    const titleInput = document.getElementById('projectTitle');
    if (titleInput) titleInput.placeholder = t('titlePlaceholder');
    const descLabel = document.querySelector('label[for="projectDescription"]');
    if (descLabel) descLabel.textContent = t('descriptionLabel');
    const descTextarea = document.getElementById('projectDescription');
    if (descTextarea) descTextarea.placeholder = t('descriptionPlaceholder');
    const linkLabel = document.querySelector('label[for="projectLink"]');
    if (linkLabel) linkLabel.textContent = t('linkLabel');
    const linkInput = document.getElementById('projectLink');
    if (linkInput) linkInput.placeholder = t('linkPlaceholder');
    if (cancelBtn) cancelBtn.textContent = t('cancel');
    const saveBtn = document.querySelector('#projectForm button[type="submit"]');
    if (saveBtn) saveBtn.textContent = t('save');
    
    // Auth modal
    const authModalTitle = document.getElementById('authModalTitle');
    if (authModalTitle) authModalTitle.textContent = t('authTitle');
    const passwordLabel = document.querySelector('label[for="adminPassword"]');
    if (passwordLabel) passwordLabel.textContent = t('passwordLabel');
    const passwordInput = document.getElementById('adminPassword');
    if (passwordInput) passwordInput.placeholder = t('passwordPlaceholder');
    const passwordHint = document.querySelector('#authForm .form-hint');
    if (passwordHint) passwordHint.textContent = t('passwordHint');
    if (cancelAuthBtn) cancelAuthBtn.textContent = t('cancel');
    const enterBtn = document.querySelector('#authForm button[type="submit"]');
    if (enterBtn) enterBtn.textContent = t('enter');
    
    if (!skipProjectCards) {
        const cardCountMatches = portfolioGrid
            ? portfolioGrid.querySelectorAll('.portfolio-item').length === projects.length
            : false;
        if (projects.length > 0 && cardCountMatches) {
            updateProjectCardsText();
            hydrateProjectCards();
        } else {
            renderProjects();
        }
    }
}

// Пароль администратора (можно изменить)
// Для безопасности в реальном проекте используйте хеширование и серверную проверку
const ADMIN_PASSWORD = 'ADMIN_PASSWORD_REMOVED'; // Измените на свой пароль

// Элементы DOM
const portfolioGrid = document.getElementById('portfolioGrid');
const emptyState = document.getElementById('emptyState');
const addBtn = document.getElementById('addBtn');
const authBtn = document.getElementById('authBtn');
const authBtnText = document.getElementById('authBtnText');
const settingsBtn = document.getElementById('settingsBtn');
const projectModal = document.getElementById('projectModal');
const imageModal = document.getElementById('imageModal');
const authModal = document.getElementById('authModal');
const projectForm = document.getElementById('projectForm');
const authForm = document.getElementById('authForm');
const closeModal = document.getElementById('closeModal');
const closeImageModal = document.getElementById('closeImageModal');
const closeAuthModal = document.getElementById('closeAuthModal');
const cancelBtn = document.getElementById('cancelBtn');
const cancelAuthBtn = document.getElementById('cancelAuthBtn');
const imagePreview = document.getElementById('imagesPreview');
const projectImages = document.getElementById('projectImages');
const modalTitle = document.getElementById('modalTitle');
const authStatus = document.getElementById('authStatus');
const imageGallery = document.getElementById('imageGallery');
const prevImageBtn = document.getElementById('prevImage');
const nextImageBtn = document.getElementById('nextImage');
const galleryCounter = document.getElementById('galleryCounter');

let currentImageIndex = 0;
let currentProjectImages = [];

// Настройки GitHub API
const GITHUB_REPO = 'vlad161rs-collab/vlad161rs-collab.github.io';
const GITHUB_FILE_PATH = 'data/projects.json';

// Получить GitHub Token из localStorage
function getGitHubToken() {
    return localStorage.getItem('githubToken');
}

// Сохранить GitHub Token в localStorage
function setGitHubToken(token) {
    if (token) {
        localStorage.setItem('githubToken', token);
    } else {
        localStorage.removeItem('githubToken');
    }
}

// Загрузка проектов из JSON файла
async function loadProjects() {
    const embeddedProjects = getEmbeddedProjectsSafe();
    const localProjects = await getLocalProjectsSafe();
    const hasLocalProjects = localProjects.length > 0;
    const hasEmbeddedProjects = embeddedProjects.length > 0;
    const hasPreRendered = portfolioGrid?.dataset?.prerendered === 'true';

    if (hasLocalProjects) {
        projects = localProjects;
        const cardCountMatches = portfolioGrid
            ? portfolioGrid.querySelectorAll('.portfolio-item').length === projects.length
            : false;
        if (hasPreRendered && cardCountMatches && projects.length > 0) {
            emptyState.classList.add('hidden');
            updateProjectCardsText();
            hydrateProjectCards();
        } else {
            renderProjects();
        }
    } else if (hasEmbeddedProjects) {
        projects = embeddedProjects;
        const cardCountMatches = portfolioGrid
            ? portfolioGrid.querySelectorAll('.portfolio-item').length === projects.length
            : false;
        if (hasPreRendered && cardCountMatches && projects.length > 0) {
            emptyState.classList.add('hidden');
            updateProjectCardsText();
            hydrateProjectCards();
        } else {
            renderProjects();
        }
    }

    const initialSignature = getProjectsSignature(projects);

    try {
        const response = await fetch('data/projects.json?t=' + Date.now()); // Добавляем timestamp для избежания кэша
        if (response.ok) {
            const data = await response.json();
            console.log(`Loaded ${Array.isArray(data) ? data.length : 0} project(s) from server`);
            
            // Если файл пустой, проверяем localStorage
            if (Array.isArray(data) && data.length > 0) {
                let serverProjects = data;
                let mergedProjects = serverProjects;
                let hasLocalChanges = false;

                if (hasLocalProjects) {
                    const serverMap = new Map();
                    serverProjects.forEach(project => {
                        if (project && project.id !== undefined && project.id !== null) {
                            serverMap.set(project.id, project);
                        }
                    });
                    const localMap = new Map();
                    localProjects.forEach(project => {
                        if (project && project.id !== undefined && project.id !== null) {
                            localMap.set(project.id, project);
                        }
                    });

                    mergedProjects = serverProjects.map(project => {
                        if (!project || project.id === undefined || project.id === null) {
                            return project;
                        }
                        const localProject = localMap.get(project.id);
                        if (localProject && getProjectTimestamp(localProject) > getProjectTimestamp(project)) {
                            hasLocalChanges = true;
                            return localProject;
                        }
                        return project;
                    });

                    localProjects.forEach(project => {
                        if (!project) return;
                        if (project.id === undefined || project.id === null || !serverMap.has(project.id)) {
                            mergedProjects.push(project);
                            hasLocalChanges = true;
                        }
                    });

                    if (hasLocalChanges) {
                        console.log('Merged local changes into server projects.');
                    }
                }

                const mergedSignature = getProjectsSignature(mergedProjects);
                if (mergedSignature !== initialSignature) {
                    projects = mergedProjects;
                    console.log('Projects from server:', projects.map(p => p.title));
                    const cardCountMatches = portfolioGrid
                        ? portfolioGrid.querySelectorAll('.portfolio-item').length === projects.length
                        : false;
                    if (hasPreRendered && cardCountMatches && projects.length > 0) {
                        updateProjectCardsText();
                        hydrateProjectCards();
                    } else {
                        renderProjects();
                    }
                } else {
                    projects = mergedProjects;
                    console.log('Projects from server are identical to initial render.');
                }

                if (hasLocalChanges) {
                    offerMigration();
                }
            } else {
                // Файл пустой, проверяем localStorage
                if (hasLocalProjects) {
                    setTimeout(() => {
                        migrateOldProjects();
                    }, 1000);
                    offerMigration();
                } else if (!hasEmbeddedProjects) {
                    projects = [];
                    renderProjects();
                }
            }
        } else {
            console.warn('Failed to load projects.json, checking localStorage');
            if (!hasLocalProjects && !hasEmbeddedProjects) {
                await loadFromLocalStorage();
            }
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        // Fallback на localStorage если файл не найден
        if (!hasLocalProjects && !hasEmbeddedProjects) {
            await loadFromLocalStorage();
        }
    }
}

// Загрузка из localStorage
async function loadFromLocalStorage() {
    const localProjects = await getLocalProjectsSafe();
    if (Array.isArray(localProjects) && localProjects.length > 0) {
        projects = localProjects;
        renderProjects();
        console.log('Loaded projects from browser draft storage');
        offerMigration();
        return;
    }

    projects = [];
    renderProjects();
}

function getEmbeddedProjectsSafe() {
    const embedded = document.getElementById('embeddedProjects');
    if (!embedded || !embedded.textContent) return [];
    try {
        const data = JSON.parse(embedded.textContent);
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error('Error parsing embedded projects:', e);
        return [];
    }
}

// Предложить миграцию данных
function offerMigration() {
    const token = getGitHubToken();
    if (token && projects.length > 0) {
        // Если токен есть, автоматически мигрируем
        setTimeout(() => {
            if (confirm(t('migrationOffer', { count: projects.length }))) {
                migrateToServer();
            }
        }, 500);
    } else if (projects.length > 0) {
        // Если токена нет, предлагаем настроить
        setTimeout(() => {
            if (confirm(t('migrationOffer', { count: projects.length }) + '\n\n' + t('githubTokenRequired'))) {
                showGitHubTokenPrompt();
            }
        }, 500);
    }
}

// Миграция данных из localStorage на сервер
async function migrateToServer() {
    if (projects.length === 0) {
        showNotification(currentLanguage === 'ru' ? 'Нет проектов для миграции' : 'No projects to migrate', 'info');
        return;
    }
    
    const token = getGitHubToken();
    if (!token) {
        showNotification(t('githubTokenRequired'), 'error');
        showGitHubTokenPrompt();
        return;
    }
    
    showNotification(currentLanguage === 'ru' ? 'Миграция проектов на сервер...' : 'Migrating projects to server...', 'info');
    try {
        await saveProjects();
        showNotification(t('migrationSuccess', { count: projects.length }), 'success');
    } catch (error) {
        console.error('Migration error:', error);
        showNotification(t('migrationError', { error: error.message }), 'error');
    }
}

// Сохранение проектов через GitHub API
function getDraftSaveStatusSuffix() {
    if (draftStoreWriteSucceeded === true) {
        return currentLanguage === 'ru'
            ? ' Черновик сохранен в браузере (IndexedDB).'
            : ' Draft saved in browser (IndexedDB).';
    }
    if (draftStoreWriteSucceeded === false) {
        return currentLanguage === 'ru'
            ? ' Черновик в браузере не сохранен.'
            : ' Browser draft was not saved.';
    }
    return '';
}

async function getGitHubFileSha(token, filePath) {
    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}?ref=main`, {
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });

    if (response.ok) {
        const data = await response.json();
        return data.sha || null;
    }
    if (response.status === 404) {
        return null;
    }

    const body = await response.text().catch(() => '');
    throw new Error(`Failed to get SHA for ${filePath}: HTTP ${response.status} ${body.substring(0, 200)}`);
}

async function putGitHubFileBase64(token, filePath, base64Content, message) {
    const sha = await getGitHubFileSha(token, filePath);
    const body = {
        message,
        content: base64Content,
        branch: 'main'
    };
    if (sha) {
        body.sha = sha;
    }

    const response = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${filePath}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Accept': 'application/vnd.github.v3+json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        const responseText = await response.text().catch(() => '');
        throw new Error(`GitHub PUT ${filePath} failed: HTTP ${response.status} ${responseText.substring(0, 200)}`);
    }

    return true;
}

async function materializeProjectImagesForServer(projectList, token) {
    const uploadTasks = new Map();
    const normalizedProjects = [];

    for (const project of projectList) {
        if (!project) continue;

        const normalizedProject = { ...project };
        const sourceImages = getImageList(project);
        const mainIndex = project.mainImageIndex !== undefined ? project.mainImageIndex : 0;
        const normalizedImages = [];

        for (let index = 0; index < sourceImages.length; index++) {
            const imageValue = sourceImages[index];
            if (!isBase64ImageDataUrl(imageValue)) {
                normalizedImages.push(imageValue);
                continue;
            }

            const imageParts = extractBase64ImageParts(imageValue);
            if (!imageParts) {
                normalizedImages.push(imageValue);
                continue;
            }

            const imagePath = buildProjectImagePath(project, index, imageValue);
            if (!uploadTasks.has(imagePath)) {
                uploadTasks.set(
                    imagePath,
                    putGitHubFileBase64(
                        token,
                        imagePath,
                        imageParts.base64,
                        `Upload portfolio image for project ${project.id ?? 'unknown'} (${index + 1})`
                    )
                );
            }

            await uploadTasks.get(imagePath);
            normalizedImages.push(imagePath);
        }

        if (normalizedImages.length > 0) {
            normalizedProject.images = normalizedImages;
            normalizedProject.mainImageIndex = mainIndex >= 0 && mainIndex < normalizedImages.length ? mainIndex : 0;
            normalizedProject.image = normalizedImages[normalizedProject.mainImageIndex] || normalizedImages[0] || null;
        }

        normalizedProjects.push(normalizedProject);
    }

    return normalizedProjects;
}

async function saveProjects() {
    // Проверяем, что массив projects содержит все проекты
    console.log(`Saving ${projects.length} project(s) to server:`, projects.map(p => p.title));
    
    // Проверяем, что все проекты имеют необходимые поля
    const validProjects = projects.filter(p => {
        const isValid = p && p.title && (p.images || p.image);
        if (!isValid) {
            console.warn('Invalid project found:', p);
        }
        return isValid;
    });
    
    if (validProjects.length !== projects.length) {
        console.warn(`Filtered out ${projects.length - validProjects.length} invalid project(s)`);
        projects = validProjects;
    }
    
    // Также проверяем localStorage - если там больше проектов, объединяем
    const localProjects = await getLocalProjectsSafe();
    if (Array.isArray(localProjects) && localProjects.length > projects.length) {
        console.log(`Found more projects in browser drafts (${localProjects.length}) than in current array (${projects.length}). Merging...`);
        const currentIds = new Set(projects.map(p => p.id));
        const missingProjects = localProjects.filter(p => !currentIds.has(p.id));
        if (missingProjects.length > 0) {
            projects = [...projects, ...missingProjects];
            console.log(`Added ${missingProjects.length} missing project(s) from browser drafts:`, missingProjects.map(p => p.title));
        }
    }
    
    console.log(`Final projects array before save: ${projects.length} project(s):`, projects.map(p => p.title));
    
    // Также сохраняем в localStorage как резервную копию
    await saveDraftProjects(projects);

    const token = getGitHubToken();
    if (!token) {
        console.warn('GitHub token not set. Projects saved to browser drafts only.');
        // Показываем уведомление пользователю
        showGitHubTokenPrompt();
        return;
    }
    
    try {
        // Сначала получаем текущий SHA файла (нужно для обновления)
        const preparedProjects = await materializeProjectImagesForServer(projects, token);
        const preparedSignature = getProjectsSignature(preparedProjects);
        const currentSignature = getProjectsSignature(projects);
        if (preparedSignature !== currentSignature) {
            projects = preparedProjects;
            await saveDraftProjects(projects);
            console.log('Converted inline images to repository file paths before JSON save');
        }

        const getFileResponse = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
            {
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            }
        );
        
        let sha = null;
        if (getFileResponse.ok) {
            const fileData = await getFileResponse.json();
            sha = fileData.sha;
            console.log('Got file SHA for update');
        } else if (getFileResponse.status === 404) {
            console.log('File does not exist yet, will create new');
        } else {
            console.warn('Failed to get file info:', getFileResponse.status);
        }
        
        // Подготавливаем данные для отправки
        const content = JSON.stringify(projects, null, 2);
        const contentSizeMB = (content.length / 1024 / 1024).toFixed(2);
        const encodedContent = btoa(unescape(encodeURIComponent(content)));
        const encodedSizeMB = (encodedContent.length / 1024 / 1024).toFixed(2);
        
        console.log(`Prepared content: ${projects.length} projects`);
        console.log(`Content size: ${contentSizeMB} MB (raw), ${encodedSizeMB} MB (base64)`);
        console.log(`Projects breakdown:`, projects.map(p => ({
            title: p.title,
            images: Array.isArray(p.images) ? p.images.length : 1,
            imageSize: Array.isArray(p.images) 
                ? (JSON.stringify(p.images).length / 1024).toFixed(2) + ' KB'
                : (p.image ? (p.image.length / 1024).toFixed(2) + ' KB' : '0 KB')
        })));
        
        // GitHub API ограничение: ~100MB для файла, но на практике лучше <50MB
        // Base64 увеличивает размер на ~33%, так что проверяем исходный размер
        if (content.length > 50 * 1024 * 1024) {
            const errorMsg = t('fileTooLarge', { size: contentSizeMB });
            console.error(errorMsg);
            showNotification(errorMsg, 'error');
            return;
        }
        
        const body = {
            message: `Update portfolio projects - ${new Date().toISOString()} (${projects.length} projects)`,
            content: encodedContent,
            branch: 'main'
        };
        
        if (sha) {
            body.sha = sha;
        }
        
        console.log('Sending request to GitHub API...');
        
        // Отправляем обновление
        const response = await fetch(
            `https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `token ${token}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            }
        );
        
        const responseText = await response.text();
        console.log('Response status:', response.status);
        console.log('Response text:', responseText.substring(0, 500));
        
        if (response.ok) {
            try {
                const responseData = JSON.parse(responseText);
                console.log('Projects saved to GitHub successfully:', responseData);
                console.log(`Saved ${projects.length} project(s):`, projects.map(p => p.title));
                
                // Верифицируем сохранение - загружаем файл обратно через несколько секунд
                setTimeout(async () => {
                    try {
                        const verifyResponse = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_FILE_PATH}?ref=main`, {
                            headers: {
                                'Accept': 'application/vnd.github.v3+json'
                            }
                        });
                        
                        if (verifyResponse.ok) {
                            const verifyData = await verifyResponse.json();
                            const decodedContent = atob(verifyData.content.replace(/\s/g, ''));
                            const savedProjects = JSON.parse(decodedContent);
                            console.log(`Verification: Found ${savedProjects.length} project(s) on server:`, savedProjects.map(p => p.title));
                            
                            if (savedProjects.length !== projects.length) {
                                console.error(`MISMATCH: Expected ${projects.length} projects, but found ${savedProjects.length} on server!`);
                                showNotification(t('saveMismatch', { saved: savedProjects.length, expected: projects.length }), 'error');
                                
                                // Пытаемся сохранить снова
                                console.log('Retrying save...');
                                await saveProjects();
                            } else {
                                console.log('Verification successful: All projects saved correctly');
                                showNotification(t('projectsVerified', { count: projects.length, size: contentSizeMB }), 'success');
                            }
                        } else {
                            console.warn('Could not verify save - file may not be accessible yet');
                            showNotification(t('projectsSavedWithCount', { count: projects.length, size: contentSizeMB }), 'success');
                        }
                    } catch (verifyError) {
                        console.error('Error verifying save:', verifyError);
                        showNotification(t('projectsSavedWithCount', { count: projects.length, size: contentSizeMB }), 'success');
                    }
                }, 2000); // Проверяем через 2 секунды
                
            } catch (e) {
                console.log('Response is not JSON, but status is OK');
                showNotification(t('projectsSavedWithCount', { count: projects.length, size: contentSizeMB }), 'success');
            }
        } else {
            let errorMessage = 'Unknown error';
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
                console.error('Failed to save to GitHub:', errorData);
                
                // Специальная обработка для ошибок размера
                if (errorMessage.includes('size') || errorMessage.includes('too large') || response.status === 413) {
                    errorMessage = t('fileTooLarge', { size: contentSizeMB });
                }
            } catch (e) {
                errorMessage = responseText.substring(0, 200) || `HTTP ${response.status}`;
                console.error('Failed to parse error response:', e);
            }
            
            console.error('Response status:', response.status);
            console.error('Error message:', errorMessage);
            showNotification((currentLanguage === 'ru' ? 'Ошибка при сохранении: ' : 'Error saving: ') + errorMessage + getDraftSaveStatusSuffix(), 'error');
        }
    } catch (error) {
        console.error('Error saving to GitHub:', error);
        showNotification((currentLanguage === 'ru' ? 'Ошибка при сохранении на сервер.' : 'Error saving to server.') + getDraftSaveStatusSuffix(), 'error');
    }
}

// Показать запрос на ввод GitHub Token
function showGitHubTokenPrompt() {
    const token = getGitHubToken();
    const message = token 
        ? (currentLanguage === 'ru' ? 'Токен GitHub найден. Хотите изменить его?' : 'GitHub token found. Do you want to change it?')
        : t('githubTokenRequired');
    
    const instructions = currentLanguage === 'ru' 
        ? 'Инструкция:\n1. Перейдите на https://github.com/settings/tokens\n2. Создайте новый токен (classic)\n3. Дайте права: repo (полный доступ к репозиториям)\n4. Вставьте токен ниже'
        : 'Instructions:\n1. Go to https://github.com/settings/tokens\n2. Create a new token (classic)\n3. Give permissions: repo (full access to repositories)\n4. Paste the token below';
    
    const userToken = prompt(
        message + '\n\n' + instructions + '\n\n' + (currentLanguage === 'ru' ? 'Токен (оставьте пустым для отмены):' : 'Token (leave empty to cancel):'),
        token || ''
    );
    
    if (userToken !== null && userToken.trim()) {
        setGitHubToken(userToken.trim());
        showNotification(t('tokenSaved'), 'success');
        
        // Проверяем, есть ли проекты в localStorage для миграции
        (async () => {
            try {
                const localProjects = await getLocalProjectsSafe();
                if (Array.isArray(localProjects) && localProjects.length > 0 && projects.length === 0) {
                    projects = localProjects;
                    renderProjects();
                    setTimeout(() => {
                        if (confirm(t('migrationOffer', { count: projects.length }))) {
                            migrateToServer();
                        }
                    }, 500);
                } else {
                    saveProjects();
                }
            } catch (e) {
                saveProjects();
            }
        })();
    }
}

function showNotification(message, type = 'info') {
    // Создаем элемент уведомления
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        padding: 15px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.3);
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Рендеринг проектов
function renderProjects() {
    portfolioGrid.innerHTML = '';
    portfolioGrid.dataset.prerendered = 'false';
    
    if (projects.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }
    
    emptyState.classList.add('hidden');
    
    projects.forEach((project, index) => {
        const projectCard = createProjectCard(project, index);
        portfolioGrid.appendChild(projectCard);
    });
}

function hydrateProjectCards() {
    if (!portfolioGrid) return;
    const cards = portfolioGrid.querySelectorAll('.portfolio-item');
    cards.forEach((card) => {
        if (card.dataset.bound === '1') return;
        const index = Number(card.dataset.index);
        if (!Number.isFinite(index)) return;

        card.dataset.bound = '1';
        card.addEventListener('click', (e) => {
            if (e.target.closest('.portfolio-item-actions') || e.target.closest('.btn-icon')) {
                return;
            }
            viewProject(index);
        });

        const viewBtn = card.querySelector('[data-action="view"]');
        if (viewBtn) {
            viewBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                viewProject(index);
            });
        }
    });
}

function updateProjectCardsText() {
    if (!portfolioGrid) return;
    const cards = portfolioGrid.querySelectorAll('.portfolio-item');
    cards.forEach((card) => {
        const index = Number(card.dataset.index);
        if (!Number.isFinite(index)) return;
        const project = projects[index];
        if (!project) return;
        const title = getProjectText(project, 'title');
        const description = getProjectText(project, 'description');

        const titleEl = card.querySelector('.portfolio-item-title');
        const descEl = card.querySelector('.portfolio-item-description');
        if (titleEl) titleEl.textContent = title;
        if (descEl) descEl.textContent = description;

        const imgEl = card.querySelector('img.portfolio-item-image');
        if (imgEl) {
            const images = Array.isArray(project.images) && project.images.length > 0
                ? project.images
                : (project.image ? [project.image] : []);
            const mainIndex = project.mainImageIndex !== undefined ? project.mainImageIndex : 0;
            const previewImage = images[mainIndex] || images[0] || project.image || PLACEHOLDER_IMAGE;
            if ((imgEl.getAttribute('src') || '') !== previewImage) {
                imgEl.src = previewImage;
            }
            imgEl.alt = title;
        }

        const viewBtn = card.querySelector('[data-action="view"]');
        if (viewBtn) {
            viewBtn.textContent = `👁️ ${t('view')}`;
        }
    });
}

// Создание карточки проекта
function createProjectCard(project, index) {
    const card = document.createElement('div');
    card.className = 'portfolio-item';
    card.style.animationDelay = `${index * 0.1}s`;
    
    const adminActions = isAuthenticated ? `
        <button class="btn-icon" onclick="event.stopPropagation(); editProject(${index})">
            ✏️ ${t('edit')}
        </button>
        <button class="btn-icon delete" onclick="event.stopPropagation(); deleteProject(${index})">
            🗑️ ${t('delete')}
        </button>
    ` : '';
    
    // Используем главное изображение или первое из массива
    const images = Array.isArray(project.images) && project.images.length > 0 
        ? project.images 
        : (project.image ? [project.image] : []);
    
    // Определяем главное изображение
    const mainIndex = project.mainImageIndex !== undefined ? project.mainImageIndex : 0;
    const previewImage = images[mainIndex] || images[0] || project.image || PLACEHOLDER_IMAGE;
    
    // Получаем переводы для текущего языка
    const projectTitle = getProjectText(project, 'title');
    const projectDescription = getProjectText(project, 'description');
    
    card.innerHTML = `
        <img src="${previewImage}" alt="${projectTitle}" class="portfolio-item-image" loading="lazy" decoding="async">
        <div class="portfolio-item-content">
            <h3 class="portfolio-item-title">${projectTitle}</h3>
            <p class="portfolio-item-description">${projectDescription}</p>
            <div class="portfolio-item-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); viewProject(${index})">
                    👁️ ${t('view')}
                </button>
                ${adminActions}
            </div>
        </div>
    `;
    
    // Добавляем обработчик клика на всю карточку для открытия просмотра
    card.addEventListener('click', (e) => {
        // Не открываем просмотр, если кликнули на кнопки действий
        if (e.target.closest('.portfolio-item-actions') || e.target.closest('.btn-icon')) {
            return;
        }
        viewProject(index);
    });
    
    return card;
}

// Просмотр проекта
function viewProject(index) {
    const project = projects[index];
    const imageInfo = document.getElementById('imageInfo');
    
    // Получаем массив изображений
    const images = Array.isArray(project.images) && project.images.length > 0 
        ? project.images 
        : (project.image ? [project.image] : []);
    
    if (images.length === 0) return;
    
    currentProjectImages = images;
    
    // Определяем начальный индекс (главное изображение или первое)
    const mainIndex = project.mainImageIndex !== undefined ? project.mainImageIndex : 0;
    currentImageIndex = mainIndex >= 0 && mainIndex < images.length ? mainIndex : 0;
    
    // Получаем переводы для текущего языка
    const projectTitle = getProjectText(project, 'title');
    const projectDescription = getProjectText(project, 'description');
    const openProjectText = currentLanguage === 'ru' ? 'Открыть проект' : 'Open Project';
    
    // Очищаем галерею и добавляем изображения
    imageGallery.innerHTML = '';
    images.forEach((imgSrc, idx) => {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `${projectTitle} - ${t('imageOf')} ${idx + 1}`;
        if (idx === currentImageIndex) img.classList.add('active');
        imageGallery.appendChild(img);
    });
    
    updateGalleryControls();
    
    imageInfo.innerHTML = `
        <h3>${projectTitle}</h3>
        <p>${projectDescription}</p>
        ${project.link ? `<a href="${project.link}" target="_blank" style="color: var(--primary); margin-top: 1rem; display: inline-block;">${openProjectText} →</a>` : ''}
    `;
    
    imageModal.classList.add('active');
}

// Обновление контролов галереи
function updateGalleryControls() {
    galleryCounter.textContent = `${currentImageIndex + 1} / ${currentProjectImages.length}`;
    prevImageBtn.disabled = currentImageIndex === 0;
    nextImageBtn.disabled = currentImageIndex === currentProjectImages.length - 1;
    
    // Показываем/скрываем изображения
    const images = imageGallery.querySelectorAll('img');
    images.forEach((img, idx) => {
        if (idx === currentImageIndex) {
            img.classList.add('active');
        } else {
            img.classList.remove('active');
        }
    });
}

// Переключение изображений
prevImageBtn.addEventListener('click', () => {
    if (currentImageIndex > 0) {
        currentImageIndex--;
        updateGalleryControls();
    }
});

nextImageBtn.addEventListener('click', () => {
    if (currentImageIndex < currentProjectImages.length - 1) {
        currentImageIndex++;
        updateGalleryControls();
    }
});

// Редактирование проекта
function editProject(index) {
    if (!isAuthenticated) {
        showAuthModal();
        return;
    }
    
    const project = projects[index];
    if (!project) return;
    
    currentEditId = index;

    if (projectImages) {
        projectImages.value = '';
    }
    
    modalTitle.textContent = t('editProjectTitle');
    
    // Получаем текст на текущем языке для редактирования
    const projectTitle = getProjectText(project, 'title');
    const projectDescription = getProjectText(project, 'description');
    
    document.getElementById('projectTitle').value = projectTitle || '';
    document.getElementById('projectDescription').value = projectDescription || '';
    document.getElementById('projectLink').value = project.link || '';
    
    // Показываем текущие изображения
    const images = Array.isArray(project.images) && project.images.length > 0 
        ? project.images 
        : (project.image ? [project.image] : []);
    
    previewImagesData = images;
    const savedMainIndex = project.mainImageIndex !== undefined ? project.mainImageIndex : 0;
    mainImageIndex = savedMainIndex;
    displayImagePreviews(images, savedMainIndex);
    
    projectModal.classList.add('active');
}

// Удаление проекта
function deleteProject(index) {
    if (!isAuthenticated) {
        showAuthModal();
        return;
    }
    
    if (confirm(t('deleteConfirm'))) {
        projects.splice(index, 1);
        saveProjects();
        renderProjects();
        showNotification(t('projectDeleted'), 'success');
    }
}

// Проверка авторизации
function checkAuth() {
    const saved = localStorage.getItem('portfolioAuth');
    if (saved) {
        try {
            const authData = JSON.parse(saved);
            // Проверяем, не истекла ли сессия (24 часа)
            if (Date.now() - authData.timestamp < 24 * 60 * 60 * 1000) {
                isAuthenticated = true;
                updateAuthUI();
                return true;
            } else {
                localStorage.removeItem('portfolioAuth');
            }
        } catch (e) {
            localStorage.removeItem('portfolioAuth');
        }
    }
    isAuthenticated = false;
    updateAuthUI();
    return false;
}

// Обновление UI в зависимости от авторизации
function updateAuthUI() {
    if (isAuthenticated) {
        addBtn.style.display = 'flex';
        if (settingsBtn) settingsBtn.style.display = 'flex';
        authBtn.classList.add('logged-in');
        authBtnText.textContent = '🔓 Logout';
    } else {
        addBtn.style.display = 'none';
        if (settingsBtn) settingsBtn.style.display = 'none';
        authBtn.classList.remove('logged-in');
        authBtnText.textContent = '🔐 Login';
    }
    renderProjects();
}

// Показать модальное окно авторизации
function showAuthModal() {
    if (!authModal) {
        console.error('authModal not found');
        return;
    }
    
    authModal.classList.add('active');
    
    // Убеждаемся, что модальное окно видимо
    authModal.style.display = 'flex';
    
    const passwordInput = document.getElementById('adminPassword');
    if (passwordInput) {
        setTimeout(() => {
            passwordInput.focus();
        }, 100);
    }
    
    if (authStatus) {
        authStatus.style.display = 'none';
    }
    
    if (authForm) {
        authForm.reset();
    }
}

// Вход в систему
function login(password) {
    if (password === ADMIN_PASSWORD) {
        isAuthenticated = true;
        localStorage.setItem('portfolioAuth', JSON.stringify({
            timestamp: Date.now()
        }));
        updateAuthUI();
        authModal.classList.remove('active');
        authForm.reset();
        authStatus.style.display = 'none';
        return true;
    } else {
        authStatus.textContent = t('wrongPassword');
        authStatus.className = 'auth-status error';
        authStatus.style.display = 'block';
        return false;
    }
}

// Отображение превью изображений
function displayImagePreviews(images, currentMainIndex = 0) {
    const addMoreBtn = document.getElementById('addMoreImagesBtn');
    
    if (!images || images.length === 0) {
        imagePreview.innerHTML = `<label for="projectImages" class="upload-placeholder" id="uploadPlaceholder">${t('selectImages')}</label>`;
        imagePreview.classList.remove('has-images');
        if (addMoreBtn) addMoreBtn.style.display = 'none';
        // Восстанавливаем обработчик клика на placeholder
        setupUploadPlaceholder();
        return;
    }
    
    mainImageIndex = currentMainIndex;
    
    // Когда есть изображения, отключаем клик на input в области превью
    imagePreview.classList.add('has-images');
    if (addMoreBtn) addMoreBtn.style.display = 'block';
    
    imagePreview.innerHTML = '';
    images.forEach((imgSrc, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = `image-preview-item ${index === mainImageIndex ? 'main-image' : ''}`;
        previewItem.onclick = (e) => {
            // Не переключаем, если кликнули на кнопку удаления
            if (e.target.classList.contains('remove-image')) return;
            e.stopPropagation();
            setMainImage(index);
        };
        previewItem.innerHTML = `
            <img src="${imgSrc}" alt="Preview ${index + 1}">
            <button type="button" class="remove-image" onclick="event.stopPropagation(); removePreviewImage(${index})">×</button>
            <span class="main-badge">${currentLanguage === 'ru' ? 'Главное' : 'Main'}</span>
        `;
        imagePreview.appendChild(previewItem);
    });
}

// Установка главного изображения
function setMainImage(index) {
    if (index < 0 || index >= previewImagesData.length) return;
    mainImageIndex = index;
    
    // Обновляем визуальное отображение
    const items = imagePreview.querySelectorAll('.image-preview-item');
    items.forEach((item, idx) => {
        if (idx === index) {
            item.classList.add('main-image');
        } else {
            item.classList.remove('main-image');
        }
    });
}

// Хранилище для превью изображений
let previewImagesData = [];
let mainImageIndex = 0; // Индекс главного изображения

// Удаление изображения из превью
window.removePreviewImage = function(index) {
    // Удаляем из массива данных
    previewImagesData.splice(index, 1);
    
    // Обновляем индекс главного изображения
    if (mainImageIndex >= previewImagesData.length) {
        mainImageIndex = Math.max(0, previewImagesData.length - 1);
    } else if (mainImageIndex > index) {
        mainImageIndex--;
    }
    
    // Обновляем превью
    if (previewImagesData.length === 0) {
        imagePreview.innerHTML = `<label for="projectImages" class="upload-placeholder" id="uploadPlaceholder">${t('selectImages')}</label>`;
        mainImageIndex = 0;
        imagePreview.classList.remove('has-images');
        const addMoreBtn = document.getElementById('addMoreImagesBtn');
        if (addMoreBtn) addMoreBtn.style.display = 'none';
        // Восстанавливаем обработчик клика на placeholder
        setupUploadPlaceholder();
        if (projectImages) {
            projectImages.value = '';
        }
    } else {
        displayImagePreviews(previewImagesData, mainImageIndex);
    }
}

// Выход из системы
function logout() {
    isAuthenticated = false;
    localStorage.removeItem('portfolioAuth');
    updateAuthUI();
    if (projectModal.classList.contains('active')) {
        projectModal.classList.remove('active');
        resetForm();
    }
}

// Открытие модального окна для добавления
addBtn.addEventListener('click', () => {
    if (!isAuthenticated) {
        showAuthModal();
        return;
    }
    
    currentEditId = null;
    modalTitle.textContent = t('addProjectTitle');
    projectForm.reset();
    imagePreview.innerHTML = `<label for="projectImages" class="upload-placeholder" id="uploadPlaceholder">${t('selectImages')}</label>`;
    imagePreview.classList.remove('has-images');
    setupUploadPlaceholder();
    projectModal.classList.add('active');
});

// Кнопка авторизации
if (authBtn) {
    authBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('Auth button clicked, isAuthenticated:', isAuthenticated);
        
        if (isAuthenticated) {
            if (confirm(currentLanguage === 'ru' ? 'Вы уверены, что хотите выйти?' : 'Are you sure you want to logout?')) {
                logout();
            }
        } else {
            console.log('Calling showAuthModal');
            showAuthModal();
        }
    });
    
    // Обработчик кнопки настроек
    if (settingsBtn) {
        settingsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            showGitHubTokenPrompt();
        });
    }
    
    // Дополнительная проверка - убеждаемся, что кнопка кликабельна
    authBtn.style.pointerEvents = 'auto';
    authBtn.style.cursor = 'pointer';
} else {
    console.error('authBtn not found');
}

// Обработка формы авторизации
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = document.getElementById('adminPassword').value;
    login(password);
});

// Закрытие модального окна авторизации
closeAuthModal.addEventListener('click', () => {
    authModal.classList.remove('active');
    authForm.reset();
    authStatus.style.display = 'none';
});

cancelAuthBtn.addEventListener('click', () => {
    authModal.classList.remove('active');
    authForm.reset();
    authStatus.style.display = 'none';
});

authModal.addEventListener('click', (e) => {
    if (e.target === authModal) {
        authModal.classList.remove('active');
        authForm.reset();
        authStatus.style.display = 'none';
    }
});

// Закрытие модальных окон
closeModal.addEventListener('click', () => {
    projectModal.classList.remove('active');
    resetForm();
});

closeImageModal.addEventListener('click', () => {
    imageModal.classList.remove('active');
});

cancelBtn.addEventListener('click', () => {
    projectModal.classList.remove('active');
    resetForm();
});

// Закрытие по клику вне модального окна
projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal) {
        projectModal.classList.remove('active');
        resetForm();
    }
});

imageModal.addEventListener('click', (e) => {
    if (e.target === imageModal) {
        imageModal.classList.remove('active');
    }
});

const IMAGE_MAX_DIMENSION = 1600;
const IMAGE_JPEG_QUALITY = 0.86;

function readFileWithFileReader(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) => resolve(event.target.result);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
}

function readFileWithCanvas(file) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        const objectUrl = URL.createObjectURL(file);

        image.onload = () => {
            URL.revokeObjectURL(objectUrl);
            const maxSide = Math.max(image.width, image.height);
            const scale = maxSide > IMAGE_MAX_DIMENSION ? IMAGE_MAX_DIMENSION / maxSide : 1;
            const targetWidth = Math.max(1, Math.round(image.width * scale));
            const targetHeight = Math.max(1, Math.round(image.height * scale));

            const canvas = document.createElement('canvas');
            canvas.width = targetWidth;
            canvas.height = targetHeight;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas not supported'));
                return;
            }

            ctx.drawImage(image, 0, 0, targetWidth, targetHeight);
            const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const outputQuality = outputType === 'image/jpeg' ? IMAGE_JPEG_QUALITY : 0.92;
            resolve(canvas.toDataURL(outputType, outputQuality));
        };

        image.onerror = (error) => {
            URL.revokeObjectURL(objectUrl);
            reject(error);
        };

        image.src = objectUrl;
    });
}

function readFileAsDataUrl(file) {
    return readFileWithFileReader(file).catch(() => readFileWithCanvas(file));
}

async function readFilesAsDataUrls(files) {
    const reads = files.map(file => readFileAsDataUrl(file));
    const settled = await Promise.allSettled(reads);
    return {
        successful: settled.filter(item => item.status === 'fulfilled').map(item => item.value),
        failed: settled.filter(item => item.status === 'rejected')
    };
}

// Предпросмотр изображений
if (projectImages) {
    projectImages.addEventListener('change', async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) {
            if (previewImagesData.length === 0) {
                imagePreview.innerHTML = `<label for="projectImages" class="upload-placeholder" id="uploadPlaceholder">${t('selectImages')}</label>`;
                imagePreview.classList.remove('has-images');
                const addMoreBtn = document.getElementById('addMoreImagesBtn');
                if (addMoreBtn) addMoreBtn.style.display = 'none';
                setupUploadPlaceholder();
            }
            return;
        }

        const isFirstLoad = previewImagesData.length === 0;

        const { successful, failed } = await readFilesAsDataUrls(files);

        if (successful.length === 0) {
            console.error('All image reads failed', failed);
            alert(currentLanguage === 'ru' ? 'Ошибка при чтении изображений' : 'Error reading images');
            return;
        }

        if (isFirstLoad) {
            previewImagesData = successful;
            mainImageIndex = 0;
        } else {
            previewImagesData = [...previewImagesData, ...successful];
        }

        if (failed.length > 0) {
            console.warn('Some images failed to read', failed);
            showNotification(currentLanguage === 'ru' ? 'Некоторые изображения не удалось прочитать' : 'Some images could not be read', 'error');
        }

        displayImagePreviews(previewImagesData, mainImageIndex);
    });
}

// Кнопка для добавления дополнительных изображений
const addMoreImagesBtn = document.getElementById('addMoreImagesBtn');
if (addMoreImagesBtn) {
    addMoreImagesBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        e.preventDefault();
        if (projectImages) {
            projectImages.click();
        }
    });
}

// Обработчик клика на placeholder для загрузки изображений
function setupUploadPlaceholder() {
    const placeholder = document.getElementById('uploadPlaceholder');
    if (placeholder && projectImages) {
        // Если это label, он уже связан с input через for="projectImages"
        // Просто убеждаемся, что он кликабелен
        if (placeholder.tagName === 'LABEL') {
            placeholder.setAttribute('for', 'projectImages');
            placeholder.style.cursor = 'pointer';
        } else {
            // Если это span, заменяем на label
            const label = document.createElement('label');
            label.id = 'uploadPlaceholder';
            label.className = 'upload-placeholder';
            label.setAttribute('for', 'projectImages');
            label.textContent = placeholder.textContent;
            placeholder.parentNode.replaceChild(label, placeholder);
        }
    }
}

// Инициализация при загрузке
setupUploadPlaceholder();

// Обработка формы - предотвращаем случайные клики
projectForm.addEventListener('click', (e) => {
    // Разрешаем клики только на определенных элементах
    const target = e.target;
    const isAllowed = target.closest('.upload-placeholder') || 
                     target.closest('.add-more-images-btn') ||
                     target.closest('.image-preview-item') ||
                     target.closest('input') ||
                     target.closest('textarea') ||
                     target.closest('button') ||
                     target.closest('label');
    
    if (!isAllowed) {
        e.stopPropagation();
    }
});

// Обработка формы
if (projectForm) {
    projectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Form submitted, currentEditId:', currentEditId);
        
        const title = document.getElementById('projectTitle')?.value?.trim() || '';
        const description = document.getElementById('projectDescription')?.value?.trim() || '';
        const link = document.getElementById('projectLink')?.value?.trim() || '';
        const imageFiles = projectImages ? Array.from(projectImages.files) : [];
        const hasPreviewImages = Array.isArray(previewImagesData) && previewImagesData.length > 0;
        
        // Валидация полей
        if (!title) {
            alert(t('titleLabel') + ' ' + (currentLanguage === 'ru' ? 'обязательно для заполнения' : 'is required'));
            document.getElementById('projectTitle')?.focus();
            return;
        }
        
        if (!description) {
            alert(t('descriptionLabel') + ' ' + (currentLanguage === 'ru' ? 'обязательно для заполнения' : 'is required'));
            document.getElementById('projectDescription')?.focus();
            return;
        }
        
        // Проверка для нового проекта
        if (!hasPreviewImages && imageFiles.length === 0 && currentEditId === null) {
            alert(currentLanguage === 'ru' ? 'Пожалуйста, выберите хотя бы одно изображение' : 'Please select at least one image');
            return;
        }
        
        if (hasPreviewImages) {
            console.log('Saving with preview images:', previewImagesData.length);
            await saveProject(title, description, link, previewImagesData);
            return;
        }
        
        // Если выбраны новые изображения
        if (imageFiles.length > 0) {
            console.log('Reading new image files:', imageFiles.length);
            const { successful, failed } = await readFilesAsDataUrls(imageFiles);
            if (successful.length === 0) {
                console.error('All image reads failed', failed);
                alert(currentLanguage === 'ru' ? 'Ошибка при чтении изображений' : 'Error reading images');
                return;
            }
            if (failed.length > 0) {
                console.warn('Some images failed to read', failed);
                showNotification(currentLanguage === 'ru' ? 'Некоторые изображения не удалось прочитать' : 'Some images could not be read', 'error');
            }

            console.log('Images read, saving project');
            await saveProject(title, description, link, successful);
            return;
        }
        
        // Если дошли сюда, значит что-то пошло не так
        alert(currentLanguage === 'ru' ? 'Ошибка: не удалось определить изображения для сохранения' : 'Error: Could not determine images to save');
        console.error('Failed to save: no images found');
    });
}

async function saveProject(title, description, link, imagesData) {
    console.log('saveProject called with:', { title, description, link, imagesCount: imagesData?.length, currentEditId });
    
    // imagesData может быть массивом или одним изображением (для обратной совместимости)
    const images = Array.isArray(imagesData) ? imagesData : [imagesData];
    
    if (images.length === 0) {
        alert(currentLanguage === 'ru' ? 'Ошибка: нет изображений для сохранения' : 'Error: No images to save');
        return;
    }
    
    // Определяем главное изображение
    const mainIndex = mainImageIndex >= 0 && mainImageIndex < images.length ? mainImageIndex : 0;
    
    // Определяем язык введенного текста
    const inputLang = detectLanguage(title + ' ' + description);
    const targetLang = inputLang === 'ru' ? 'en' : 'ru';
    
    // Если редактируем существующий проект, сохраняем существующие переводы
    let existingTranslations = {};
    if (currentEditId !== null) {
        const existingProject = projects[currentEditId];
        if (existingProject.title && typeof existingProject.title === 'object') {
            existingTranslations.title = { ...existingProject.title };
        }
        if (existingProject.description && typeof existingProject.description === 'object') {
            existingTranslations.description = { ...existingProject.description };
        }
    }
    
    // Автоматически переводим текст на другой язык
    console.log(`Detected input language: ${inputLang}, translating to: ${targetLang}`);
    showNotification(currentLanguage === 'ru' ? 'Перевожу проект...' : 'Translating project...', 'info');
    
    const [translatedTitle, translatedDescription] = await Promise.all([
        translateText(title, targetLang),
        translateText(description, targetLang)
    ]);

    const titleTranslatedOk = isTranslationUsable(title, translatedTitle, targetLang);
    const descriptionTranslatedOk = isTranslationUsable(description, translatedDescription, targetLang);

    const titleTranslations = {
        ...(existingTranslations.title || {}),
        [inputLang]: title
    };
    if (titleTranslatedOk) {
        titleTranslations[targetLang] = translatedTitle;
    }

    const descriptionTranslations = {
        ...(existingTranslations.description || {}),
        [inputLang]: description
    };
    if (descriptionTranslatedOk) {
        descriptionTranslations[targetLang] = translatedDescription;
    }

    const pendingTranslations = {};
    if (currentEditId !== null) {
        const existingProject = projects[currentEditId];
        if (existingProject && existingProject.translationPending) {
            if (existingProject.translationPending.title) {
                pendingTranslations.title = { ...existingProject.translationPending.title };
            }
            if (existingProject.translationPending.description) {
                pendingTranslations.description = { ...existingProject.translationPending.description };
            }
        }
    }

    if (!titleTranslatedOk) {
        pendingTranslations.title = { from: inputLang, to: targetLang };
    } else if (pendingTranslations.title && pendingTranslations.title.to === targetLang) {
        delete pendingTranslations.title;
    }

    if (!descriptionTranslatedOk) {
        pendingTranslations.description = { from: inputLang, to: targetLang };
    } else if (pendingTranslations.description && pendingTranslations.description.to === targetLang) {
        delete pendingTranslations.description;
    }

    if (pendingTranslations.title && pendingTranslations.title.to === inputLang) {
        delete pendingTranslations.title;
    }
    if (pendingTranslations.description && pendingTranslations.description.to === inputLang) {
        delete pendingTranslations.description;
    }
    
    // Сохраняем проект с переводами
    const nowIso = new Date().toISOString();
    const project = {
        id: currentEditId !== null ? projects[currentEditId].id : Date.now(),
        // Сохраняем переводы в структуре (обновляем только текущий язык, сохраняем другой)
        title: titleTranslations,
        description: descriptionTranslations,
        link: link || null,
        images: images, // Сохраняем массив изображений
        image: images[mainIndex], // Главное изображение для обратной совместимости
        mainImageIndex: mainIndex, // Сохраняем индекс главного изображения
        date: currentEditId !== null ? (projects[currentEditId].date || nowIso) : nowIso,
        updatedAt: nowIso,
        ...(Object.keys(pendingTranslations).length > 0 ? { translationPending: pendingTranslations } : {})
    };
    
    if (currentEditId !== null) {
        projects[currentEditId] = project;
        console.log('Project updated at index:', currentEditId);
    } else {
        projects.push(project);
        console.log('New project added');
    }
    
    await saveProjects();
    renderProjects();
    
    if (projectModal) {
        projectModal.classList.remove('active');
    }
    
    resetForm();
    
    const translationSuccess = titleTranslatedOk && descriptionTranslatedOk;
    if (!translationSuccess) {
        showNotification(
            currentLanguage === 'ru'
                ? 'Проект сохранен, перевод недоступен. Попробуйте позже.'
                : 'Project saved, translation unavailable. Try again later.',
            'error'
        );
    } else {
        showNotification(currentLanguage === 'ru' ? 'Проект сохранен и переведен!' : 'Project saved and translated!', 'success');
    }
    console.log('Project saved successfully with translations');
}

function resetForm() {
    projectForm.reset();
    imagePreview.innerHTML = `<label for="projectImages" class="upload-placeholder" id="uploadPlaceholder">${t('selectImages')}</label>`;
    imagePreview.classList.remove('has-images');
    const addMoreBtn = document.getElementById('addMoreImagesBtn');
    if (addMoreBtn) addMoreBtn.style.display = 'none';
    // Восстанавливаем обработчик клика на placeholder
    setupUploadPlaceholder();
    currentEditId = null;
    currentProjectImages = [];
    currentImageIndex = 0;
    previewImagesData = [];
    mainImageIndex = 0;
}

// Глобальные функции для onclick
window.viewProject = viewProject;
window.editProject = editProject;
window.deleteProject = deleteProject;

// Обработчик кнопки переключения языка
function setupLanguageButton() {
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
        // Удаляем старый обработчик, если есть
        const newLangBtn = langBtn.cloneNode(true);
        langBtn.parentNode.replaceChild(newLangBtn, langBtn);
        
        // Добавляем новый обработчик
        newLangBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            console.log('Language button clicked, current language:', currentLanguage);
            const newLang = currentLanguage === 'en' ? 'ru' : 'en';
            setLanguage(newLang);
        });
        
        // Убеждаемся, что кнопка кликабельна
        newLangBtn.style.pointerEvents = 'auto';
        newLangBtn.style.cursor = 'pointer';
        newLangBtn.style.zIndex = '100';
    } else {
        console.error('langBtn not found');
    }
}

function setupHeaderOffset() {
    const header = document.querySelector('.header');
    if (!header) {
        return;
    }

    const setOffset = () => {
        const isMobile = window.matchMedia('(max-width: 768px)').matches;
        const offset = isMobile ? 0 : header.offsetHeight;
        document.documentElement.style.setProperty('--header-offset', `${offset}px`);
    };

    setOffset();

    if (typeof ResizeObserver !== 'undefined') {
        const observer = new ResizeObserver(setOffset);
        observer.observe(header);
    }

    window.addEventListener('resize', setOffset);
}


// Инициализация
// Ждем загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        setupHeaderOffset();
        setupLanguageButton();
        updateLanguageUI();
        checkAuth();
        await loadProjects();
        // Мигрируем старые проекты после загрузки
        await migrateAllProjects();
        updateAllTexts({ skipProjectCards: true });
    });
} else {
    // DOM уже загружен
    setupHeaderOffset();
    setupLanguageButton();
    updateLanguageUI();
    checkAuth();
    (async () => {
        await loadProjects();
        // Мигрируем старые проекты после загрузки
        await migrateAllProjects();
        updateAllTexts();
    })();
}

// Закрытие по Escape и навигация по галерее
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        projectModal.classList.remove('active');
        imageModal.classList.remove('active');
        authModal.classList.remove('active');
        resetForm();
        authForm.reset();
        authStatus.style.display = 'none';
    }
    
    // Навигация по галерее стрелками
    if (imageModal.classList.contains('active')) {
        if (e.key === 'ArrowLeft' && currentImageIndex > 0) {
            currentImageIndex--;
            updateGalleryControls();
        } else if (e.key === 'ArrowRight' && currentImageIndex < currentProjectImages.length - 1) {
            currentImageIndex++;
            updateGalleryControls();
        }
    }
});

