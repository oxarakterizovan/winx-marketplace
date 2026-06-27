/**
 * WINX Platform - Main JavaScript
 */

// ==================== Initialization ====================

document.addEventListener('DOMContentLoaded', () => {
    initializeLoadingScreen();
    initializeNavbar();
    initializeDropdowns();
    initializeMobileMenu();
    initializeSearch();
    initializeTheme();
    updateUserInterface();
    initializeAnimatedStats();
});

// ==================== Loading Screen ====================

function initializeLoadingScreen() {
    const loadingScreen = document.querySelector('.loading-screen');
    const loadingBar = document.querySelector('.loading-bar');
    
    if (!loadingScreen) return;
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            
            setTimeout(() => {
                loadingScreen.classList.add('hidden');
                document.body.classList.remove('loading');
                
                // Trigger page animations
                document.querySelectorAll('.animate-on-load').forEach((el, index) => {
                    el.classList.add('animate-fade-in-up');
                    el.style.animationDelay = `${index * 0.1}s`;
                });
            }, 500);
        }
        if (loadingBar) {
            loadingBar.style.width = `${progress}%`;
        }
    }, 200);
}

// ==================== Navbar ====================

function initializeNavbar() {
    const navbar = document.querySelector('.navbar');
    
    if (!navbar) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }
    });
}

// ==================== Dropdowns ====================

function initializeDropdowns() {
    // Notifications dropdown
    const notificationsBtn = document.querySelector('.notifications-btn');
    const notificationsDropdown = document.querySelector('.notifications-dropdown');
    
    if (notificationsBtn && notificationsDropdown) {
        notificationsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(notificationsDropdown);
            loadNotifications();
        });
    }
    
    // Profile dropdown
    const profileBtn = document.querySelector('.profile-btn');
    const profileDropdown = document.querySelector('.profile-dropdown');
    
    if (profileBtn && profileDropdown) {
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdown(profileDropdown);
        });
    }
    
    // Close dropdowns on click outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.dropdown.open').forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    });
}

function toggleDropdown(dropdown) {
    const wasOpen = dropdown.classList.contains('open');
    document.querySelectorAll('.dropdown.open').forEach(d => d.classList.remove('open'));
    if (!wasOpen) {
        dropdown.classList.add('open');
    }
}

// ==================== Mobile Menu ====================

function initializeMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu = document.querySelector('.navbar-menu');
    
    if (!toggle || !menu) return;
    
    toggle.addEventListener('click', () => {
        menu.classList.toggle('mobile-open');
        toggle.classList.toggle('active');
    });
}

// ==================== Search ====================

let searchModal = null;
let searchModalInput = null;

function initializeSearch() {
    searchModal = document.getElementById('searchModal');
    searchModalInput = document.getElementById('searchModalInput');
    
    const searchBtn = document.querySelector('.search-btn');
    
    if (searchBtn && searchModal) {
        searchBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            openSearchModal();
        });
    }
    
    if (searchModal) {
        searchModal.addEventListener('click', (e) => {
            if (e.target === searchModal) {
                closeSearchModal();
            }
        });
    }
    
    if (searchModalInput) {
        searchModalInput.addEventListener('input', (e) => {
            handleModalSearch(e.target.value);
        });
    }
    
    // Keyboard shortcut
    document.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
            e.preventDefault();
            openSearchModal();
        }
        if (e.key === 'Escape' && searchModal) {
            closeSearchModal();
        }
    });
}

function openSearchModal() {
    if (searchModal) {
        searchModal.classList.add('open');
        setTimeout(() => {
            if (searchModalInput) searchModalInput.focus();
        }, 100);
    }
}

function closeSearchModal() {
    if (searchModal) {
        searchModal.classList.remove('open');
        if (searchModalInput) searchModalInput.value = '';
    }
}

