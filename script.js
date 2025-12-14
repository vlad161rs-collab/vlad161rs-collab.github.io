// Состояние приложения
let projects = [];
let currentEditId = null;
let isAuthenticated = false;
let currentLanguage = localStorage.getItem('portfolioLanguage') || 'en'; // 'en' или 'ru'

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
    if (project[field] && typeof project[field] === 'object' && project[field][currentLanguage]) {
        let text = project[field][currentLanguage];
        // Проверяем, не является ли текст ошибкой API
        if (text && (text.includes('QUERY LENGTH LIMIT') || text.includes('MAX ALLOWED QUERY'))) {
            // Если это ошибка, пытаемся получить исходный текст на другом языке
            const otherLang = currentLanguage === 'ru' ? 'en' : 'ru';
            if (project[field][otherLang] && !project[field][otherLang].includes('QUERY LENGTH LIMIT')) {
                return project[field][otherLang];
            }
            // Если оба языка содержат ошибку, возвращаем пустую строку
            return '';
        }
        return text;
    }
    // Если есть переводы в старом формате (title_en, title_ru)
    if (project[`${field}_${currentLanguage}`]) {
        const text = project[`${field}_${currentLanguage}`];
        if (text && (text.includes('QUERY LENGTH LIMIT') || text.includes('MAX ALLOWED QUERY'))) {
            return '';
        }
        return text;
    }
    // Если есть переводы в новом формате (translations)
    if (project.translations && project.translations[field] && project.translations[field][currentLanguage]) {
        const text = project.translations[field][currentLanguage];
        if (text && (text.includes('QUERY LENGTH LIMIT') || text.includes('MAX ALLOWED QUERY'))) {
            return '';
        }
        return text;
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

// Автоматический перевод текста через API
// СТРОГИЙ КОНТРОЛЬ ДЛИНЫ URL: лимит API = 500 символов для всего URL
async function translateText(text, targetLang) {
    if (!text || text.trim() === '') return '';
    
    // Определяем исходный язык
    const sourceLang = targetLang === 'ru' ? 'en' : 'ru';
    
    // Базовый URL: "https://api.mymemory.translated.net/get?q=" = 43 символа
    // + "&langpair=en|ru" = 15 символов
    // Итого: 58 символов базового URL
    // Остается: 500 - 58 = 442 символа для закодированного текста
    // encodeURIComponent может увеличить длину в 3 раза для спецсимволов
    // Безопасный лимит: 442 / 3 = ~147, но берем 100 для гарантии
    const BASE_URL_LENGTH = 58;
    const MAX_URL_LENGTH = 500;
    const MAX_ENCODED_TEXT_LENGTH = MAX_URL_LENGTH - BASE_URL_LENGTH; // 442
    const MAX_TEXT_LENGTH = 100; // Консервативный лимит для исходного текста
    
    try {
        // Всегда разбиваем текст на части для гарантии
        return await translateLongText(text, sourceLang, targetLang, MAX_TEXT_LENGTH, MAX_ENCODED_TEXT_LENGTH);
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}

// Перевод длинного текста по частям с строгим контролем длины
async function translateLongText(text, sourceLang, targetLang, maxTextLength, maxEncodedLength) {
    if (!text || text.trim() === '') return '';
    
    console.log(`Translating text (${text.length} chars), splitting into safe chunks...`);
    
    // Разбиваем на слова для точного контроля
    const words = text.split(/(\s+)/);
    const translatedParts = [];
    let currentChunk = '';
    
    for (let i = 0; i < words.length; i++) {
        const word = words[i];
        const testChunk = currentChunk ? currentChunk + word : word;
        
        // Проверяем длину исходного текста
        if (testChunk.length > maxTextLength) {
            // Переводим накопленный chunk
            if (currentChunk.trim()) {
                const translated = await translateTextChunkSafe(currentChunk.trim(), sourceLang, targetLang, maxEncodedLength);
                translatedParts.push(translated);
            }
            currentChunk = word;
        } else {
            // Проверяем длину закодированного текста
            const encoded = encodeURIComponent(testChunk);
            if (encoded.length > maxEncodedLength) {
                // Переводим накопленный chunk
                if (currentChunk.trim()) {
                    const translated = await translateTextChunkSafe(currentChunk.trim(), sourceLang, targetLang, maxEncodedLength);
                    translatedParts.push(translated);
                }
                currentChunk = word;
            } else {
                currentChunk = testChunk;
            }
        }
    }
    
    // Переводим последний chunk
    if (currentChunk.trim()) {
        const translated = await translateTextChunkSafe(currentChunk.trim(), sourceLang, targetLang, maxEncodedLength);
        translatedParts.push(translated);
    }
    
    return translatedParts.join(' ');
}

// Безопасный перевод части текста с гарантией длины URL < 500
async function translateTextChunkSafe(chunk, sourceLang, targetLang, maxEncodedLength) {
    if (!chunk || chunk.trim() === '') return '';
    
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
                translateTextChunkSafe(part1, sourceLang, targetLang, maxEncodedLength),
                translateTextChunkSafe(part2, sourceLang, targetLang, maxEncodedLength)
            ]);
            return (translated1 + ' ' + translated2).trim();
        } else if (part1) {
            return await translateTextChunkSafe(part1, sourceLang, targetLang, maxEncodedLength);
        } else if (part2) {
            return await translateTextChunkSafe(part2, sourceLang, targetLang, maxEncodedLength);
        }
        return chunk;
    }
    
    // URL безопасной длины - выполняем запрос
    try {
        const response = await fetch(fullUrl);
        
        if (response.ok) {
            const data = await response.json();
            if (data.responseData && data.responseData.translatedText) {
                return data.responseData.translatedText;
            }
        } else {
            const errorText = await response.text();
            if (errorText.includes('QUERY LENGTH LIMIT')) {
                console.error('API still reports length limit, splitting further...');
                // Еще больше разбиваем
                const midPoint = Math.floor(chunk.length / 2);
                const part1 = chunk.substring(0, midPoint).trim();
                const part2 = chunk.substring(midPoint).trim();
                if (part1 && part2) {
                    const [translated1, translated2] = await Promise.all([
                        translateTextChunkSafe(part1, sourceLang, targetLang, maxEncodedLength),
                        translateTextChunkSafe(part2, sourceLang, targetLang, maxEncodedLength)
                    ]);
                    return (translated1 + ' ' + translated2).trim();
                }
            } else {
                console.error('Translation API error:', response.status, errorText.substring(0, 100));
            }
        }
    } catch (error) {
        console.error('Translation chunk error:', error);
    }
    
    // Если перевод не удался, возвращаем исходный chunk
    // ВАЖНО: Никогда не возвращаем сообщения об ошибках как текст перевода
    if (chunk.includes('QUERY LENGTH LIMIT') || chunk.includes('MAX ALLOWED QUERY')) {
        console.error('Chunk contains error message, returning empty to prevent error text in UI');
        return '';
    }
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
        
        updateAllTexts();
    }
}

