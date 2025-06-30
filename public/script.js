// Enhanced AI Shopping Assistant with Voice Recognition
class ShoppingAssistant {
    constructor() {
        this.socket = null;
        this.sessionId = null;
        this.isRecording = false;
        this.recognition = null;
        this.comparisonProducts = new Set();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupVoiceRecognition();
        this.loadProducts();
        this.setupCoBrowsing();
        this.animateElements();
    }

    setupVoiceRecognition() {
        // Check for browser support
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            console.warn('Speech recognition not supported in this browser');
            const voiceBtn = document.getElementById('voiceBtn');
            if (voiceBtn) {
                voiceBtn.style.display = 'none';
            }
            return;
        }

        // Initialize speech recognition
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        this.recognition = new SpeechRecognition();
        
        // Configure recognition settings
        this.recognition.continuous = false;
        this.recognition.interimResults = false;
        this.recognition.lang = 'en-US';
        this.recognition.maxAlternatives = 1;

        // Handle recognition results
        this.recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            console.log('Voice input received:', transcript);
            
            const chatInput = document.getElementById('chatInput');
            if (chatInput) {
                chatInput.value = transcript;
                this.sendMessage(transcript);
            }
        };

        // Handle recognition errors
        this.recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            this.stopRecording();
            
            let errorMessage = 'Voice recognition failed. ';
            switch (event.error) {
                case 'no-speech':
                    errorMessage += 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMessage += 'Microphone not accessible. Please check permissions.';
                    break;
                case 'not-allowed':
                    errorMessage += 'Microphone access denied. Please allow microphone access and try again.';
                    break;
                case 'network':
                    errorMessage += 'Network error. Please check your connection.';
                    break;
                default:
                    errorMessage += 'Please try again or type your message.';
            }
            
            this.showNotification(errorMessage, 'error');
        };

        // Handle recognition end
        this.recognition.onend = () => {
            this.stopRecording();
        };

        // Handle recognition start
        this.recognition.onstart = () => {
            console.log('Voice recognition started');
            this.showNotification('Listening... Speak now!', 'info');
        };
    }

    startRecording() {
        if (!this.recognition) {
            this.showNotification('Voice recognition not supported in this browser', 'error');
            return;
        }

        if (this.isRecording) {
            this.stopRecording();
            return;
        }

        try {
            this.isRecording = true;
            const voiceBtn = document.getElementById('voiceBtn');
            if (voiceBtn) {
                voiceBtn.classList.add('recording');
                voiceBtn.title = 'Stop recording';
            }

            this.recognition.start();
        } catch (error) {
            console.error('Failed to start voice recognition:', error);
            this.stopRecording();
            this.showNotification('Failed to start voice recognition. Please try again.', 'error');
        }
    }

    stopRecording() {
        if (this.recognition && this.isRecording) {
            try {
                this.recognition.stop();
            } catch (error) {
                console.error('Error stopping recognition:', error);
            }
        }

        this.isRecording = false;
        const voiceBtn = document.getElementById('voiceBtn');
        if (voiceBtn) {
            voiceBtn.classList.remove('recording');
            voiceBtn.title = 'Voice Input';
        }
    }

    setupEventListeners() {
        // Chat functionality
        const chatInput = document.getElementById('chatInput');
        const sendBtn = document.getElementById('sendBtn');
        const voiceBtn = document.getElementById('voiceBtn');
        const imageBtn = document.getElementById('imageBtn');
        const imageInput = document.getElementById('imageInput');

        // AI Assistant toggle
        const aiAssistantBtn = document.getElementById('aiAssistantBtn');
        const chatPanel = document.getElementById('chatPanel');
        const chatOverlay = document.getElementById('chatOverlay');
        const closeChatBtn = document.getElementById('closeChatBtn');
        const minimizeChatBtn = document.getElementById('minimizeChatBtn');

        if (aiAssistantBtn) {
            aiAssistantBtn.addEventListener('click', () => {
                chatPanel.classList.add('active');
                chatOverlay.classList.add('active');
                chatInput?.focus();
            });
        }

        if (closeChatBtn) {
            closeChatBtn.addEventListener('click', () => {
                chatPanel.classList.remove('active');
                chatOverlay.classList.remove('active');
            });
        }

        if (minimizeChatBtn) {
            minimizeChatBtn.addEventListener('click', () => {
                chatPanel.classList.toggle('minimized');
            });
        }

        if (chatOverlay) {
            chatOverlay.addEventListener('click', () => {
                chatPanel.classList.remove('active');
                chatOverlay.classList.remove('active');
            });
        }

        // Send message functionality
        if (sendBtn) {
            sendBtn.addEventListener('click', () => {
                const message = chatInput?.value.trim();
                if (message) {
                    this.sendMessage(message);
                    chatInput.value = '';
                }
            });
        }

        if (chatInput) {
            chatInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    const message = chatInput.value.trim();
                    if (message) {
                        this.sendMessage(message);
                        chatInput.value = '';
                    }
                }
            });

            // Auto-resize textarea
            chatInput.addEventListener('input', () => {
                chatInput.style.height = 'auto';
                chatInput.style.height = Math.min(chatInput.scrollHeight, 120) + 'px';
            });
        }

        // Voice recording with improved error handling
        if (voiceBtn) {
            voiceBtn.addEventListener('click', () => {
                if (this.isRecording) {
                    this.stopRecording();
                } else {
                    // Request microphone permission first
                    navigator.mediaDevices.getUserMedia({ audio: true })
                        .then(() => {
                            this.startRecording();
                        })
                        .catch((error) => {
                            console.error('Microphone permission denied:', error);
                            this.showNotification('Microphone access is required for voice input. Please allow microphone access in your browser settings.', 'error');
                        });
                }
            });
        }

        // Image upload
        if (imageBtn && imageInput) {
            imageBtn.addEventListener('click', () => {
                imageInput.click();
            });

            imageInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    this.uploadImage(file);
                }
            });
        }

        // Quick actions
        document.querySelectorAll('.quick-action-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const action = btn.dataset.action;
                this.handleQuickAction(action);
            });
        });

        // Search functionality
        const searchBtn = document.getElementById('searchBtn');
        const searchInput = document.getElementById('searchInput');

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.filterProducts(btn.dataset.filter);
            });
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.toggleView(btn.dataset.view);
            });
        });

        // Load more products
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) {
            loadMoreBtn.addEventListener('click', () => {
                this.loadMoreProducts();
            });
        }

        // Co-browsing
        const coBrowseBtn = document.getElementById('coBrowseBtn');
        if (coBrowseBtn) {
            coBrowseBtn.addEventListener('click', () => {
                this.showCoBrowseModal();
            });
        }

        // Drag and drop for images
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.addEventListener('dragover', (e) => {
                e.preventDefault();
                chatMessages.classList.add('dragover');
            });

            chatMessages.addEventListener('dragleave', () => {
                chatMessages.classList.remove('dragover');
            });

            chatMessages.addEventListener('drop', (e) => {
                e.preventDefault();
                chatMessages.classList.remove('dragover');
                
                const files = Array.from(e.dataTransfer.files);
                const imageFile = files.find(file => file.type.startsWith('image/'));
                
                if (imageFile) {
                    this.uploadImage(imageFile);
                }
            });
        }
    }

    showNotification(message, type = 'info') {
        // Remove existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notification => notification.remove());

        // Create new notification
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;

        // Style based on type
        const colors = {
            info: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            error: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 100%)',
            success: 'linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%)',
            warning: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
        };

        notification.style.background = colors[type] || colors.info;
        document.body.appendChild(notification);

        // Show notification
        setTimeout(() => notification.classList.add('show'), 100);

        // Hide notification after 4 seconds
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 4000);
    }

    async sendMessage(message) {
        if (!message.trim()) return;

        this.addMessageToChat(message, 'user');
        this.showTypingIndicator();

        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    message,
                    context: this.getContext(),
                    userPreferences: this.getUserPreferences()
                }),
            });

            const data = await response.json();
            this.hideTypingIndicator();

            // Check if the response is an error type
            if (data.type === 'error') {
                this.addMessageToChat(data.message, 'bot');
                if (data.suggestions && Array.isArray(data.suggestions)) {
                    this.addSuggestionsToChat(data.suggestions);
                }
            } else {
                // Only process as product recommendation if it's not an error
                this.addProductRecommendationToChat(data);
            }
        } catch (error) {
            console.error('Chat error:', error);
            this.hideTypingIndicator();
            this.addMessageToChat('Sorry, I encountered an error. Please try again.', 'bot');
        }
    }

    addMessageToChat(message, sender) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = sender === 'user' ? '👤' : '🤖';

        const content = document.createElement('div');
        content.className = 'message-content';

        const text = document.createElement('div');
        text.className = 'message-text';
        text.textContent = message;

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        content.appendChild(text);
        content.appendChild(time);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addProductRecommendationToChat(data) {
        // Safety check - ensure data has required properties
        if (!data || !data.name || !data.id) {
            this.addMessageToChat('Sorry, I couldn\'t retrieve product information. Please try again.', 'bot');
            return;
        }

        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🤖';

        const content = document.createElement('div');
        content.className = 'message-content';

        // Main recommendation
        const suggestion = document.createElement('div');
        suggestion.className = 'product-suggestion enhanced';

        const header = document.createElement('div');
        header.className = 'suggestion-header';

        const image = document.createElement('img');
        image.className = 'suggestion-image';
        image.src = data.image || '';
        image.alt = data.name || '';

        const info = document.createElement('div');
        info.className = 'suggestion-info';

        const name = document.createElement('h4');
        name.textContent = data.name || '';

        const brand = document.createElement('div');
        brand.className = 'suggestion-brand';
        brand.textContent = data.brand || '';

        const priceDiv = document.createElement('div');
        priceDiv.className = 'suggestion-price';
        priceDiv.textContent = data.price || '';

        if (data.originalPrice) {
            const originalPrice = document.createElement('span');
            originalPrice.className = 'original-price';
            originalPrice.textContent = data.originalPrice;
            priceDiv.appendChild(originalPrice);
        }

        if (data.discount) {
            const discount = document.createElement('span');
            discount.className = 'suggestion-discount';
            discount.textContent = data.discount;
            priceDiv.appendChild(discount);
        }

        const rating = document.createElement('div');
        rating.className = 'suggestion-rating';
        rating.innerHTML = `⭐ ${data.rating || 0} (${data.reviews || 0} reviews)`;

        const availability = document.createElement('div');
        availability.className = 'suggestion-availability';
        availability.innerHTML = `📦 ${data.availability || 'Unknown'} • 🚚 ${data.shippingTime || 'Unknown'}`;

        info.appendChild(name);
        info.appendChild(brand);
        info.appendChild(priceDiv);
        info.appendChild(rating);
        info.appendChild(availability);

        header.appendChild(image);
        header.appendChild(info);

        // Features - safely handle array
        const features = document.createElement('div');
        features.className = 'suggestion-features';
        const featuresList = data.features && Array.isArray(data.features) ? data.features.slice(0, 3) : [];
        features.innerHTML = `<strong>Key Features:</strong> ${featuresList.join(', ') || 'Not specified'}`;

        // Colors - safely handle array
        if (data.colors && Array.isArray(data.colors) && data.colors.length > 0) {
            const colors = document.createElement('div');
            colors.className = 'suggestion-colors';
            colors.innerHTML = `<strong>Available Colors:</strong> ${data.colors.join(', ')}`;
            suggestion.appendChild(colors);
        }

        // Actions
        const actions = document.createElement('div');
        actions.className = 'suggestion-actions';

        const viewBtn = document.createElement('a');
        viewBtn.className = 'suggestion-link';
        viewBtn.href = data.link || '#';
        viewBtn.textContent = 'View Product';
        viewBtn.onclick = (e) => {
            e.preventDefault();
            this.highlightProduct(data.id);
        };

        const compareBtn = document.createElement('button');
        compareBtn.className = 'compare-btn';
        compareBtn.textContent = 'Add to Compare';
        compareBtn.onclick = () => this.addToComparison(data.id);

        actions.appendChild(viewBtn);
        actions.appendChild(compareBtn);

        suggestion.appendChild(header);
        suggestion.appendChild(features);
        suggestion.appendChild(actions);

        // Reason text
        const reasonText = document.createElement('div');
        reasonText.className = 'message-text';
        reasonText.textContent = data.reason || 'Here\'s a product recommendation for you:';

        content.appendChild(reasonText);
        content.appendChild(suggestion);

        // Alternatives - safely handle array
        if (data.alternatives && Array.isArray(data.alternatives) && data.alternatives.length > 0) {
            const alternativesSection = document.createElement('div');
            alternativesSection.className = 'alternatives-section';

            const alternativesTitle = document.createElement('h4');
            alternativesTitle.textContent = 'Similar Options:';
            alternativesSection.appendChild(alternativesTitle);

            const alternativesGrid = document.createElement('div');
            alternativesGrid.className = 'alternatives-grid';

            data.alternatives.forEach(alt => {
                // Safety check for each alternative
                if (!alt || !alt.name || !alt.id) return;

                const altItem = document.createElement('div');
                altItem.className = 'alternative-item enhanced';
                altItem.onclick = () => this.highlightProduct(alt.id);

                const altImage = document.createElement('img');
                altImage.className = 'alternative-image';
                altImage.src = alt.image || '';
                altImage.alt = alt.name || '';

                const altInfo = document.createElement('div');
                altInfo.className = 'alternative-info';

                const altName = document.createElement('div');
                altName.className = 'alternative-name';
                altName.textContent = alt.name || '';

                const altBrand = document.createElement('div');
                altBrand.className = 'alternative-brand';
                altBrand.textContent = alt.brand || '';

                const altPrice = document.createElement('div');
                altPrice.className = 'alternative-price';
                altPrice.textContent = alt.price || '';

                const altRating = document.createElement('div');
                altRating.className = 'alternative-rating';
                altRating.textContent = `⭐ ${alt.rating || 0}`;

                const altAvailability = document.createElement('div');
                altAvailability.className = 'alternative-availability';
                altAvailability.textContent = alt.availability || 'Unknown';

                altInfo.appendChild(altName);
                altInfo.appendChild(altBrand);
                altInfo.appendChild(altPrice);
                altInfo.appendChild(altRating);
                altInfo.appendChild(altAvailability);

                altItem.appendChild(altImage);
                altItem.appendChild(altInfo);

                alternativesGrid.appendChild(altItem);
            });

            alternativesSection.appendChild(alternativesGrid);
            content.appendChild(alternativesSection);
        }

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        content.appendChild(time);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    addSuggestionsToChat(suggestions) {
        // Safety check for suggestions array
        if (!suggestions || !Array.isArray(suggestions) || suggestions.length === 0) {
            return;
        }

        const chatMessages = document.getElementById('chatMessages');
        const suggestionsDiv = document.createElement('div');
        suggestionsDiv.className = 'message bot-message';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '💡';

        const content = document.createElement('div');
        content.className = 'message-content';

        const text = document.createElement('div');
        text.className = 'message-text';
        text.innerHTML = '<strong>Try these suggestions:</strong>';

        const suggestionsList = document.createElement('div');
        suggestionsList.className = 'feature-list';

        suggestions.forEach(suggestion => {
            if (!suggestion) return; // Skip empty suggestions

            const suggestionItem = document.createElement('div');
            suggestionItem.className = 'feature-item';
            suggestionItem.textContent = suggestion;
            suggestionItem.style.cursor = 'pointer';
            suggestionItem.onclick = () => {
                const cleanSuggestion = suggestion.replace('Try searching for ', '').replace('Ask for ', '').replace('Look for ', '').replace(/"/g, '');
                const chatInput = document.getElementById('chatInput');
                if (chatInput) {
                    chatInput.value = cleanSuggestion;
                    this.sendMessage(cleanSuggestion);
                }
            };
            suggestionsList.appendChild(suggestionItem);
        });

        content.appendChild(text);
        content.appendChild(suggestionsList);
        suggestionsDiv.appendChild(avatar);
        suggestionsDiv.appendChild(content);

        chatMessages.appendChild(suggestionsDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    showTypingIndicator() {
        const chatMessages = document.getElementById('chatMessages');
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.id = 'typing-indicator';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🤖';

        const content = document.createElement('div');
        content.className = 'message-content';

        const dots = document.createElement('div');
        dots.className = 'loading-dots';
        for (let i = 0; i < 3; i++) {
            const dot = document.createElement('div');
            dot.className = 'loading-dot';
            dots.appendChild(dot);
        }

        content.appendChild(dots);
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(content);

        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    hideTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async uploadImage(file) {
        if (!file.type.startsWith('image/')) {
            this.showNotification('Please upload an image file', 'error');
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            this.showNotification('Image size should be less than 5MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('image', file);

        this.addMessageToChat(`🖼️ Uploaded image: ${file.name}`, 'user');
        this.showTypingIndicator();

        try {
            const response = await fetch('/api/upload-image', {
                method: 'POST',
                body: formData,
            });

            const data = await response.json();
            this.hideTypingIndicator();

            if (data.success) {
                this.addImageAnalysisToChat(data);
            } else {
                this.addMessageToChat('Sorry, I couldn\'t analyze the image. Please try again.', 'bot');
            }
        } catch (error) {
            console.error('Image upload error:', error);
            this.hideTypingIndicator();
            this.addMessageToChat('Sorry, there was an error uploading the image.', 'bot');
        }
    }

    addImageAnalysisToChat(data) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot-message';

        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        avatar.textContent = '🔍';

        const content = document.createElement('div');
        content.className = 'message-content';

        const text = document.createElement('div');
        text.className = 'message-text';
        text.textContent = data.message;

        const confidenceScore = document.createElement('div');
        confidenceScore.className = 'confidence-score';
        confidenceScore.textContent = `Analysis Confidence: ${Math.round(data.analysisConfidence * 100)}%`;

        content.appendChild(text);
        content.appendChild(confidenceScore);

        // Similar products - safely handle array
        if (data.similarProducts && Array.isArray(data.similarProducts) && data.similarProducts.length > 0) {
            const alternativesSection = document.createElement('div');
            alternativesSection.className = 'alternatives-section';

            const alternativesTitle = document.createElement('h4');
            alternativesTitle.textContent = 'Visually Similar Products:';
            alternativesSection.appendChild(alternativesTitle);

            const alternativesGrid = document.createElement('div');
            alternativesGrid.className = 'alternatives-grid';

            data.similarProducts.forEach(product => {
                // Safety check for each product
                if (!product || !product.name || !product.id) return;

                const altItem = document.createElement('div');
                altItem.className = 'alternative-item enhanced';
                altItem.onclick = () => this.highlightProduct(product.id);

                const altImage = document.createElement('img');
                altImage.className = 'alternative-image';
                altImage.src = product.image || '';
                altImage.alt = product.name || '';

                const altInfo = document.createElement('div');
                altInfo.className = 'alternative-info';

                const altName = document.createElement('div');
                altName.className = 'alternative-name';
                altName.textContent = product.name || '';

                const altBrand = document.createElement('div');
                altBrand.className = 'alternative-brand';
                altBrand.textContent = product.brand || '';

                const altPrice = document.createElement('div');
                altPrice.className = 'alternative-price';
                altPrice.textContent = `$${product.price || 0}`;

                const altRating = document.createElement('div');
                altRating.className = 'alternative-rating';
                altRating.textContent = `⭐ ${product.rating || 0}`;

                const matchConfidence = document.createElement('div');
                matchConfidence.className = 'match-confidence';
                matchConfidence.textContent = `${Math.round((product.confidence || 0) * 100)}% match`;

                altInfo.appendChild(altName);
                altInfo.appendChild(altBrand);
                altInfo.appendChild(altPrice);
                altInfo.appendChild(altRating);
                altInfo.appendChild(matchConfidence);

                altItem.appendChild(altImage);
                altItem.appendChild(altInfo);

                alternativesGrid.appendChild(altItem);
            });

            alternativesSection.appendChild(alternativesGrid);
            content.appendChild(alternativesSection);
        }

        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        content.appendChild(time);
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);

        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    handleQuickAction(action) {
        const actions = {
            seasonal: 'Show me seasonal recommendations',
            deals: 'What are the best deals available?',
            trending: 'Show me trending products',
            compare: 'Help me compare products',
            gift: 'Suggest some gift ideas',
            cobrowse: () => this.showCoBrowseModal()
        };

        if (typeof actions[action] === 'function') {
            actions[action]();
        } else if (actions[action]) {
            document.getElementById('chatInput').value = actions[action];
            this.sendMessage(actions[action]);
        }
    }

    getContext() {
        return {
            currentPage: window.location.pathname,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };
    }

    getUserPreferences() {
        // Get user preferences from localStorage or default values
        return JSON.parse(localStorage.getItem('userPreferences')) || {
            priceRange: null,
            brands: [],
            categories: []
        };
    }

    async loadProducts() {
        try {
            const response = await fetch('/api/products');
            const products = await response.json();
            this.displayProducts(products);
            this.updateProductCount(products.length);
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    displayProducts(products) {
        const productsGrid = document.getElementById('productsGrid');
        if (!productsGrid) return;

        productsGrid.innerHTML = '';

        products.forEach((product, index) => {
            const productCard = this.createProductCard(product);
            productsGrid.appendChild(productCard);

            // Animate cards with stagger
            setTimeout(() => {
                productCard.classList.add('visible');
            }, index * 100);
        });
    }

    createProductCard(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.id = `product-${product.id}`;

        // Comparison checkbox
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'compare-checkbox';
        checkbox.onchange = () => this.toggleComparison(product.id, checkbox.checked);

        // Discount badge
        let discountBadge = '';
        if (product.discount > 0) {
            discountBadge = `<div class="discount-badge">${product.discount}% OFF</div>`;
        }

        // Colors
        let colorsHtml = '';
        if (product.colors && product.colors.length > 0) {
            colorsHtml = `
                <div class="product-colors">
                    ${product.colors.slice(0, 4).map(color => 
                        `<div class="color-option" style="background-color: ${color.toLowerCase()}" title="${color}"></div>`
                    ).join('')}
                </div>
            `;
        }

        // Features
        let featuresHtml = '';
        if (product.features && product.features.length > 0) {
            featuresHtml = `
                <div class="product-features">
                    ${product.features.slice(0, 3).map(feature => 
                        `<span class="feature-tag">${feature}</span>`
                    ).join('')}
                </div>
            `;
        }

        card.innerHTML = `
            ${discountBadge}
            <img src="${product.image}" alt="${product.name}" class="product-image" loading="lazy">
            <div class="product-info">
                <div class="product-header">
                    <h3 class="product-name">${product.name}</h3>
                    <div class="product-rating">⭐ ${product.rating}</div>
                </div>
                <div class="product-brand">${product.brand}</div>
                <div class="product-category">${product.category}</div>
                <div class="product-price">
                    $${product.price}
                    ${product.originalPrice > product.price ? `<span class="original-price">$${product.originalPrice}</span>` : ''}
                </div>
                <div class="availability ${product.availability.replace(' ', '-')}">${product.availability}</div>
                <p class="product-description">${product.description}</p>
                ${featuresHtml}
                ${colorsHtml}
                <div class="product-actions">
                    <button class="action-btn primary" onclick="window.shoppingAssistant.viewProduct(${product.id})">View Details</button>
                    <button class="action-btn secondary" onclick="window.shoppingAssistant.addToComparison(${product.id})">Compare</button>
                </div>
                <div class="product-meta">
                    <span>${product.reviews} reviews</span>
                    <span>🚚 ${product.shippingTime}</span>
                </div>
            </div>
        `;

        card.insertBefore(checkbox, card.firstChild);
        return card;
    }

    updateProductCount(count) {
        const productCountElement = document.getElementById('productCount');
        if (productCountElement) {
            productCountElement.textContent = `${count}+`;
        }
    }

    highlightProduct(productId) {
        // Remove existing highlights
        document.querySelectorAll('.product-card.highlighted').forEach(card => {
            card.classList.remove('highlighted');
        });

        // Highlight the specific product
        const productCard = document.getElementById(`product-${productId}`);
        if (productCard) {
            productCard.classList.add('highlighted');
            productCard.scrollIntoView({ behavior: 'smooth', block: 'center' });

            // Remove highlight after animation
            setTimeout(() => {
                productCard.classList.remove('highlighted');
            }, 3000);
        }
    }

    viewProduct(productId) {
        this.highlightProduct(productId);
        // Additional product view logic can be added here
    }

    toggleComparison(productId, isChecked) {
        if (isChecked) {
            this.comparisonProducts.add(productId);
        } else {
            this.comparisonProducts.delete(productId);
        }

        this.updateComparisonBar();
    }

    addToComparison(productId) {
        if (this.comparisonProducts.size >= 4) {
            this.showNotification('You can compare up to 4 products at a time', 'warning');
            return;
        }

        this.comparisonProducts.add(productId);
        const checkbox = document.querySelector(`#product-${productId} .compare-checkbox`);
        if (checkbox) {
            checkbox.checked = true;
        }

        const productCard = document.getElementById(`product-${productId}`);
        if (productCard) {
            productCard.classList.add('selected-for-comparison');
        }

        this.updateComparisonBar();
        this.showNotification('Product added to comparison', 'success');
    }

    updateComparisonBar() {
        let comparisonBar = document.querySelector('.comparison-bar');
        
        if (this.comparisonProducts.size === 0) {
            if (comparisonBar) {
                comparisonBar.classList.remove('active');
            }
            return;
        }

        if (!comparisonBar) {
            comparisonBar = document.createElement('div');
            comparisonBar.className = 'comparison-bar';
            comparisonBar.innerHTML = `
                <div class="comparison-info">
                    <div class="comparison-count"></div>
                    <div class="comparison-actions">
                        <button class="compare-now-btn">Compare Now</button>
                        <button class="clear-comparison-btn">Clear All</button>
                    </div>
                </div>
            `;
            document.body.appendChild(comparisonBar);

            // Add event listeners
            comparisonBar.querySelector('.compare-now-btn').onclick = () => this.compareProducts();
            comparisonBar.querySelector('.clear-comparison-btn').onclick = () => this.clearComparison();
        }

        const countElement = comparisonBar.querySelector('.comparison-count');
        countElement.textContent = `${this.comparisonProducts.size} product${this.comparisonProducts.size > 1 ? 's' : ''} selected for comparison`;

        comparisonBar.classList.add('active');
    }

    async compareProducts() {
        if (this.comparisonProducts.size < 2) {
            this.showNotification('Please select at least 2 products to compare', 'warning');
            return;
        }

        try {
            const response = await fetch('/api/compare', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    productIds: Array.from(this.comparisonProducts)
                }),
            });

            const data = await response.json();
            this.showComparisonModal(data);
        } catch (error) {
            console.error('Comparison error:', error);
            this.showNotification('Error comparing products', 'error');
        }
    }

    showComparisonModal(data) {
        let modal = document.getElementById('comparisonModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'comparisonModal';
            modal.className = 'comparison-modal';
            document.body.appendChild(modal);
        }

        const modalContent = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Smart Product Comparison</h3>
                    <button class="close-btn" onclick="this.closest('.comparison-modal').classList.remove('active')">×</button>
                </div>
                <div class="comparison-content">
                    ${this.generateComparisonContent(data)}
                </div>
            </div>
        `;

        modal.innerHTML = modalContent;
        modal.classList.add('active');
    }

    generateComparisonContent(data) {
        const { products, comparison } = data;

        let content = `
            <div class="comparison-summary">
                <h4>Comparison Summary</h4>
                <div class="summary-stats">
                    <div class="stat">
                        <div class="stat-label">Price Range</div>
                        <div class="stat-value">$${comparison.priceRange.min} - $${comparison.priceRange.max}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Avg Rating</div>
                        <div class="stat-value">${comparison.avgRating.toFixed(1)}⭐</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Total Reviews</div>
                        <div class="stat-value">${comparison.totalReviews.toLocaleString()}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label">Best Value</div>
                        <div class="stat-value">${comparison.bestValue.name}</div>
                    </div>
                </div>
                <div class="recommendations">
                    <div class="recommendation">
                        <strong>💰 Best Value:</strong> ${comparison.bestValue.name} - Great balance of price and rating
                    </div>
                    <div class="recommendation">
                        <strong>⭐ Most Popular:</strong> ${comparison.mostPopular.name} - ${comparison.mostPopular.reviews} reviews
                    </div>
                </div>
            </div>
        `;

        // Comparison table
        content += `
            <div class="comparison-table-container">
                <table class="comparison-table">
                    <thead>
                        <tr>
                            <th>Product</th>
                            <th>Price</th>
                            <th>Rating</th>
                            <th>Features</th>
                            <th>Availability</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        products.forEach(product => {
            content += `
                <tr>
                    <td>
                        <div class="comparison-product">
                            <img src="${product.image}" alt="${product.name}">
                            <div class="product-details">
                                <strong>${product.name}</strong>
                                <div class="product-brand">${product.brand}</div>
                            </div>
                        </div>
                    </td>
                    <td>
                        <div class="price-info">
                            <strong>$${product.price}</strong>
                            ${product.discount > 0 ? `<div class="discount-text">${product.discount}% OFF</div>` : ''}
                        </div>
                    </td>
                    <td>
                        <div class="rating-info">
                            <strong>⭐ ${product.rating}</strong>
                            <div>${product.reviews} reviews</div>
                        </div>
                    </td>
                    <td>
                        <div class="features-list">
                            ${product.features.slice(0, 3).map(feature => 
                                `<span class="feature-tag ${comparison.commonFeatures.includes(feature) ? 'common' : ''}">${feature}</span>`
                            ).join('')}
                        </div>
                    </td>
                    <td>
                        <div class="availability-info">
                            <div class="status ${product.availability.replace(' ', '-')}">${product.availability}</div>
                            <div>🚚 ${product.shippingTime}</div>
                        </div>
                    </td>
                </tr>
            `;
        });

        content += `
                    </tbody>
                </table>
            </div>
        `;

        // Common features
        if (comparison.commonFeatures.length > 0) {
            content += `
                <div class="common-features">
                    <h4>Common Features</h4>
                    <div class="features-grid">
                        ${comparison.commonFeatures.map(feature => 
                            `<span class="feature-tag common">${feature}</span>`
                        ).join('')}
                    </div>
                </div>
            `;
        }

        return content;
    }

    clearComparison() {
        this.comparisonProducts.clear();
        
        // Remove checkmarks and highlights
        document.querySelectorAll('.compare-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
        
        document.querySelectorAll('.selected-for-comparison').forEach(card => {
            card.classList.remove('selected-for-comparison');
        });

        this.updateComparisonBar();
        this.showNotification('Comparison cleared', 'info');
    }

    async performSearch() {
        const searchInput = document.getElementById('searchInput');
        const categoryFilter = document.getElementById('categoryFilter');
        const priceFilter = document.getElementById('priceFilter');
        const sortFilter = document.getElementById('sortFilter');

        const params = new URLSearchParams({
            q: searchInput.value,
            category: categoryFilter.value,
            priceRange: priceFilter.value,
            sortBy: sortFilter.value
        });

        try {
            const response = await fetch(`/api/search?${params}`);
            const data = await response.json();
            this.displayProducts(data.results);
            this.updateProductCount(data.results.length);
        } catch (error) {
            console.error('Search error:', error);
        }
    }

    filterProducts(filter) {
        // Implement product filtering logic
        console.log('Filtering products by:', filter);
    }

    toggleView(view) {
        const productsGrid = document.getElementById('productsGrid');
        if (view === 'list') {
            productsGrid.classList.add('list-view');
        } else {
            productsGrid.classList.remove('list-view');
        }
    }

    loadMoreProducts() {
        // Implement load more functionality
        console.log('Loading more products...');
    }

    // Co-browsing functionality
    setupCoBrowsing() {
        this.socket = io();

        this.socket.on('user-joined', (data) => {
            this.addCoBrowseMessage(`User joined the session (${data.userCount} users online)`);
            this.updateUserCount(data.userCount);
        });

        this.socket.on('user-left', (data) => {
            this.addCoBrowseMessage(`User left the session (${data.userCount} users online)`);
            this.updateUserCount(data.userCount);
        });

        this.socket.on('cursor-move', (data) => {
            this.updateRemoteCursor(data);
        });

        this.socket.on('product-select', (data) => {
            this.highlightProduct(data.productId);
        });

        this.socket.on('co-browse-chat', (data) => {
            if (data.userId !== this.socket.id) {
                this.addCoBrowseMessage(data.message, data.userId);
            }
        });

        // Track cursor movement
        document.addEventListener('mousemove', (e) => {
            if (this.sessionId) {
                this.socket.emit('cursor-move', {
                    x: e.clientX,
                    y: e.clientY
                });
            }
        });
    }

    showCoBrowseModal() {
        let modal = document.getElementById('coBrowseModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'coBrowseModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Start Co-browsing Session</h3>
                        <button class="close-btn" onclick="this.closest('.modal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <p>Share your shopping experience with friends and family!</p>
                        <div class="session-options">
                            <button class="option-btn" id="createSessionBtn">
                                <span class="option-icon">➕</span>
                                <div class="option-text">
                                    <strong>Create New Session</strong>
                                    <small>Start a new co-browsing session</small>
                                </div>
                            </button>
                            <div class="option-divider">or</div>
                            <div class="join-session">
                                <input type="text" id="sessionIdInput" placeholder="Enter session ID to join">
                                <button class="option-btn" id="joinSessionBtn">
                                    <span class="option-icon">🔗</span>
                                    <span>Join Session</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add event listeners
            document.getElementById('createSessionBtn').onclick = () => this.createCoBrowseSession();
            document.getElementById('joinSessionBtn').onclick = () => this.joinCoBrowseSession();
        }

        modal.classList.add('active');
    }

    async createCoBrowseSession() {
        try {
            const response = await fetch('/api/create-session', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            this.sessionId = data.sessionId;
            this.socket.emit('join-session', this.sessionId);
            
            this.showCoBrowseStatus();
            this.closeCoBrowseModal();
            this.showShareSessionModal();
            
            this.showNotification('Co-browsing session created!', 'success');
        } catch (error) {
            console.error('Error creating session:', error);
            this.showNotification('Failed to create session', 'error');
        }
    }

    joinCoBrowseSession() {
        const sessionIdInput = document.getElementById('sessionIdInput');
        const sessionId = sessionIdInput.value.trim();

        if (!sessionId) {
            this.showNotification('Please enter a session ID', 'warning');
            return;
        }

        this.sessionId = sessionId;
        this.socket.emit('join-session', this.sessionId);
        
        this.showCoBrowseStatus();
        this.closeCoBrowseModal();
        
        this.showNotification('Joined co-browsing session!', 'success');
    }

    showCoBrowseStatus() {
        const statusBar = document.getElementById('coBrowseStatus');
        if (statusBar) {
            statusBar.style.display = 'block';
            document.getElementById('sessionInfo').textContent = `Session: ${this.sessionId}`;
        }

        // Add event listeners for status bar
        const shareBtn = document.getElementById('shareSessionBtn');
        const leaveBtn = document.getElementById('leaveSessionBtn');

        if (shareBtn) {
            shareBtn.onclick = () => this.showShareSessionModal();
        }

        if (leaveBtn) {
            leaveBtn.onclick = () => this.leaveCoBrowseSession();
        }
    }

    showShareSessionModal() {
        let modal = document.getElementById('shareSessionModal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'shareSessionModal';
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Share Co-browsing Session</h3>
                        <button class="close-btn" onclick="this.closest('.modal').classList.remove('active')">×</button>
                    </div>
                    <div class="modal-body">
                        <p>Share this session ID with others to join your session:</p>
                        <div class="share-link-container">
                            <input type="text" id="shareLink" readonly value="${this.sessionId}">
                            <button class="copy-btn" id="copyLinkBtn">Copy</button>
                        </div>
                        <div class="share-options">
                            <button class="share-option" data-platform="whatsapp">WhatsApp</button>
                            <button class="share-option" data-platform="email">Email</button>
                            <button class="share-option" data-platform="copy">Copy Link</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add event listeners
            document.getElementById('copyLinkBtn').onclick = () => this.copySessionId();
            document.querySelectorAll('.share-option').forEach(btn => {
                btn.onclick = () => this.shareSession(btn.dataset.platform);
            });
        }

        modal.classList.add('active');
    }

    copySessionId() {
        const shareLink = document.getElementById('shareLink');
        shareLink.select();
        document.execCommand('copy');
        this.showNotification('Session ID copied to clipboard!', 'success');
    }

    shareSession(platform) {
        const sessionId = this.sessionId;
        const message = `Join my shopping session! Session ID: ${sessionId}`;

        switch (platform) {
            case 'whatsapp':
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`);
                break;
            case 'email':
                window.open(`mailto:?subject=Join my shopping session&body=${encodeURIComponent(message)}`);
                break;
            case 'copy':
                navigator.clipboard.writeText(message);
                this.showNotification('Share message copied!', 'success');
                break;
        }
    }

    leaveCoBrowseSession() {
        if (this.sessionId) {
            this.socket.emit('leave-session', this.sessionId);
            this.sessionId = null;
            
            const statusBar = document.getElementById('coBrowseStatus');
            if (statusBar) {
                statusBar.style.display = 'none';
            }

            this.showNotification('Left co-browsing session', 'info');
        }
    }

    closeCoBrowseModal() {
        const modal = document.getElementById('coBrowseModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    updateUserCount(count) {
        const userCountElement = document.getElementById('userCount');
        if (userCountElement) {
            userCountElement.textContent = `${count} user${count > 1 ? 's' : ''}`;
        }
    }

    addCoBrowseMessage(message, userId = null) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message co-browse-message';
        messageDiv.textContent = message;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    updateRemoteCursor(data) {
        let cursor = document.getElementById(`cursor-${data.userId}`);
        if (!cursor) {
            cursor = document.createElement('div');
            cursor.id = `cursor-${data.userId}`;
            cursor.className = 'remote-cursor';
            cursor.textContent = '👆';
            document.getElementById('cursors-container').appendChild(cursor);
        }

        cursor.style.left = data.x + 'px';
        cursor.style.top = data.y + 'px';
    }

    animateElements() {
        // Animate elements on scroll
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        });

        document.querySelectorAll('.product-card, .feature-badge, .stat').forEach(el => {
            observer.observe(el);
        });
    }
}

// Initialize the shopping assistant
document.addEventListener('DOMContentLoaded', () => {
    window.shoppingAssistant = new ShoppingAssistant();
});