function handleModalSearch(query) {
    const resultsContainer = document.getElementById('searchModalResults');
    if (!resultsContainer) return;
    
    if (query.length < 2) {
        resultsContainer.innerHTML = `
            <div class="search-modal-empty">
                <div class="search-modal-empty-icon">🔍</div>
                <p>Начните вводить для поиска</p>
            </div>
        `;
        return;
    }
    
    // Search products
    const products = db.getProducts() || [];
    const matchedProducts = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) ||
        p.description.toLowerCase().includes(query.toLowerCase())
    );
    
    // Search marketplace
    const marketplace = db.getMarketplaceItems() || [];
    const matchedMarketplace = marketplace.filter(i =>
        i.name.toLowerCase().includes(query.toLowerCase()) ||
        i.description.toLowerCase().includes(query.toLowerCase())
    );
    
    // Search forum topics
    const topics = db.getForumTopics() || [];
    const matchedTopics = topics.filter(t =>
        t.title.toLowerCase().includes(query.toLowerCase())
    );
    
    // Render results
    let html = '';
    
    if (matchedProducts.length > 0) {
        html += '<div class="search-modal-category">Продукты</div>';
        matchedProducts.slice(0, 5).forEach(product => {
            html += `
                <a href="product-${product.slug}.html" class="search-modal-item">
                    <div class="search-modal-item-icon">⚡</div>
                    <div class="search-modal-item-content">
                        <div class="search-modal-item-title">${escapeHtml(product.name)}</div>
                        <div class="search-modal-item-subtitle">${product.type === 'product' ? 'Продукт' : 'Товар'}</div>
                    </div>
                </a>
            `;
        });
    }
    
    if (matchedMarketplace.length > 0) {
        html += '<div class="search-modal-category">Маркетплейс</div>';
        matchedMarketplace.slice(0, 5).forEach(item => {
            html += `
                <a href="marketplace-item.html?id=${item.id}" class="search-modal-item">
                    <div class="search-modal-item-icon">🛒</div>
                    <div class="search-modal-item-content">
                        <div class="search-modal-item-title">${escapeHtml(item.name)}</div>
                        <div class="search-modal-item-subtitle">${item.authorName}</div>
                    </div>
                </a>
            `;
        });
    }
    
    if (matchedTopics.length > 0) {
        html += '<div class="search-modal-category">Форум</div>';
        matchedTopics.slice(0, 5).forEach(topic => {
            html += `
                <a href="forum-topic.html?id=${topic.id}" class="search-modal-item">
                    <div class="search-modal-item-icon">💬</div>
                    <div class="search-modal-item-content">
                        <div class="search-modal-item-title">${escapeHtml(topic.title)}</div>
                        <div class="search-modal-item-subtitle">${topic.replies} ответов</div>
                    </div>
                </a>
            `;
        });
    }
    
    if (!html) {
        html = `
            <div class="search-modal-empty">
                <div class="search-modal-empty-icon">🔍</div>
                <p>Ничего не найдено</p>
            </div>
        `;
    }
    
    resultsContainer.innerHTML = html;
}

// Export search functions
window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;

// ==================== User Interface ====================

function updateUserInterface() {
    const user = db.getCurrentUser();
    const authContainer = document.querySelector('.navbar-auth');
    const profileContainer = document.querySelector('.profile-container');
    
    if (user) {
        // User is logged in
        if (authContainer) {
            authContainer.innerHTML = `
                <div class="dropdown profile-container">
                    <button class="navbar-icon-btn profile-btn">
                        ${user.avatar ? `<img src="${user.avatar}" alt="${user.username}" class="avatar">` : 
                        `<div class="avatar-placeholder">${user.username.charAt(0).toUpperCase()}</div>`}
                    </button>
                    <div class="dropdown-menu profile-dropdown">
                        <div class="dropdown-header">
                            <h4>${escapeHtml(user.username)}</h4>
                            <p class="text-secondary" style="font-size: 0.75rem;">${user.id}</p>
                        </div>
                        <a href="profile.html" class="dropdown-item">
                            <div class="dropdown-item-icon">👤</div>
                            <div class="dropdown-item-content">
                                <div class="dropdown-item-title">Профиль</div>
                            </div>
                        </a>
                        <a href="settings.html" class="dropdown-item">
                            <div class="dropdown-item-icon">⚙️</div>
                            <div class="dropdown-item-content">
                                <div class="dropdown-item-title">Настройки</div>
                            </div>
                        </a>
                        ${user.role === 'creator' ? `
                        <a href="seller.html" class="dropdown-item">
                            <div class="dropdown-item-icon">📊</div>
                            <div class="dropdown-item-content">
                                <div class="dropdown-item-title">Панель продавца</div>
                            </div>
                        </a>
                        ` : ''}
                        ${user.role === 'admin' ? `
                        <a href="admin.html" class="dropdown-item">
                            <div class="dropdown-item-icon">🛡️</div>
                            <div class="dropdown-item-content">
                                <div class="dropdown-item-title">Админ панель</div>
                            </div>
                        </a>
                        ` : ''}
                        <div class="dropdown-footer">
                            <a href="#" onclick="handleLogout(); return false;">Выйти</a>
                        </div>
                    </div>
                </div>
            `;
        }
        
        if (profileContainer) {
            profileContainer.classList.remove('hidden');
        }
    } else {
        // User is not logged in
        if (authContainer) {
            authContainer.innerHTML = `
                <a href="login.html" class="btn btn-secondary btn-sm">Войти</a>
                <a href="register.html" class="btn btn-primary btn-sm">Регистрация</a>
            `;
        }
    }
    
    // Update notifications
    loadNotifications();
}