// Миграция всех проектов без переводов
async function migrateAllProjects() {
    console.log('Checking projects for translation migration...');
    let needsSave = false;
    
    for (let i = 0; i < projects.length; i++) {
        const project = projects[i];
        
        // Проверяем title
        if (!project.title || typeof project.title !== 'object' || !project.title.en || !project.title.ru) {
            const originalTitle = typeof project.title === 'string' ? project.title : (project.title?.en || project.title?.ru || '');
            if (originalTitle && originalTitle.trim() !== '') {
                const sourceLang = detectLanguage(originalTitle);
                const targetLang = sourceLang === 'ru' ? 'en' : 'ru';
                
                if (!project.title || typeof project.title !== 'object' || !project.title[targetLang]) {
                    console.log(`Migrating title for project ${i}: ${originalTitle.substring(0, 30)}...`);
                    const translatedTitle = await translateText(originalTitle, targetLang);
                    
                    // Проверяем, что перевод не содержит ошибку API
                    const cleanTranslatedTitle = (translatedTitle && !translatedTitle.includes('QUERY LENGTH LIMIT') && !translatedTitle.includes('MAX ALLOWED QUERY'))
                        ? translatedTitle
                        : originalTitle; // Если перевод содержит ошибку, используем исходный текст
                    
                    if (!project.title || typeof project.title !== 'object') {
                        project.title = {};
                    }
                    project.title[sourceLang] = originalTitle;
                    project.title[targetLang] = cleanTranslatedTitle;
                    needsSave = true;
                }
            }
        }
        
        // Проверяем description
        if (!project.description || typeof project.description !== 'object' || !project.description.en || !project.description.ru) {
            const originalDesc = typeof project.description === 'string' ? project.description : (project.description?.en || project.description?.ru || '');
            if (originalDesc && originalDesc.trim() !== '') {
                const sourceLang = detectLanguage(originalDesc);
                const targetLang = sourceLang === 'ru' ? 'en' : 'ru';
                
                if (!project.description || typeof project.description !== 'object' || !project.description[targetLang]) {
                    console.log(`Migrating description for project ${i}: ${originalDesc.substring(0, 30)}...`);
                    const translatedDesc = await translateText(originalDesc, targetLang);
                    
                    // Проверяем, что перевод не содержит ошибку API
                    const cleanTranslatedDesc = (translatedDesc && !translatedDesc.includes('QUERY LENGTH LIMIT') && !translatedDesc.includes('MAX ALLOWED QUERY'))
                        ? translatedDesc
                        : originalDesc; // Если перевод содержит ошибку, используем исходный текст
                    
                    if (!project.description || typeof project.description !== 'object') {
                        project.description = {};
                    }
                    project.description[sourceLang] = originalDesc;
                    project.description[targetLang] = cleanTranslatedDesc;
                    needsSave = true;
                }
            }
        }
    }
    
    if (needsSave) {
        console.log('Saving migrated projects...');
        await saveProjects();
        showNotification(currentLanguage === 'ru' ? 'Проекты переведены!' : 'Projects translated!', 'success');
    }
}

