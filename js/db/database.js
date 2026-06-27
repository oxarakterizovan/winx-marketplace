/**
 * WINX Database - LocalStorage Mock Database
 * Имитация базы данных для frontend-тестирования
 */

class Database {
    constructor() {
        this.prefix = 'winx_db_';
        this.initialize();
    }

    // Инициализация БД
    initialize() {
        if (!this.get('users')) {
            this.set('users', this.getDefaultUsers());
        }
        if (!this.get('products')) {
            this.set('products', this.getDefaultProducts());
        }
        if (!this.get('marketplace')) {
            this.set('marketplace', this.getDefaultMarketplace());
        }
        if (!this.get('forumCategories')) {
            this.set('forumCategories', this.getDefaultForumCategories());
        }
        if (!this.get('forumTopics')) {
            this.set('forumTopics', this.getDefaultForumTopics());
        }
        if (!this.get('forumPosts')) {
            this.set('forumPosts', this.getDefaultForumPosts());
        }
        if (!this.get('notifications')) {
            this.set('notifications', []);
        }
        if (!this.get('reviews')) {
            this.set('reviews', this.getDefaultReviews());
        }
        if (!this.get('sessions')) {
            this.set('sessions', {});
        }
    }

    // ==================== CRUD Операции ====================
    
    get(collection) {
        try {
            const data = localStorage.getItem(this.prefix + collection);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('Database GET error:', e);
            return null;
        }
    }

    set(collection, data) {
        try {
            localStorage.setItem(this.prefix + collection, JSON.stringify(data));
            return true;
        } catch (e) {
            console.error('Database SET error:', e);
            return false;
        }
    }

    insert(collection, item) {
        const data = this.get(collection) || [];
        item.id = this.generateId();
        item.createdAt = new Date().toISOString();
        data.push(item);
        this.set(collection, data);
        return item;
    }

    update(collection, id, updates) {
        const data = this.get(collection);
        if (!data) return null;
        
        const index = data.findIndex(item => item.id === id);
        if (index === -1) return null;
        
        data[index] = { ...data[index], ...updates, updatedAt: new Date().toISOString() };
        this.set(collection, data);
        return data[index];
    }

    delete(collection, id) {
        const data = this.get(collection);
        if (!data) return false;
        
        const filtered = data.filter(item => item.id !== id);
        this.set(collection, filtered);
        return true;
    }

    find(collection, predicate) {
        const data = this.get(collection);
        if (!data) return null;
        return data.find(predicate) || null;
    }

    findAll(collection, predicate) {
        const data = this.get(collection);
        if (!data) return [];
        return predicate ? data.filter(predicate) : data;
    }

    // ==================== Пользователи ====================

    register(userData) {
        const users = this.get('users');
        
        // Проверка существующего email
        if (users.find(u => u.email === userData.email)) {
            return { success: false, error: 'Email уже зарегистрирован' };
        }
        
        // Проверка существующего username
        if (users.find(u => u.username === userData.username)) {
            return { success: false, error: 'Имя пользователя уже занято' };
        }

        const newUser = {
            id: this.generateUserId(),
            email: userData.email,
            username: userData.username,
            password: this.hashPassword(userData.password),
            avatar: userData.avatar || null,
            banner: userData.banner || null,
            bio: userData.bio || '',
            country: userData.country || '',
            role: 'user',
            badges: [],
            achievements: [],
            purchasedProducts: [],
            marketplaceUploads: [],
            forumPosts: 0,
            likesReceived: 0,
            followers: [],
            following: [],
            createdAt: new Date().toISOString(),
            lastOnline: new Date().toISOString(),
            emailVerified: false,
            twoFactorEnabled: false,
            usernameChangeDate: null
        };

        users.push(newUser);
        this.set('users', users);
        
        // Создаем сессию
        this.createSession(newUser.id);
        
        return { success: true, user: newUser };
    }

    login(email, password) {
        const users = this.get('users');
        const user = users.find(u => u.email === email);
        
        if (!user) {
            return { success: false, error: 'Неверный email или пароль' };
        }
        
        if (!this.verifyPassword(password, user.password)) {
            return { success: false, error: 'Неверный email или пароль' };
        }
        
        // Обновляем lastOnline
        this.update('users', user.id, { lastOnline: new Date().toISOString() });
        
        // Создаем сессию
        this.createSession(user.id);
        
        return { success: true, user: this.sanitizeUser(user) };
    }

