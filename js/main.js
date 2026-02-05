/* =====================================================
   DROMTRASNA CHALLENGE - MAIN JAVASCRIPT
   ===================================================== */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize all modules
    initNavigation();
    initCountdown();
    initScrollAnimations();
    initStaggeredGrids();
    initFAQ();
    initGallery();
    initSponsorMarquee();
    initAnimatedCounter();
    initParallax();

    // Add loaded class to hero for animation
    setTimeout(() => {
        document.querySelector('.hero')?.classList.add('loaded');
    }, 100);
});

/* =====================================================
   NAVIGATION
   ===================================================== */
function initNavigation() {
    const header = document.getElementById('nav-header');
    const toggle = document.getElementById('nav-toggle');
    const menu = document.getElementById('nav-menu');
    const backdrop = document.getElementById('nav-backdrop');
    const dropdowns = document.querySelectorAll('.dropdown');

    function closeMenu() {
        toggle?.classList.remove('active');
        menu?.classList.remove('active');
        backdrop?.classList.remove('active');
        toggle?.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
    }

    // Mobile menu toggle
    toggle?.addEventListener('click', () => {
        const isOpen = menu.classList.contains('active');
        if (isOpen) {
            closeMenu();
        } else {
            toggle.classList.add('active');
            menu.classList.add('active');
            backdrop?.classList.add('active');
            toggle.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
        }
    });

    // Close menu when clicking backdrop
    backdrop?.addEventListener('click', closeMenu);

    // Close menu when clicking a link
    menu?.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // Close menu on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && menu?.classList.contains('active')) {
            closeMenu();
            toggle?.focus();
        }
    });

    // Dropdown toggles
    dropdowns.forEach(dropdown => {
        const button = dropdown.querySelector('.dropdown-toggle');

        button?.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdown.classList.contains('active');

            // Close all dropdowns
            dropdowns.forEach(d => d.classList.remove('active'));

            // Toggle current
            if (!isOpen) {
                dropdown.classList.add('active');
                button.setAttribute('aria-expanded', 'true');
            } else {
                button.setAttribute('aria-expanded', 'false');
            }
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        dropdowns.forEach(d => {
            d.classList.remove('active');
            d.querySelector('.dropdown-toggle')?.setAttribute('aria-expanded', 'false');
        });
    });

    // Header scroll effect
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header?.classList.add('scrolled');
        } else {
            header?.classList.remove('scrolled');
        }
    }, { passive: true });

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                target.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });
}

/* =====================================================
   COUNTDOWN TIMER
   ===================================================== */
function initCountdown() {
    const eventDate = new Date('October 17, 2026 10:00:00').getTime();

    const daysEl = document.getElementById('countdown-days');
    const hoursEl = document.getElementById('countdown-hours');
    const minutesEl = document.getElementById('countdown-minutes');
    const secondsEl = document.getElementById('countdown-seconds');

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function triggerDigitChange(el) {
        if (reducedMotion) return;
        el.classList.remove('digit-change');
        // Reflow trick to restart animation
        void el.offsetWidth;
        el.classList.add('digit-change');
    }

    function updateDigit(el, newValue) {
        const oldValue = el.textContent;
        if (oldValue !== newValue) {
            el.textContent = newValue;
            triggerDigitChange(el);
        }
    }

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = eventDate - now;

        if (distance < 0) {
            updateDigit(daysEl, '0');
            updateDigit(hoursEl, '00');
            updateDigit(minutesEl, '00');
            updateDigit(secondsEl, '00');
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        updateDigit(daysEl, days.toString());
        updateDigit(hoursEl, hours.toString().padStart(2, '0'));
        updateDigit(minutesEl, minutes.toString().padStart(2, '0'));
        updateDigit(secondsEl, seconds.toString().padStart(2, '0'));
    }

    // Initial update
    updateCountdown();

    // Update every second
    setInterval(updateCountdown, 1000);
}