function loadNotifications() {
    const user = db.getCurrentUser();
    const container = document.querySelector('.notifications-list');
    const badge = document.querySelector('.notifications-btn .badge');
    
    if (!container) return;
    
    if (!user) {
        container.innerHTML = `
            <div class="dropdown-header">
                <h4>Уведомления</h4>
            </div>
            <div class="dropdown-item">
                <div class="dropdown-item-content text-center">
                    <p class="text-secondary">Войдите для просмотра уведомлений</p>
                </div>
            </div>
            <div class="dropdown-footer">
                <a href="login.html">Войти</a>
            </div>
        `;
        return;
    }
    
    const notifications = db.getNotifications(user.id).slice(0, 5);
    const unreadCount = notifications.filter(n => !n.read).length;
    
    if (badge) {
        badge.style.display = unreadCount > 0 ? 'block' : 'none';
    }
    
    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="dropdown-header">
                <h4>Уведомления</h4>
            </div>
            <div class="dropdown-item">
                <div class="dropdown-item-content text-center">
                    <p class="text-secondary">Нет новых уведомлений</p>
                </div>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="dropdown-header">
            <h4>Уведомления</h4>
        </div>
    `;
    
    notifications.forEach(notification => {
        const icon = getNotificationIcon(notification.type);
        html += `
            <div class="dropdown-item notification-item ${!notification.read ? 'unread' : ''}">
                <div class="dropdown-item-icon">${icon}</div>
                <div class="dropdown-item-content">
                    <div class="dropdown-item-title">${escapeHtml(notification.title)}</div>
                    <div class="dropdown-item-subtitle">${timeAgo(new Date(notification.createdAt))}</div>
                </div>
            </div>
        `;
    });
    
    html += `
        <div class="dropdown-footer">
            <a href="notifications.html">Все уведомления</a>
        </div>
    `;
    
    container.innerHTML = html;
}

function getNotificationIcon(type) {
    const icons = {
        'forum-reply': '💬',
        'forum-mention': '@',
        'marketplace-purchase': '🛒',
        'like': '❤️',
        'update': '📦',
        'announcement': '📢'
    };
    return icons[type] || '🔔';
}

function handleLogout() {
    db.logout();
    updateUserInterface();
    window.location.href = 'index.html';
}

// ==================== Utilities ====================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    if (seconds < 60) return 'Только что';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} мин. назад`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} час. назад`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} дн. назад`;
    
    return date.toLocaleDateString('ru-RU');
}

function formatNumber(num) {
    if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// ==================== Modal Functions ====================

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }
}

// Close modal on overlay click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.classList.remove('open');
        document.body.style.overflow = '';
    }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay.open').forEach(modal => {
            modal.classList.remove('open');
        });
        document.body.style.overflow = '';
    }
});

// ==================== Theme Switcher ====================

function initializeTheme() {
    const savedTheme = localStorage.getItem('winx_theme') || 'gothic';
    setTheme(savedTheme);
    
    const themeBtn = document.getElementById('themeBtn');
    if (themeBtn) {
        const dropdown = themeBtn.parentElement;
        if (!dropdown.classList.contains('dropdown')) {
            dropdown.classList.add('dropdown');
        }
    }
}

function setTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
    document.body.setAttribute('data-theme', themeName);
    localStorage.setItem('winx_theme', themeName);
    
    // Update active state in dropdown
    document.querySelectorAll('.dropdown-item').forEach(item => {
        item.style.background = '';
    });
    
    // Find and highlight current theme
    const themeIcons = {
        'gothic': '🏰',
        'vampire': '🩸',
        'witch': '🧪',
        'void': '🌌',
        'ash': '🌫️'
    };
    
    document.querySelectorAll('.dropdown-item').forEach(item => {
        const icon = item.querySelector('.dropdown-item-icon');
        if (icon && icon.textContent === themeIcons[themeName]) {
            item.style.background = 'var(--bg-hover)';
        }
    });
}

// ==================== Animated Stats ====================

function initializeAnimatedStats() {
    const statsSection = document.querySelector('.stats-section');
    if (!statsSection) return;
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateStats();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    
    observer.observe(statsSection);
}

function animateStats() {
    const statValues = document.querySelectorAll('.stat-value');
    
    statValues.forEach(stat => {
        const text = stat.textContent;
        const match = text.match(/([\d.]+)([KMB\+]?)/);
        if (!match) return;
        
        const target = parseFloat(match[1]);
        const suffix = match[2];
        const isDecimal = target % 1 !== 0;
        
        let current = 0;
        const increment = target / 50;
        const duration = 2000;
        const stepTime = duration / 50;
        
        const timer = setInterval(() => {
            current += increment;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            const displayValue = isDecimal ? current.toFixed(1) : Math.floor(current);
            stat.textContent = displayValue + suffix;
        }, stepTime);
    });
}

// Export functions for global use
window.handleLogout = handleLogout;
window.openModal = openModal;
window.closeModal = closeModal;
window.escapeHtml = escapeHtml;
window.timeAgo = timeAgo;
window.formatNumber = formatNumber;
window.formatDate = formatDate;
window.setTheme = setTheme;
window.openSearchModal = openSearchModal;
window.closeSearchModal = closeSearchModal;
