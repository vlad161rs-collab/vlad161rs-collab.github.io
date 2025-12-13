// Состояние приложения
let projects = [];
let currentEditId = null;
let isAuthenticated = false;

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
                            console.log(`Loaded ${projects.length} project(s) from localStorage:`, projects.map(p => p.title));
                            renderProjects();
                            // Предлагаем миграцию
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
            if (confirm(`Найдено ${projects.length} проект(ов) в локальном хранилище. Сохранить их на сервер сейчас?`)) {
                migrateToServer();
            }
        }, 500);
    } else if (projects.length > 0) {
        // Если токена нет, предлагаем настроить
        setTimeout(() => {
            if (confirm(`Найдено ${projects.length} проект(ов) в локальном хранилище. Для сохранения на сервер нужен GitHub Token. Настроить сейчас?`)) {
                showGitHubTokenPrompt();
            }
        }, 500);
    }
}

// Миграция данных из localStorage на сервер
async function migrateToServer() {
    if (projects.length === 0) {
        showNotification('Нет проектов для миграции', 'info');
        return;
    }
    
    const token = getGitHubToken();
    if (!token) {
        showNotification('Требуется GitHub Token для миграции', 'error');
        showGitHubTokenPrompt();
        return;
    }
    
    showNotification('Миграция проектов на сервер...', 'info');
    try {
        await saveProjects();
        showNotification(`Успешно мигрировано ${projects.length} проект(ов) на сервер!`, 'success');
    } catch (error) {
        console.error('Migration error:', error);
        showNotification('Ошибка при миграции. Попробуйте позже.', 'error');
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
            const errorMsg = `Файл слишком большой (${contentSizeMB} MB). GitHub API ограничивает размер файлов. Попробуйте уменьшить количество или размер изображений.`;
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
                                showNotification(`Внимание: На сервере сохранено ${savedProjects.length} из ${projects.length} проектов. Попробуйте сохранить снова.`, 'error');
                                
                                // Пытаемся сохранить снова
                                console.log('Retrying save...');
                                await saveProjects();
                            } else {
                                console.log('Verification successful: All projects saved correctly');
                                showNotification(`Проекты успешно сохранены и проверены на сервере! (${projects.length} проект(ов), ${contentSizeMB} MB)`, 'success');
                            }
                        } else {
                            console.warn('Could not verify save - file may not be accessible yet');
                            showNotification(`Проекты сохранены на сервере! (${projects.length} проект(ов), ${contentSizeMB} MB)`, 'success');
                        }
                    } catch (verifyError) {
                        console.error('Error verifying save:', verifyError);
                        showNotification(`Проекты сохранены на сервере! (${projects.length} проект(ов))`, 'success');
                    }
                }, 2000); // Проверяем через 2 секунды
                
            } catch (e) {
                console.log('Response is not JSON, but status is OK');
                showNotification(`Проекты сохранены на сервере! (${projects.length} проект(ов))`, 'success');
            }
        } else {
            let errorMessage = 'Unknown error';
            try {
                const errorData = JSON.parse(responseText);
                errorMessage = errorData.message || errorData.error || JSON.stringify(errorData);
                console.error('Failed to save to GitHub:', errorData);
                
                // Специальная обработка для ошибок размера
                if (errorMessage.includes('size') || errorMessage.includes('too large') || response.status === 413) {
                    errorMessage = `Файл слишком большой (${contentSizeMB} MB). GitHub API не может обработать файлы больше ~50MB. Попробуйте уменьшить количество или размер изображений.`;
                }
            } catch (e) {
                errorMessage = responseText.substring(0, 200) || `HTTP ${response.status}`;
                console.error('Failed to parse error response:', e);
            }
            
            console.error('Response status:', response.status);
            console.error('Error message:', errorMessage);
            showNotification(`Ошибка при сохранении: ${errorMessage}. Данные сохранены локально.`, 'error');
        }
    } catch (error) {
        console.error('Error saving to GitHub:', error);
        showNotification('Ошибка при сохранении на сервер. Данные сохранены локально.', 'error');
    }
}