    logout() {
        const sessionId = sessionStorage.getItem('winx_session');
        if (sessionId) {
            const sessions = this.get('sessions');
            delete sessions[sessionId];
            this.set('sessions', sessions);
            sessionStorage.removeItem('winx_session');
        }
    }

    getCurrentUser() {
        const sessionId = sessionStorage.getItem('winx_session');
        if (!sessionId) return null;
        
        const sessions = this.get('sessions');
        const session = sessions[sessionId];
        
        if (!session || new Date(session.expiresAt) < new Date()) {
            this.logout();
            return null;
        }
        
        const users = this.get('users');
        const user = users.find(u => u.id === session.userId);
        
        return user ? this.sanitizeUser(user) : null;
    }

    updateUserProfile(userId, updates) {
        const users = this.get('users');
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return { success: false, error: 'Пользователь не найден' };
        }
        
        // Проверка кулдауна для никнейма
        if (updates.nickname && updates.lastNicknameChange) {
            const lastChange = user.lastNicknameChange ? new Date(user.lastNicknameChange) : null;
            if (lastChange) {
                const daysPassed = Math.floor((new Date() - lastChange) / (1000 * 60 * 60 * 24));
                if (daysPassed < 180) {
                    return { success: false, error: `Подождите ${180 - daysPassed} дн.` };
                }
            }
        }
        
        // Обновляем разрешённые поля
        const allowedFields = ['nickname', 'lastNicknameChange', 'status', 'avatar', 'nicknameColor', 'twoFactorEnabled', 'twoFactorSecret', 'backupCodes', 'sessions'];
        const sanitizedUpdates = {};
        for (const key of allowedFields) {
            if (updates.hasOwnProperty(key)) {
                sanitizedUpdates[key] = updates[key];
            }
        }
        
        const updatedUser = { ...user, ...sanitizedUpdates };
        this.set('users', users);
        
