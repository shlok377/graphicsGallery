class GalleryApp {
    constructor() {
        this.currentSection = null;
        this.currentImageIndex = 0;
        this.currentImages = [];
        this.isLoading = false;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.preloadImages();
        this.addLoadingStates();
        this.createImageCounter();
    }

    setupEventListeners() {
        // Expand/collapse section buttons
        document.querySelectorAll('.expand-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const target = e.currentTarget.dataset.target;
                this.toggleSection(target, e.currentTarget);
            });
        });

        // Image click handlers
        document.querySelectorAll('.image-card').forEach(card => {
            card.addEventListener('click', (e) => {
                const src = e.currentTarget.dataset.src;
                const section = e.currentTarget.closest('.gallery-section');
                this.openModal(src, section);
            });
        });

        // Modal controls
        const modal = document.getElementById('imageModal');
        if (modal) {
            const backdrop = modal.querySelector('.modal-backdrop');
            const closeBtn = modal.querySelector('.modal-close');
            const prevBtn = modal.querySelector('.prev-btn');
            const nextBtn = modal.querySelector('.next-btn');

            if (backdrop) backdrop.addEventListener('click', (e) => {
                if (e.target === backdrop) this.closeModal();
            });
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
            if (prevBtn) prevBtn.addEventListener('click', () => this.navigateImage(-1));
            if (nextBtn) nextBtn.addEventListener('click', () => this.navigateImage(1));
        }

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            const modal = document.getElementById('imageModal');
            if (modal && modal.classList.contains('show')) {
                switch (e.key) {
                    case 'Escape':
                        this.closeModal();
                        break;
                    case 'ArrowLeft':
                        e.preventDefault();
                        this.navigateImage(-1);
                        break;
                    case 'ArrowRight':
                        e.preventDefault();
                        this.navigateImage(1);
                        break;
                    case ' ':
                        e.preventDefault();
                        this.navigateImage(1);
                        break;
                }
            }
        });

        // Touch gestures for mobile
        this.setupTouchGestures();
    }

    setupTouchGestures() {
        const modal = document.getElementById('imageModal');
        if (!modal) return;

        let startX = 0;
        let startY = 0;
        let isDragging = false;

        modal.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            isDragging = false;
        }, { passive: true });

        modal.addEventListener('touchmove', (e) => {
            if (!startX || !startY) return;
            isDragging = true;
        }, { passive: true });

        modal.addEventListener('touchend', (e) => {
            if (!startX || !startY || !isDragging) return;

            const endX = e.changedTouches[0].clientX;
            const endY = e.changedTouches[0].clientY;
            const diffX = startX - endX;
            const diffY = startY - endY;

            // Minimum swipe distance
            const minSwipeDistance = 50;

            // Horizontal swipe detection
            if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > minSwipeDistance) {
                if (diffX > 0) {
                    this.navigateImage(1); // Swipe left - next image
                } else {
                    this.navigateImage(-1); // Swipe right - previous image
                }
            }

            // Vertical swipe down to close
            if (diffY < -100 && Math.abs(diffX) < minSwipeDistance) {
                this.closeModal();
            }

            startX = 0;
            startY = 0;
            isDragging = false;
        }, { passive: true });
    }

    toggleSection(sectionName, button) {
        const expandedGrid = document.getElementById(`${sectionName}-expanded`);
        if (!expandedGrid || !button) return;

        const isExpanded = expandedGrid.classList.contains('show');
        const expandText = button.querySelector('.expand-text');

        if (isExpanded) {
            // Collapse
            expandedGrid.classList.remove('show');
            button.classList.remove('expanded');
            if (expandText) expandText.textContent = 'View All';
        } else {
            // Expand
            expandedGrid.classList.add('show');
            button.classList.add('expanded');
            if (expandText) expandText.textContent = 'Show Less';

            // Smooth scroll to section
            setTimeout(() => {
                expandedGrid.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest'
                });
            }, 100);
        }
    }

    openModal(imageSrc, section) {
        const modal = document.getElementById('imageModal');
        const modalImage = modal?.querySelector('.modal-image');
        const loadingIndicator = modal?.querySelector('.loading-indicator');

        if (!modal || !modalImage) return;

        // Show loading state
        this.showLoading(true);

        // Get all images from the section
        this.currentImages = Array.from(section.querySelectorAll('.image-card'))
            .map(card => ({
                src: card.dataset.src,
                alt: card.querySelector('img')?.alt || 'Gallery image',
                title: card.querySelector('img')?.title || ''
            }));

        // Find current image index
        this.currentImageIndex = this.currentImages.findIndex(img => img.src === imageSrc);
        if (this.currentImageIndex === -1) this.currentImageIndex = 0;

        // Load and display image
        this.loadModalImage(this.currentImages[this.currentImageIndex]);

        // Show modal with animation
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';

        // Update navigation buttons
        this.updateNavigationButtons();
        this.updateImageCounter();

        // Focus trap for accessibility
        this.trapFocus(modal);

        // Preload adjacent images
        this.preloadAdjacentImages();
    }

    loadModalImage(imageData) {
        const modal = document.getElementById('imageModal');
        const modalImage = modal?.querySelector('.modal-image');
        const imageTitle = modal?.querySelector('.image-title');

        if (!modalImage) return;

        this.showLoading(true);

        // Create new image element for loading
        const tempImage = new Image();

        tempImage.onload = () => {
            // Fade out current image
            modalImage.style.opacity = '0';
            modalImage.style.transform = 'scale(0.95)';

            setTimeout(() => {
                modalImage.src = imageData.src;
                modalImage.alt = imageData.alt;

                // Update title if exists
                if (imageTitle) {
                    imageTitle.textContent = imageData.title || imageData.alt;
                    imageTitle.style.display = imageData.title ? 'block' : 'none';
                }

                // Fade in new image
                modalImage.style.opacity = '1';
                modalImage.style.transform = 'scale(1)';
                this.showLoading(false);
            }, 200);
        };

        tempImage.onerror = () => {
            this.showLoading(false);
            this.showError('Failed to load image');
        };

        tempImage.src = imageData.src;
    }

    showLoading(show) {
        const modal = document.getElementById('imageModal');
        const loadingIndicator = modal?.querySelector('.loading-indicator');

        if (loadingIndicator) {
            loadingIndicator.style.display = show ? 'flex' : 'none';
        }
        this.isLoading = show;
    }

    showError(message) {
        const modal = document.getElementById('imageModal');
        const errorMessage = modal?.querySelector('.error-message');

        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.style.display = 'block';
            setTimeout(() => {
                errorMessage.style.display = 'none';
            }, 3000);
        }
    }

    closeModal() {
        const modal = document.getElementById('imageModal');
        if (!modal) return;

        modal.classList.remove('show');
        document.body.style.overflow = 'auto';

        // Clear any error messages
        const errorMessage = modal.querySelector('.error-message');
        if (errorMessage) errorMessage.style.display = 'none';

        // Remove focus trap
        document.removeEventListener('focusin', this.focusTrapHandler);
    }

    navigateImage(direction) {
        if (this.currentImages.length === 0 || this.isLoading) return;

        this.currentImageIndex += direction;

        // Wrap around
        if (this.currentImageIndex < 0) {
            this.currentImageIndex = this.currentImages.length - 1;
        } else if (this.currentImageIndex >= this.currentImages.length) {
            this.currentImageIndex = 0;
        }

        const currentImage = this.currentImages[this.currentImageIndex];
        this.loadModalImage(currentImage);

        // Update UI elements
        this.updateNavigationButtons();
        this.updateImageCounter();

        // Preload adjacent images
        this.preloadAdjacentImages();
    }

    updateNavigationButtons() {
        const modal = document.getElementById('imageModal');
        const prevBtn = modal?.querySelector('.prev-btn');
        const nextBtn = modal?.querySelector('.next-btn');

        if (!prevBtn || !nextBtn) return;

        // Show/hide buttons based on image count
        const showButtons = this.currentImages.length > 1;
        prevBtn.style.display = showButtons ? 'flex' : 'none';
        nextBtn.style.display = showButtons ? 'flex' : 'none';
    }

    createImageCounter() {
        const modal = document.getElementById('imageModal');
        if (!modal || modal.querySelector('.image-counter')) return;

        const counter = document.createElement('div');
        counter.className = 'image-counter';
        counter.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 8px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 500;
            z-index: 1001;
        `;

        modal.appendChild(counter);
    }

    updateImageCounter() {
        const modal = document.getElementById('imageModal');
        const counter = modal?.querySelector('.image-counter');

        if (counter && this.currentImages.length > 1) {
            counter.textContent = `${this.currentImageIndex + 1} / ${this.currentImages.length}`;
            counter.style.display = 'block';
        } else if (counter) {
            counter.style.display = 'none';
        }
    }

    preloadAdjacentImages() {
        if (this.currentImages.length === 0) return;

        const preloadIndexes = [
            this.currentImageIndex - 1,
            this.currentImageIndex + 1
        ];

        preloadIndexes.forEach(index => {
            // Handle wrapping
            if (index < 0) index = this.currentImages.length - 1;
            if (index >= this.currentImages.length) index = 0;

            if (this.currentImages[index] && index !== this.currentImageIndex) {
                const img = new Image();
                img.src = this.currentImages[index].src;
            }
        });
    }

    preloadImages() {
        // Preload thumbnail images first
        const allImages = document.querySelectorAll('.image-card[data-src]');
        const loadPromises = [];

        allImages.forEach(card => {
            const promise = new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve();
                img.onerror = () => resolve(); // Resolve anyway to not block
                img.src = card.dataset.src;
            });
            loadPromises.push(promise);
        });

        // Optional: Show loading complete indicator
        Promise.all(loadPromises).then(() => {
            console.log('All images preloaded');
        });
    }

    addLoadingStates() {
        document.querySelectorAll('.image-card img').forEach(img => {
            // Add loading state
            img.style.opacity = '0';
            img.style.transition = 'opacity 0.3s ease';

            img.addEventListener('load', () => {
                img.style.opacity = '1';
            });

            img.addEventListener('error', () => {
                // Create placeholder for broken images
                const placeholder = document.createElement('div');
                placeholder.className = 'image-placeholder';
                placeholder.style.cssText = `
                    width: 100%;
                    height: 200px;
                    background: #f0f0f0;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #666;
                    font-size: 14px;
                `;
                placeholder.textContent = 'Image unavailable';

                img.parentElement.replaceChild(placeholder, img);
            });
        });
    }

    trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        this.focusTrapHandler = (e) => {
            if (!modal.contains(e.target)) {
                firstElement?.focus();
            }
        };

        document.addEventListener('focusin', this.focusTrapHandler);

        // Focus the close button initially
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.focus();
    }

    // Public method to open modal from external code
    openImageModal(imageSrc, sectionSelector = null) {
        const section = sectionSelector ?
            document.querySelector(sectionSelector) :
            document.querySelector('.gallery-section');

        if (section) {
            this.openModal(imageSrc, section);
        }
    }

    // Public method to add new images dynamically
    addImagesToSection(sectionSelector, images) {
        const section = document.querySelector(sectionSelector);
        if (!section) return;

        images.forEach(image => {
            const card = document.createElement('div');
            card.className = 'image-card';
            card.dataset.src = image.src;

            const img = document.createElement('img');
            img.src = image.thumbnail || image.src;
            img.alt = image.alt || 'Gallery image';
            img.title = image.title || '';

            card.appendChild(img);
            section.appendChild(card);

            // Add click handler
            card.addEventListener('click', (e) => {
                this.openModal(image.src, section);
            });
        });

        // Reapply loading states
        this.addLoadingStates();
    }
}

// Initialize the gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.galleryApp = new GalleryApp();
});

// Add smooth scrolling for better UX
document.documentElement.style.scrollBehavior = 'smooth';

// Intersection Observer for lazy loading animations
const observerOptions = {
    threshold: 0.1,
    rootMargin: '50px 0px'
};

const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, observerOptions);

// Observe gallery sections for entrance animations
document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.gallery-section').forEach((section, index) => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(30px)';
        section.style.transition = `opacity 0.6s ease ${index * 0.1}s, transform 0.6s ease ${index * 0.1}s`;
        observer.observe(section);
    });

    // Add required modal HTML if it doesn't exist
    if (!document.getElementById('imageModal')) {
        const modalHTML = `
            <div id="imageModal" class="modal">
                <div class="modal-backdrop"></div>
                <div class="modal-content">
                    <button class="modal-close" aria-label="Close modal">&times;</button>
                    <div class="loading-indicator">
                        <div class="spinner"></div>
                        <span>Loading...</span>
                    </div>
                    <div class="error-message" style="display: none;"></div>
                    <img class="modal-image" alt="" />
                    <div class="image-title" style="display: none;"></div>
                    <button class="prev-btn nav-btn" aria-label="Previous image">&#8249;</button>
                    <button class="next-btn nav-btn" aria-label="Next image">&#8250;</button>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    }
});