// Обновление UI переключения языка
function updateLanguageUI() {
    const langBtn = document.getElementById('langBtn');
    if (langBtn) {
        const span = langBtn.querySelector('span');
        if (span) {
            span.textContent = currentLanguage === 'en' ? '🇷🇺 RU' : '🇬🇧 EN';
        } else {
            langBtn.textContent = currentLanguage === 'en' ? '🇷🇺 RU' : '🇬🇧 EN';
        }
        langBtn.title = currentLanguage === 'en' ? 'Switch to Russian' : 'Переключить на английский';
    }
}

// Обновление всех текстов на странице
function updateAllTexts() {
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
    
    // Перерисовка карточек проектов для обновления переводов
    renderProjects();
}

// Пароль администратора (можно изменить)
// Для безопасности в реальном проекте используйте хеширование и серверную проверку
const ADMIN_PASSWORD = 'admin123'; // Измените на свой пароль

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
    try {
        const response = await fetch('data/projects.json?t=' + Date.now()); // Добавляем timestamp для избежания кэша
        if (response.ok) {
            const data = await response.json();
            console.log(`Loaded ${Array.isArray(data) ? data.length : 0} project(s) from server`);
            
            // Если файл пустой, проверяем localStorage
            if (Array.isArray(data) && data.length > 0) {
                projects = data;
                console.log('Projects from server:', projects.map(p => p.title));
                renderProjects();
                
                // Проверяем, есть ли в localStorage больше проектов
                const saved = localStorage.getItem('portfolioProjects');
                if (saved) {
                    try {
                        const localProjects = JSON.parse(saved);
                        if (Array.isArray(localProjects) && localProjects.length > data.length) {
                            console.log(`Found more projects in localStorage (${localProjects.length}) than on server (${data.length}). Merging...`);
                            // Объединяем проекты (приоритет у серверных, добавляем только новые из localStorage)
                            const serverIds = new Set(data.map(p => p.id));
                            const newProjects = localProjects.filter(p => !serverIds.has(p.id));
                            if (newProjects.length > 0) {
                                projects = [...data, ...newProjects];
                                console.log(`Merged ${newProjects.length} new project(s) from localStorage`);
                                renderProjects();
                                offerMigration();
                            }
                        }
                    } catch (e) {
                        console.error('Error parsing localStorage:', e);
                    }
                }
            } else {
                // Файл пустой, проверяем localStorage
                const saved = localStorage.getItem('portfolioProjects');
                if (saved) {
                    try {
                        const localProjects = JSON.parse(saved);
                        if (Array.isArray(localProjects) && localProjects.length > 0) {
                            projects = localProjects;
                            console.log(`Loaded ${projects.length} project(s) from localStorage:`, projects.map(p => {
                                if (typeof p.title === 'string') return p.title;
                                return p.title?.en || p.title?.ru || 'Unknown';
                            }));
                            renderProjects();
                            
                            // Мигрируем старые проекты (асинхронно, без блокировки UI)
                            setTimeout(() => {
                                migrateOldProjects();
                            }, 1000);
                            
                            // Предлагаем миграцию на сервер
                            offerMigration();
                        } else {
                            projects = [];
                            renderProjects();
                        }
                    } catch (e) {
                        projects = [];
                        renderProjects();
                    }
                } else {
                    projects = [];
                    renderProjects();
                }
            }
        } else {
            console.warn('Failed to load projects.json, checking localStorage');
            loadFromLocalStorage();
        }
    } catch (error) {
        console.error('Error loading projects:', error);
        // Fallback на localStorage если файл не найден
        loadFromLocalStorage();
    }
}