/* =====================================================
   SCROLL ANIMATIONS (Intersection Observer)
   ===================================================== */
function initScrollAnimations() {
    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-fade').forEach(el => {
            el.classList.add('visible');
        });
        return;
    }

    const reveals = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .reveal-fade');

    if (reveals.length === 0) return;

    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    reveals.forEach(reveal => {
        observer.observe(reveal);
    });
}

/* =====================================================
   STAGGERED GRID ANIMATIONS
   ===================================================== */
function initStaggeredGrids() {
    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        document.querySelectorAll('.stagger-item').forEach(el => {
            el.classList.add('visible');
        });
        return;
    }

    const containers = document.querySelectorAll('[data-stagger]');

    if (containers.length === 0) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const container = entry.target;
                const staggerDelay = parseFloat(container.dataset.stagger) || 0.12;
                const items = container.querySelectorAll('.stagger-item');

                items.forEach((item, index) => {
                    item.style.transitionDelay = `${index * staggerDelay}s`;
                    item.classList.add('visible');
                });

                observer.unobserve(container);
            }
        });
    }, {
        root: null,
        rootMargin: '0px 0px -50px 0px',
        threshold: 0.1
    });

    containers.forEach(container => {
        observer.observe(container);
    });
}

/* =====================================================
   FAQ ACCORDION
   ===================================================== */
function initFAQ() {
    const faqItems = document.querySelectorAll('.faq-item');

    faqItems.forEach(item => {
        const question = item.querySelector('.faq-question');

        question?.addEventListener('click', () => {
            const isOpen = item.classList.contains('active');

            // Close all items
            faqItems.forEach(faq => {
                faq.classList.remove('active');
                faq.querySelector('.faq-question')?.setAttribute('aria-expanded', 'false');
            });

            // Toggle current item
            if (!isOpen) {
                item.classList.add('active');
                question.setAttribute('aria-expanded', 'true');
            }
        });
    });
}

/* =====================================================
   PHOTO GALLERY & LIGHTBOX
   ===================================================== */