        return { success: true, user: this.sanitizeUser(updatedUser) };
    }

    createSession(userId) {
        const sessionId = this.generateId();
        const sessions = this.get('sessions');
        
        sessions[sessionId] = {
            userId,
            createdAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 дней
        };

        this.set('sessions', sessions);
        sessionStorage.setItem('winx_session', sessionId);
        
        return sessionId;
    }

    sanitizeUser(user) {
        const { password, ...safeUser } = user;
        return safeUser;
    }

    hashPassword(password) {
        // Простая хеш-функция для демонстрации (в продакшене использовать bcrypt)
        return btoa(password.split('').reverse().join(''));
    }

    verifyPassword(password, hash) {
        return this.hashPassword(password) === hash;
    }

    generateUserId() {
        return 'UID-' + Math.random().toString(36).substr(2, 9).toUpperCase();
    }

    // ==================== Продукты ====================

    getProducts() {
        return this.get('products');
    }

    getProduct(id) {
        return this.find('products', p => p.id === id);
    }

    // ==================== Маркетплейс ====================

    getMarketplaceItems(filters = {}) {
        let items = this.get('marketplace') || [];
        
        if (filters.category) {
            items = items.filter(i => i.category === filters.category);
        }
        if (filters.price !== undefined) {
            items = filters.price === 'free' 
                ? items.filter(i => i.price === 0)
                : items.filter(i => i.price > 0);
        }
        if (filters.sort) {
            switch (filters.sort) {
                case 'newest':
                    items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case 'popular':
                    items.sort((a, b) => b.downloads - a.downloads);
                    break;
                case 'rating':
                    items.sort((a, b) => b.rating - a.rating);
                    break;
                case 'price-low':
                    items.sort((a, b) => a.price - b.price);
                    break;
                case 'price-high':
                    items.sort((a, b) => b.price - a.price);
                    break;
            }
        }
        
        return items;
    }

    getMarketplaceItem(id) {
        return this.find('marketplace', i => i.id === id);
    }

    uploadMarketplaceItem(itemData, userId) {
        const users = this.get('users');
        const user = users.find(u => u.id === userId);
        
        // Проверка: пользователь должен быть зарегистрирован более 24 часов
        const registrationDate = new Date(user.createdAt);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        if (registrationDate > twentyFourHoursAgo) {
            return { success: false, error: 'Вы должны быть зарегистрированы не менее 24 часов' };
        }

        const newItem = {
            id: this.generateId(),
            ...itemData,
            authorId: userId,
            authorName: user.username,
            authorAvatar: user.avatar,
            downloads: 0,
            rating: 0,
            reviewsCount: 0,
            verified: user.role === 'creator' || user.role === 'admin',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const items = this.get('marketplace');
        items.push(newItem);
        this.set('marketplace', items);
        
        // Добавляем в uploads пользователя
        user.marketplaceUploads.push(newItem.id);
        this.update('users', userId, { marketplaceUploads: user.marketplaceUploads });
        
        return { success: true, item: newItem };
    }

    downloadMarketplaceItem(itemId, userId) {
        const item = this.getMarketplaceItem(itemId);
        if (!item) return { success: false, error: 'Элемент не найден' };
        
        item.downloads++;
        this.update('marketplace', itemId, { downloads: item.downloads });
        
        // Добавляем в purchased пользователя
        const user = this.find('users', u => u.id === userId);
        if (!user.purchasedProducts.includes(itemId)) {
            user.purchasedProducts.push(itemId);
            this.update('users', userId, { purchasedProducts: user.purchasedProducts });
        }
        
        return { success: true, item };
    }

    // ==================== Форум ====================

    getForumCategories() {
        return this.get('forumCategories');
    }

    getForumTopics(categoryId = null, filters = {}) {
        let topics = this.get('forumTopics') || [];
        
        if (categoryId) {
            topics = topics.filter(t => t.categoryId === categoryId);
        }
        
        if (filters.sort) {
            switch (filters.sort) {
                case 'newest':
                    topics.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                    break;
                case 'popular':
                    topics.sort((a, b) => b.views - a.views);
                    break;
                case 'replies':
                    topics.sort((a, b) => b.replies - a.replies);
                    break;
            }
        }
        
        return topics;
    }

    getForumTopic(id) {
        return this.find('forumTopics', t => t.id === id);
    }

    createForumTopic(topicData, userId) {
        const users = this.get('users');
        const user = users.find(u => u.id === userId);
        
        // Проверка: пользователь должен быть зарегистрирован более 24 часов
        const registrationDate = new Date(user.createdAt);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        if (registrationDate > twentyFourHoursAgo) {
            return { success: false, error: 'Вы должны быть зарегистрированы не менее 24 часов' };
        }

        const newTopic = {
            id: this.generateId(),
            ...topicData,
            authorId: userId,
            authorName: user.username,
            authorAvatar: user.avatar,
            replies: 0,
            views: 0,
            likes: 0,
            pinned: false,
            locked: false,
            solved: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        const topics = this.get('forumTopics');
        topics.push(newTopic);
        this.set('forumTopics', topics);
        
        // Увеличиваем счетчик постов пользователя
        user.forumPosts++;
        this.update('users', userId, { forumPosts: user.forumPosts });
        
        return { success: true, topic: newTopic };
    }

    getForumPosts(topicId) {
        return this.findAll('forumPosts', p => p.topicId === topicId)
            .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    }

    createForumPost(postData, userId) {
        const users = this.get('users');
        const user = users.find(u => u.id === userId);
        
        const newPost = {
            id: this.generateId(),
            ...postData,
            authorId: userId,
            authorName: user.username,
            authorAvatar: user.avatar,
            likes: 0,
            edited: false,
            createdAt: new Date().toISOString()
        };

        const posts = this.get('forumPosts');
        posts.push(newPost);
        this.set('forumPosts', posts);
        
        // Обновляем счетчик ответов в теме
        const topic = this.getForumTopic(postData.topicId);
        if (topic) {
            topic.replies++;
            topic.updatedAt = new Date().toISOString();
            this.update('forumTopics', topic.id, { replies: topic.replies });
        }
        
        // Увеличиваем счетчик постов пользователя
        user.forumPosts++;
        this.update('users', userId, { forumPosts: user.forumPosts });
        
        return { success: true, post: newPost };
    }

    // ==================== Уведомления ====================

    getNotifications(userId) {
        const notifications = this.get('notifications') || [];
        return notifications.filter(n => n.userId === userId)
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    createNotification(notificationData) {
        const notification = {
            id: this.generateId(),
            ...notificationData,
            read: false,
            createdAt: new Date().toISOString()
        };
        
        const notifications = this.get('notifications');
        notifications.push(notification);
        this.set('notifications', notifications);
        
        return notification;
    }

    markNotificationRead(notificationId) {
        return this.update('notifications', notificationId, { read: true });
    }

    markAllNotificationsRead(userId) {
        const notifications = this.get('notifications');
        notifications.forEach(n => {
            if (n.userId === userId) n.read = true;
        });
        this.set('notifications', notifications);
    }

    // ==================== Отзывы ====================

    getReviews(itemId) {
        return this.findAll('reviews', r => r.itemId === itemId);
    }

    createReview(reviewData, userId) {
        const users = this.get('users');
        const user = users.find(u => u.id === userId);
        
        // Проверка: пользователь должен быть зарегистрирован более 24 часов
        const registrationDate = new Date(user.createdAt);
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        
        if (registrationDate > twentyFourHoursAgo) {
            return { success: false, error: 'Вы должны быть зарегистрированы не менее 24 часов' };
        }

        const review = {
            id: this.generateId(),
            ...reviewData,
            authorId: userId,
            authorName: user.username,
            authorAvatar: user.avatar,
            likes: 0,
            createdAt: new Date().toISOString()
        };
        
        const reviews = this.get('reviews');
        reviews.push(review);
        this.set('reviews', reviews);
        
        // Обновляем рейтинг элемента
        this.updateItemRating(reviewData.itemId);
        
        return { success: true, review };
    }

    updateItemRating(itemId) {
        const reviews = this.findAll('reviews', r => r.itemId === itemId);
        if (reviews.length === 0) return;
        
        const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
        
        // Обновляем в marketplace или products
        let item = this.find('marketplace', i => i.id === itemId);
        if (item) {
            this.update('marketplace', itemId, { 
                rating: Math.round(avgRating * 10) / 10,
                reviewsCount: reviews.length
            });
        } else {
            item = this.find('products', p => p.id === itemId);
            if (item) {
                this.update('products', itemId, {
                    rating: Math.round(avgRating * 10) / 10,
                    reviewsCount: reviews.length
                });
            }
        }
    }

    // ==================== Вспомогательные методы ====================

    generateId() {
        return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    // ==================== Данные по умолчанию ====================

    getDefaultUsers() {
        return [
            {
                id: 'UID-ADMIN001',
                email: 'admin@winx.com',
                username: 'Admin',
                password: this.hashPassword('admin123'),
                avatar: null,
                banner: null,
                bio: 'Administrator of WINX Platform',
                country: 'International',
                role: 'admin',
                badges: ['admin', 'founder'],
                achievements: [],
                purchasedProducts: [],
                marketplaceUploads: [],
                forumPosts: 0,
                likesReceived: 0,
                followers: [],
                following: [],
                createdAt: new Date('2024-01-01').toISOString(),
                lastOnline: new Date().toISOString(),
                emailVerified: true,
                twoFactorEnabled: false,
                usernameChangeDate: null,
                lastNicknameChange: null,
                nickname: null,
                nicknameColor: '#F4F4F4',
                status: 'Administrator of WINX Platform'
            },
            {
                id: 'UID-CREATOR01',
                email: 'creator@winx.com',
                username: 'DarkCreator',
                password: this.hashPassword('creator123'),
                avatar: null,
                banner: null,
                bio: 'Premium content creator for WINX',
                country: 'Germany',
                role: 'creator',
                badges: ['creator', 'verified'],
                achievements: [],
                purchasedProducts: [],
                marketplaceUploads: [],
                forumPosts: 0,
                likesReceived: 0,
                followers: [],
                following: [],
                createdAt: new Date('2024-06-01').toISOString(),
                lastOnline: new Date().toISOString(),
                emailVerified: true,
                twoFactorEnabled: false,
                usernameChangeDate: null,
                lastNicknameChange: null,
                nickname: null,
                nicknameColor: '#F4F4F4',
                status: 'Premium content creator'
            }
        ];
    }

    getDefaultProducts() {
        return [
            {
                id: 'prod-winxloader',
                type: 'product',
                name: 'Winx Loader',
                slug: 'winx-loader',
                description: 'Premium Minecraft utility platform with advanced features for enhanced gameplay experience.',
                longDescription: `Winx Loader is the ultimate Minecraft utility platform designed for players who demand excellence. 

**Features:**
- Visual enhancements and UI improvements
- Quality-of-life features and customization tools
- Autoclicker functionality with advanced settings
- Performance optimizations
- Profile management and configuration syncing
- Update manager

**System Requirements:**
- Windows 10/11
- Java 17 or higher
- 4GB RAM minimum
- 500MB free disk space`,
                price: 0,
                version: '2.5.1',
                downloads: 125847,
                rating: 4.9,
                reviewsCount: 2341,
                images: [],
                features: [
                    'Visual Enhancements',
                    'UI Improvements',
                    'Autoclicker',
                    'Performance Optimization',
                    'Profile Management',
                    'Auto Updates'
                ],
                supportedVersions: ['1.20.x', '1.19.x', '1.18.x', '1.17.x'],
                releaseNotes: 'Bug fixes and performance improvements',
                createdAt: '2024-01-15T00:00:00.000Z',
                updatedAt: '2024-06-20T00:00:00.000Z'
            },
            {
                id: 'prod-clicker',
                type: 'product',
                name: 'Standalone Clicker',
                slug: 'standalone-clicker',
                description: 'Advanced autoclicker with customizable patterns and timing.',
                longDescription: `Standalone Clicker is a powerful autoclicking tool for various applications.

**Features:**
- Multiple click patterns
- Customizable timing (1ms - 1000ms)
- Hotkey support
- Portable mode
- Lightweight design`,
                price: 0,
                version: '1.3.0',
                downloads: 45230,
                rating: 4.7,
                reviewsCount: 892,
                images: [],
                features: [
                    'Multiple Patterns',
                    'Custom Timing',
                    'Hotkey Support',
                    'Portable'
                ],
                supportedVersions: ['Windows 10/11'],
                releaseNotes: 'Added new click patterns',
                createdAt: '2024-03-01T00:00:00.000Z',
                updatedAt: '2024-06-15T00:00:00.000Z'
            }
        ];
    }

    getDefaultMarketplace() {
        return [
            {
                id: 'mp-001',
                name: 'Obsidian Theme',
                category: 'themes',
                description: 'Dark gothic theme for Winx Loader with obsidian textures and gold accents.',
                price: 0,
                authorId: 'UID-CREATOR01',
                authorName: 'DarkCreator',
                authorAvatar: null,
                downloads: 5420,
                rating: 4.8,
                reviewsCount: 124,
                verified: true,
                images: [],
                tags: ['theme', 'dark', 'gothic', 'obsidian'],
                compatibility: ['1.20.x', '1.19.x'],
                version: '1.2.0',
                createdAt: '2024-05-01T00:00:00.000Z',
                updatedAt: '2024-06-01T00:00:00.000Z'
            },
            {
                id: 'mp-002',
                name: 'Golden HUD Pack',
                category: 'hud-layouts',
                description: 'Elegant golden HUD layout for competitive gameplay.',
                price: 4.99,
                authorId: 'UID-CREATOR01',
                authorName: 'DarkCreator',
                authorAvatar: null,
                downloads: 3210,
                rating: 4.9,
                reviewsCount: 87,
                verified: true,
                images: [],
                tags: ['hud', 'golden', 'competitive'],
                compatibility: ['1.20.x', '1.19.x', '1.18.x'],
                version: '2.0.1',
                createdAt: '2024-04-15T00:00:00.000Z',
                updatedAt: '2024-05-20T00:00:00.000Z'
            },
            {
                id: 'mp-003',
                name: 'Cathedral Config',
                category: 'configurations',
                description: 'Pre-configured settings inspired by gothic cathedral aesthetics.',
                price: 0,
                authorId: 'UID-ADMIN001',
                authorName: 'Admin',
                authorAvatar: null,
                downloads: 8930,
                rating: 4.6,
                reviewsCount: 203,
                verified: true,
                images: [],
                tags: ['config', 'preset', 'gothic'],
                compatibility: ['1.20.x'],
                version: '1.0.0',
                createdAt: '2024-06-10T00:00:00.000Z',
                updatedAt: '2024-06-10T00:00:00.000Z'
            },
            {
                id: 'mp-004',
                name: 'Purple Void Animation Pack',
                category: 'animations',
                description: 'Mystical purple animations for menu and UI elements.',
                price: 2.99,
                authorId: 'UID-CREATOR01',
                authorName: 'DarkCreator',
                authorAvatar: null,
                downloads: 2150,
                rating: 4.7,
                reviewsCount: 56,
                verified: true,
                images: [],
                tags: ['animations', 'purple', 'void'],
                compatibility: ['1.20.x', '1.19.x'],
                version: '1.1.0',
                createdAt: '2024-05-25T00:00:00.000Z',
                updatedAt: '2024-06-05T00:00:00.000Z'
            }
        ];
    }

    getDefaultForumCategories() {
        return [
            { id: 'cat-general', name: 'General Discussion', icon: '💬', description: 'Talk about anything WINX-related', order: 1 },
            { id: 'cat-announcements', name: 'Announcements', icon: '📢', description: 'Official news and updates', order: 2 },
            { id: 'cat-questions', name: 'Questions & Help', icon: '❓', description: 'Get help from the community', order: 3 },
            { id: 'cat-bugs', name: 'Bug Reports', icon: '🐛', description: 'Report issues and bugs', order: 4 },
            { id: 'cat-suggestions', name: 'Suggestions', icon: '💡', description: 'Share your ideas', order: 5 },
            { id: 'cat-marketplace', name: 'Marketplace Support', icon: '🛒', description: 'Help with marketplace items', order: 6 },
            { id: 'cat-showcase', name: 'Showcase', icon: '🎨', description: 'Show off your creations', order: 7 },
            { id: 'cat-offtopic', name: 'Off-topic', icon: '🎮', description: 'Anything not WINX-related', order: 8 }
        ];
    }

    getDefaultForumTopics() {
        return [
            {
                id: 'topic-001',
                categoryId: 'cat-announcements',
                title: 'Welcome to WINX Platform!',
                content: 'Welcome to the official WINX community platform. Here you can find support, share creations, and connect with other users.',
                authorId: 'UID-ADMIN001',
                authorName: 'Admin',
                authorAvatar: null,
                replies: 45,
                views: 1250,
                likes: 89,
                pinned: true,
                locked: false,
                solved: false,
                createdAt: '2024-01-01T00:00:00.000Z',
                updatedAt: '2024-06-20T00:00:00.000Z'
            },
            {
                id: 'topic-002',
                categoryId: 'cat-general',
                title: 'Winx Loader 2.5.1 Released',
                content: 'The latest version of Winx Loader is now available with performance improvements and bug fixes.',
                authorId: 'UID-ADMIN001',
                authorName: 'Admin',
                authorAvatar: null,
                replies: 23,
                views: 890,
                likes: 56,
                pinned: true,
                locked: false,
                solved: false,
                createdAt: '2024-06-20T00:00:00.000Z',
                updatedAt: '2024-06-25T00:00:00.000Z'
            },
            {
                id: 'topic-003',
                categoryId: 'cat-questions',
                title: 'How to install custom themes?',
                content: 'Can someone explain how to install custom themes from the marketplace?',
                authorId: 'UID-CREATOR01',
                authorName: 'DarkCreator',
                authorAvatar: null,
                replies: 8,
                views: 320,
                likes: 12,
                pinned: false,
                locked: false,
                solved: true,
                createdAt: '2024-06-15T00:00:00.000Z',
                updatedAt: '2024-06-18T00:00:00.000Z'
            },
            {
                id: 'topic-004',
                categoryId: 'cat-showcase',
                title: 'My Gothic Configuration',
                content: 'Check out my custom gothic-inspired configuration for Winx Loader!',
                authorId: 'UID-CREATOR01',
                authorName: 'DarkCreator',
                authorAvatar: null,
                replies: 15,
                views: 450,
                likes: 34,
                pinned: false,
                locked: false,
                solved: false,
                createdAt: '2024-06-10T00:00:00.000Z',
                updatedAt: '2024-06-22T00:00:00.000Z'
            }
        ];
    }

    getDefaultForumPosts() {
        return [
            {
                id: 'post-001',
                topicId: 'topic-001',
                content: 'Thanks for creating this amazing platform!',
                authorId: 'UID-CREATOR01',
                authorName: 'DarkCreator',
                authorAvatar: null,
                likes: 5,
                edited: false,
                createdAt: '2024-01-02T00:00:00.000Z'
            },
            {
                id: 'post-002',
                topicId: 'topic-003',
                content: 'You need to go to Settings > Themes > Import and select the downloaded file.',
                authorId: 'UID-ADMIN001',
                authorName: 'Admin',
                authorAvatar: null,
                likes: 8,
                edited: false,
                createdAt: '2024-06-16T00:00:00.000Z'
            }
        ];
    }

    getDefaultReviews() {
        return [
            {
                id: 'rev-001',
                itemId: 'mp-001',
                rating: 5,
                content: 'Amazing theme! Looks incredible with the gothic aesthetic.',
                authorId: 'UID-ADMIN001',
                authorName: 'Admin',
                authorAvatar: null,
                likes: 12,
                createdAt: '2024-05-05T00:00:00.000Z'
            },
            {
                id: 'rev-002',
                itemId: 'mp-002',
                rating: 5,
                content: 'Best HUD pack I\'ve used. Worth every penny!',
                authorId: 'UID-ADMIN001',
                authorName: 'Admin',
                authorAvatar: null,
                likes: 8,
                createdAt: '2024-04-20T00:00:00.000Z'
            }
        ];
    }
}

// Создаем глобальный экземпляр БД
const db = new Database();