// Показать запрос на ввод GitHub Token
function showGitHubTokenPrompt() {
    const token = getGitHubToken();
    const message = token 
        ? 'Токен GitHub найден. Хотите изменить его?'
        : 'Для сохранения проектов на сервере нужен GitHub Personal Access Token.';
    
    const userToken = prompt(
        message + '\n\n' +
        'Инструкция:\n' +
        '1. Перейдите на https://github.com/settings/tokens\n' +
        '2. Создайте новый токен (classic)\n' +
        '3. Дайте права: repo (полный доступ к репозиториям)\n' +
        '4. Вставьте токен ниже\n\n' +
        'Токен (оставьте пустым для отмены):',
        token || ''
    );
    
    if (userToken !== null && userToken.trim()) {
        setGitHubToken(userToken.trim());
        showNotification('Токен сохранен! Теперь проекты будут сохраняться на сервере.', 'success');
        
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
                        if (confirm(`Найдено ${projects.length} проект(ов) в локальном хранилище. Сохранить их на сервер сейчас?`)) {
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
            ✏️ Редактировать
        </button>
        <button class="btn-icon delete" onclick="event.stopPropagation(); deleteProject(${index})">
            🗑️ Удалить
        </button>
    ` : '';
    
    // Используем главное изображение или первое из массива
    const images = Array.isArray(project.images) && project.images.length > 0 
        ? project.images 
        : (project.image ? [project.image] : []);
    
    // Определяем главное изображение
    const mainIndex = project.mainImageIndex !== undefined ? project.mainImageIndex : 0;
    const previewImage = images[mainIndex] || images[0] || project.image;
    
    card.innerHTML = `
        <img src="${previewImage}" alt="${project.title}" class="portfolio-item-image">
        <div class="portfolio-item-content">
            <h3 class="portfolio-item-title">${project.title}</h3>
            <p class="portfolio-item-description">${project.description}</p>
            <div class="portfolio-item-actions">
                <button class="btn-icon" onclick="event.stopPropagation(); viewProject(${index})">
                    👁️ View
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
    
    // Очищаем галерею и добавляем изображения
    imageGallery.innerHTML = '';
    images.forEach((imgSrc, idx) => {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `${project.title} - Image ${idx + 1}`;
        if (idx === currentImageIndex) img.classList.add('active');
        imageGallery.appendChild(img);
    });
    
    updateGalleryControls();
    
    imageInfo.innerHTML = `
        <h3>${project.title}</h3>
        <p>${project.description}</p>
        ${project.link ? `<a href="${project.link}" target="_blank" style="color: var(--primary); margin-top: 1rem; display: inline-block;">Open Project →</a>` : ''}
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
    currentEditId = index;
    
    modalTitle.textContent = 'Редактировать проект';
    document.getElementById('projectTitle').value = project.title;
    document.getElementById('projectDescription').value = project.description;
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
    
    if (confirm('Вы уверены, что хотите удалить этот проект?')) {
        projects.splice(index, 1);
        saveProjects();
        renderProjects();
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
        authStatus.textContent = 'Неверный пароль';
        authStatus.className = 'auth-status error';
        authStatus.style.display = 'block';
        return false;
    }
}

// Отображение превью изображений
function displayImagePreviews(images, currentMainIndex = 0) {
    const addMoreBtn = document.getElementById('addMoreImagesBtn');
    
    if (!images || images.length === 0) {
        imagePreview.innerHTML = '<label for="projectImages" class="upload-placeholder" id="uploadPlaceholder">Выберите изображения</label>';
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
            <span class="main-badge">Главное</span>
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
        imagePreview.innerHTML = '<label for="projectImages" class="upload-placeholder" id="uploadPlaceholder">Выберите изображения</label>';
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
    modalTitle.textContent = 'Добавить проект';
    projectForm.reset();
    imagePreview.innerHTML = '<span class="upload-placeholder" id="uploadPlaceholder">Выберите изображения</span>';
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
            if (confirm('Вы уверены, что хотите выйти?')) {
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
                imagePreview.innerHTML = '<label for="projectImages" class="upload-placeholder" id="uploadPlaceholder">Выберите изображения</label>';
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
            alert('Пожалуйста, введите название проекта');
            document.getElementById('projectTitle')?.focus();
            return;
        }
        
        if (!description) {
            alert('Пожалуйста, введите описание проекта');
            document.getElementById('projectDescription')?.focus();
            return;
        }
        
        // Проверка для нового проекта
        if (imageFiles.length === 0 && currentEditId === null) {
            alert('Пожалуйста, выберите хотя бы одно изображение');
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
                    alert('Проект не найден');
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
            
            Promise.all(readers).then(imageDataArray => {
                console.log('Images read, saving project');
                saveProject(title, description, link, imageDataArray);
            }).catch(error => {
                console.error('Error reading images:', error);
                alert('Ошибка при чтении изображений');
            });
            return;
        }
        
        // Если дошли сюда, значит что-то пошло не так
        alert('Ошибка: не удалось определить изображения для сохранения');
        console.error('Failed to save: no images found');
    });
}

function saveProject(title, description, link, imagesData) {
    console.log('saveProject called with:', { title, description, link, imagesCount: imagesData?.length, currentEditId });
    
    // imagesData может быть массивом или одним изображением (для обратной совместимости)
    const images = Array.isArray(imagesData) ? imagesData : [imagesData];
    
    if (images.length === 0) {
        alert('Ошибка: нет изображений для сохранения');
        return;
    }
    
    // Определяем главное изображение
    const mainIndex = mainImageIndex >= 0 && mainImageIndex < images.length ? mainImageIndex : 0;
    
    const project = {
        id: currentEditId !== null ? projects[currentEditId].id : Date.now(),
        title,
        description,
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
    
    saveProjects();
    renderProjects();
    
    if (projectModal) {
        projectModal.classList.remove('active');
    }
    
    resetForm();
    
    console.log('Project saved successfully');
}

function resetForm() {
    projectForm.reset();
    imagePreview.innerHTML = '<label for="projectImages" class="upload-placeholder" id="uploadPlaceholder">Выберите изображения</label>';
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

// Инициализация
checkAuth();
loadProjects();

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