// Загрузка из localStorage
function loadFromLocalStorage() {
    const saved = localStorage.getItem('portfolioProjects');
    if (saved) {
        try {
            projects = JSON.parse(saved);
            renderProjects();
            console.log('Loaded projects from localStorage');
            // Предлагаем миграцию
            offerMigration();
        } catch (e) {
            projects = [];
            renderProjects();
        }
    } else {
        projects = [];
        renderProjects();
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
    const saved = localStorage.getItem('portfolioProjects');
    if (saved) {
        try {
            const localProjects = JSON.parse(saved);
            if (Array.isArray(localProjects) && localProjects.length > projects.length) {
                console.log(`Found more projects in localStorage (${localProjects.length}) than in current array (${projects.length}). Merging...`);
                const currentIds = new Set(projects.map(p => p.id));
                const missingProjects = localProjects.filter(p => !currentIds.has(p.id));
                if (missingProjects.length > 0) {
                    projects = [...projects, ...missingProjects];
                    console.log(`Added ${missingProjects.length} missing project(s) from localStorage:`, missingProjects.map(p => p.title));
                }
            }
        } catch (e) {
            console.error('Error checking localStorage:', e);
        }
    }
    
    console.log(`Final projects array before save: ${projects.length} project(s):`, projects.map(p => p.title));
    
    // Также сохраняем в localStorage как резервную копию
    localStorage.setItem('portfolioProjects', JSON.stringify(projects));
    console.log('Projects saved to localStorage:', projects.length);
    
    const token = getGitHubToken();
    if (!token) {
        console.warn('GitHub token not set. Projects saved to localStorage only.');
        // Показываем уведомление пользователю
        showGitHubTokenPrompt();
        return;
    }
    
    try {
        // Сначала получаем текущий SHA файла (нужно для обновления)
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
            showNotification((currentLanguage === 'ru' ? 'Ошибка при сохранении: ' : 'Error saving: ') + errorMessage + (currentLanguage === 'ru' ? '. Данные сохранены локально.' : '. Data saved locally.'), 'error');
        }
    } catch (error) {
        console.error('Error saving to GitHub:', error);
        showNotification(currentLanguage === 'ru' ? 'Ошибка при сохранении на сервер. Данные сохранены локально.' : 'Error saving to server. Data saved locally.', 'error');
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
        const saved = localStorage.getItem('portfolioProjects');
        if (saved) {
            try {
                const localProjects = JSON.parse(saved);
                if (Array.isArray(localProjects) && localProjects.length > 0 && projects.length === 0) {
                    // Загружаем проекты из localStorage
                    projects = localProjects;
                    renderProjects();
                    // Предлагаем миграцию
                    setTimeout(() => {
                        if (confirm(t('migrationOffer', { count: projects.length }))) {
                            migrateToServer();
                        }
                    }, 500);
                } else {
                    // Сохраняем текущие проекты
                    saveProjects();
                }
            } catch (e) {
                // Просто сохраняем текущие проекты
                saveProjects();
            }
        } else {
            // Сохраняем текущие проекты
            saveProjects();
        }
    }
}

