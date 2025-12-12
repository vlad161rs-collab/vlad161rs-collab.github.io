// Состояние приложения
let projects = [];
let currentEditId = null;
let isAuthenticated = false;

// Пароль администратора (можно изменить)
// Для безопасности в реальном проекте используйте хеширование и серверную проверку
const ADMIN_PASSWORD = 'admin123'; // Измените на свой пароль

// Элементы DOM
const portfolioGrid = document.getElementById('portfolioGrid');
const emptyState = document.getElementById('emptyState');
const addBtn = document.getElementById('addBtn');
const authBtn = document.getElementById('authBtn');
const authBtnText = document.getElementById('authBtnText');
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

// Загрузка проектов из localStorage
function loadProjects() {
    const saved = localStorage.getItem('portfolioProjects');
    if (saved) {
        projects = JSON.parse(saved);
        renderProjects();
    }
}

// Сохранение проектов в localStorage
function saveProjects() {
    localStorage.setItem('portfolioProjects', JSON.stringify(projects));
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
        <button class="btn-icon" onclick="editProject(${index})">
            ✏️ Редактировать
        </button>
        <button class="btn-icon delete" onclick="deleteProject(${index})">
            🗑️ Удалить
        </button>
    ` : '';
    
    // Используем первое изображение как превью, или первое из массива
    const previewImage = Array.isArray(project.images) && project.images.length > 0 
        ? project.images[0] 
        : (project.image || (project.images && project.images[0]));
    
    card.innerHTML = `
        <img src="${previewImage}" alt="${project.title}" class="portfolio-item-image">
        <div class="portfolio-item-content">
            <h3 class="portfolio-item-title">${project.title}</h3>
            <p class="portfolio-item-description">${project.description}</p>
            <div class="portfolio-item-actions">
                <button class="btn-icon" onclick="viewProject(${index})">
                    👁️ View
                </button>
                ${adminActions}
            </div>
        </div>
    `;
    
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
    currentImageIndex = 0;
    
    // Очищаем галерею и добавляем изображения
    imageGallery.innerHTML = '';
    images.forEach((imgSrc, idx) => {
        const img = document.createElement('img');
        img.src = imgSrc;
        img.alt = `${project.title} - Image ${idx + 1}`;
        if (idx === 0) img.classList.add('active');
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
    displayImagePreviews(images);
    
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
        authBtn.classList.add('logged-in');
        authBtnText.textContent = '🔓 Logout';
    } else {
        addBtn.style.display = 'none';
        authBtn.classList.remove('logged-in');
        authBtnText.textContent = '🔐 Login';
    }
    renderProjects();
}

// Показать модальное окно авторизации
function showAuthModal() {
    authModal.classList.add('active');
    document.getElementById('adminPassword').focus();
    authStatus.style.display = 'none';
    authForm.reset();
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
function displayImagePreviews(images) {
    if (!images || images.length === 0) {
        imagePreview.innerHTML = '<span>Выберите изображения</span>';
        return;
    }
    
    imagePreview.innerHTML = '';
    images.forEach((imgSrc, index) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'image-preview-item';
        previewItem.innerHTML = `
            <img src="${imgSrc}" alt="Preview ${index + 1}">
            <button type="button" class="remove-image" onclick="removePreviewImage(${index})">×</button>
        `;
        imagePreview.appendChild(previewItem);
    });
}

// Хранилище для превью изображений
let previewImagesData = [];

// Удаление изображения из превью
window.removePreviewImage = function(index) {
    // Удаляем из массива данных
    previewImagesData.splice(index, 1);
    
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
        imagePreview.innerHTML = '<span>Выберите изображения</span>';
    } else {
        displayImagePreviews(previewImagesData);
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
    imagePreview.innerHTML = '<span>Выберите изображения</span>';
    projectModal.classList.add('active');
});

// Кнопка авторизации
authBtn.addEventListener('click', () => {
    if (isAuthenticated) {
        if (confirm('Вы уверены, что хотите выйти?')) {
            logout();
        }
    } else {
        showAuthModal();
    }
});

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
projectImages.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) {
        imagePreview.innerHTML = '<span>Выберите изображения</span>';
        previewImagesData = [];
        return;
    }
    
    const readers = files.map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.readAsDataURL(file);
        });
    });
    
    Promise.all(readers).then(results => {
        previewImagesData = results;
        displayImagePreviews(results);
    });
});

// Обработка формы
projectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const title = document.getElementById('projectTitle').value;
    const description = document.getElementById('projectDescription').value;
    const link = document.getElementById('projectLink').value;
    const imageFiles = Array.from(projectImages.files);
    
    if (imageFiles.length === 0 && !currentEditId) {
        alert('Пожалуйста, выберите хотя бы одно изображение');
        return;
    }
    
    // Если редактируем и не выбрано новое изображение, используем старые
    if (currentEditId !== null && imageFiles.length === 0) {
        const project = projects[currentEditId];
        const existingImages = Array.isArray(project.images) && project.images.length > 0 
            ? project.images 
            : (project.image ? [project.image] : []);
        saveProject(title, description, link, existingImages);
    } else {
        // Читаем все выбранные файлы
        const readers = imageFiles.map(file => {
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = (event) => resolve(event.target.result);
                reader.readAsDataURL(file);
            });
        });
        
        Promise.all(readers).then(imageDataArray => {
            saveProject(title, description, link, imageDataArray);
        });
    }
});

function saveProject(title, description, link, imagesData) {
    // imagesData может быть массивом или одним изображением (для обратной совместимости)
    const images = Array.isArray(imagesData) ? imagesData : [imagesData];
    
    const project = {
        id: currentEditId !== null ? projects[currentEditId].id : Date.now(),
        title,
        description,
        link: link || null,
        images: images, // Сохраняем массив изображений
        image: images[0], // Для обратной совместимости сохраняем первое изображение
        date: currentEditId !== null ? projects[currentEditId].date : new Date().toISOString()
    };
    
    if (currentEditId !== null) {
        projects[currentEditId] = project;
    } else {
        projects.push(project);
    }
    
    saveProjects();
    renderProjects();
    projectModal.classList.remove('active');
    resetForm();
}

function resetForm() {
    projectForm.reset();
    imagePreview.innerHTML = '<span>Выберите изображения</span>';
    currentEditId = null;
    currentProjectImages = [];
    currentImageIndex = 0;
    previewImagesData = [];
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