function initGallery() {
    const galleryItems = document.querySelectorAll('.gallery-item');
    const lightbox = document.getElementById('lightbox');
    const lightboxImage = document.getElementById('lightbox-image');
    const lightboxCounter = document.getElementById('lightbox-counter');
    const closeBtn = document.querySelector('.lightbox-close');
    const prevBtn = document.querySelector('.lightbox-prev');
    const nextBtn = document.querySelector('.lightbox-next');
    const galleryGrid = document.getElementById('gallery-grid');
    const toggleBtn = document.getElementById('gallery-toggle');

    if (!lightbox || galleryItems.length === 0) return;

    let currentIndex = 0;

    // Gallery image paths (generate for all 32)
    const images = [];
    for (let i = 1; i <= 32; i++) {
        images.push(`images/gallery/gallery-${i}.jpg`);
    }

    function updateCounter() {
        if (lightboxCounter) {
            lightboxCounter.textContent = `${currentIndex + 1} / ${images.length}`;
        }
    }

    function openLightbox(index) {
        currentIndex = index;
        lightboxImage.src = images[index] || '';
        lightboxImage.alt = `Gallery image ${index + 1}`;
        updateCounter();
        lightbox.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lightbox.classList.remove('active');
        document.body.style.overflow = '';
    }

    function showPrev() {
        currentIndex = (currentIndex - 1 + images.length) % images.length;
        lightboxImage.src = images[currentIndex];
        lightboxImage.alt = `Gallery image ${currentIndex + 1}`;
        updateCounter();
    }

    function showNext() {
        currentIndex = (currentIndex + 1) % images.length;
        lightboxImage.src = images[currentIndex];
        lightboxImage.alt = `Gallery image ${currentIndex + 1}`;
        updateCounter();
    }

    // Event listeners - use data-index for robust mapping
    galleryItems.forEach((item) => {
        item.addEventListener('click', () => {
            const index = parseInt(item.dataset.index, 10);
            openLightbox(index);
        });
    });

    closeBtn?.addEventListener('click', closeLightbox);
    prevBtn?.addEventListener('click', showPrev);
    nextBtn?.addEventListener('click', showNext);

    // Close on background click
    lightbox?.addEventListener('click', (e) => {
        if (e.target === lightbox) {
            closeLightbox();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (!lightbox.classList.contains('active')) return;

        if (e.key === 'Escape') closeLightbox();
        if (e.key === 'ArrowLeft') showPrev();
        if (e.key === 'ArrowRight') showNext();
    });

    // Gallery expand/collapse toggle
    if (toggleBtn && galleryGrid) {
        toggleBtn.addEventListener('click', () => {
            const isExpanded = galleryGrid.classList.contains('expanded');

            galleryGrid.classList.toggle('expanded');
            toggleBtn.setAttribute('aria-expanded', String(!isExpanded));

            const textEl = toggleBtn.querySelector('.gallery-toggle-text');
            if (textEl) {
                textEl.textContent = isExpanded ? 'View All Memories' : 'Show Less';
            }

            // When collapsing, scroll back to gallery section top
            if (isExpanded) {
                document.getElementById('gallery')?.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    }
}

/* =====================================================
   SPONSOR MARQUEE (Safari-optimized)
   ===================================================== */
function initSponsorMarquee() {
    const marqueeContents = document.querySelectorAll('.marquee-content');
    if (!marqueeContents.length) return;

    marqueeContents.forEach(marqueeContent => {
        const sponsors = marqueeContent.innerHTML;
        marqueeContent.innerHTML = sponsors + sponsors;

        // Force Safari to recalculate styles after content duplication
        marqueeContent.style.animation = 'none';
        marqueeContent.offsetHeight; // Trigger reflow
        marqueeContent.style.animation = '';
    });
}

/* =====================================================
   ANIMATED COUNTER (Safari-optimized)
   ===================================================== */
function initAnimatedCounter() {
    const counter = document.querySelector('.counter-number');
    if (!counter) return;

    const target = parseFloat(counter.dataset.target);
    const duration = 2500;

    // Reduce fps on mobile for smoother animation
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const fps = isMobile ? 30 : 60;
    const totalFrames = Math.floor(duration / 1000 * fps);

    let frame = 0;
    let hasAnimated = false;
    let lastFormattedValue = '';

    function easeOutQuart(x) {
        return 1 - Math.pow(1 - x, 4);
    }

    const formattedTarget = target.toLocaleString('en-IE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });

    function formatNumber(num) {
        return num.toLocaleString('en-IE', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    function animate() {
        frame++;
        const progress = easeOutQuart(frame / totalFrames);
        const currentValue = target * progress;
        const formatted = formatNumber(currentValue);

        // Only update DOM if value changed
        if (formatted !== lastFormattedValue) {
            counter.textContent = formatted;
            lastFormattedValue = formatted;
        }

        if (frame < totalFrames) {
            requestAnimationFrame(animate);
        } else {
            counter.textContent = formattedTarget;
            counter.classList.add('counted');
        }
    }

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        counter.textContent = formattedTarget;
        counter.classList.add('counted');
        return;
    }

    // Skip counting animation on mobile (causes glitching), keep yellow shimmer
    if (isMobile) {
        counter.textContent = formattedTarget;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    counter.classList.add('counted');
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });
        observer.observe(counter);
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;
                animate();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    observer.observe(counter);
}

/* =====================================================
   PARALLAX EFFECT
   ===================================================== */
function initParallax() {
    const hero = document.querySelector('.hero-bg');

    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrolled = window.scrollY;
                const rate = scrolled * 0.3;

                if (scrolled < window.innerHeight) {
                    hero.style.transform = `scale(1.1) translateY(${rate}px)`;
                }

                ticking = false;
            });

            ticking = true;
        }
    }, { passive: true });
}