// Показать уведомление
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
    const previewImage = images[mainIndex] || images[0] || project.image;
    
    // Получаем переводы для текущего языка
    const projectTitle = getProjectText(project, 'title');
    const projectDescription = getProjectText(project, 'description');
    
    card.innerHTML = `
        <img src="${previewImage}" alt="${projectTitle}" class="portfolio-item-image">
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
    
    // Удаляем соответствующий файл из input (создаем новый DataTransfer)
    const dt = new DataTransfer();
    const files = Array.from(projectImages.files);
    files.forEach((file, i) => {
        if (i !== index) {
            dt.items.add(file);
        }
    });
    projectImages.files = dt.files;
    
    // Обновляем превью
    if (previewImagesData.length === 0) {
        imagePreview.innerHTML = `<label for="projectImages" class="upload-placeholder" id="uploadPlaceholder">${t('selectImages')}</label>`;
        mainImageIndex = 0;
        imagePreview.classList.remove('has-images');
        const addMoreBtn = document.getElementById('addMoreImagesBtn');
        if (addMoreBtn) addMoreBtn.style.display = 'none';
        // Восстанавливаем обработчик клика на placeholder
        setupUploadPlaceholder();
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

// Предпросмотр изображений
if (projectImages) {
    projectImages.addEventListener('change', (e) => {
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
        
        // Если это первая загрузка, заменяем все
        // Если уже есть изображения, добавляем новые
        const isFirstLoad = previewImagesData.length === 0;
        
        const readers = files.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.readAsDataURL(file);
            });
        });
        
        Promise.all(readers).then(results => {
            if (isFirstLoad) {
                previewImagesData = results;
                mainImageIndex = 0;
            } else {
                // Добавляем новые изображения к существующим
                previewImagesData = [...previewImagesData, ...results];
            }
            displayImagePreviews(previewImagesData, mainImageIndex);
        });
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
    projectForm.addEventListener('submit', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        console.log('Form submitted, currentEditId:', currentEditId);
        
        const title = document.getElementById('projectTitle')?.value?.trim() || '';
        const description = document.getElementById('projectDescription')?.value?.trim() || '';
        const link = document.getElementById('projectLink')?.value?.trim() || '';
        const imageFiles = projectImages ? Array.from(projectImages.files) : [];
        
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
        if (imageFiles.length === 0 && currentEditId === null) {
            alert(currentLanguage === 'ru' ? 'Пожалуйста, выберите хотя бы одно изображение' : 'Please select at least one image');
            return;
        }
        
        // Если редактируем и не выбрано новое изображение, используем изображения из превью
        if (currentEditId !== null && imageFiles.length === 0) {
            // Используем изображения из previewImagesData (уже загружены в превью)
            if (previewImagesData && previewImagesData.length > 0) {
                console.log('Saving with preview images:', previewImagesData.length);
                saveProject(title, description, link, previewImagesData);
                return;
            } else {
                // Если превью пусто, используем старые изображения из проекта
                const project = projects[currentEditId];
                if (project) {
                    const existingImages = Array.isArray(project.images) && project.images.length > 0 
                        ? project.images 
                        : (project.image ? [project.image] : []);
                    console.log('Saving with existing images from project:', existingImages.length);
                    if (existingImages.length > 0) {
                        saveProject(title, description, link, existingImages);
                        return;
                    }
                } else {
                    alert(currentLanguage === 'ru' ? 'Проект не найден' : 'Project not found');
                    return;
                }
            }
        }
        
        // Если выбраны новые изображения
        if (imageFiles.length > 0) {
            // Читаем все выбранные файлы
            console.log('Reading new image files:', imageFiles.length);
            const readers = imageFiles.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (event) => resolve(event.target.result);
                    reader.onerror = (error) => reject(error);
                    reader.readAsDataURL(file);
                });
            });
            
            Promise.all(readers).then(async (imageDataArray) => {
                console.log('Images read, saving project');
                await saveProject(title, description, link, imageDataArray);
            }).catch(error => {
                console.error('Error reading images:', error);
                alert(currentLanguage === 'ru' ? 'Ошибка при чтении изображений' : 'Error reading images');
            });
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
    
    // Сохраняем проект с переводами
    const project = {
        id: currentEditId !== null ? projects[currentEditId].id : Date.now(),
        // Сохраняем переводы в структуре (обновляем только текущий язык, сохраняем другой)
        title: {
            ...(existingTranslations.title || {}),
            [inputLang]: title,
            [targetLang]: translatedTitle
        },
        description: {
            ...(existingTranslations.description || {}),
            [inputLang]: description,
            [targetLang]: translatedDescription
        },
        link: link || null,
        images: images, // Сохраняем массив изображений
        image: images[mainIndex], // Главное изображение для обратной совместимости
        mainImageIndex: mainIndex, // Сохраняем индекс главного изображения
        date: currentEditId !== null ? projects[currentEditId].date : new Date().toISOString()
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
    
    showNotification(currentLanguage === 'ru' ? 'Проект сохранен и переведен!' : 'Project saved and translated!', 'success');
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

// Инициализация
// Ждем загрузки DOM
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        setupLanguageButton();
        updateLanguageUI();
        checkAuth();
        await loadProjects();
        // Мигрируем старые проекты после загрузки
        await migrateAllProjects();
        updateAllTexts();
    });
} else {
    // DOM уже загружен
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

