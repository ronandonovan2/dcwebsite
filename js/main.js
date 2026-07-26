/* =====================================================
   DROMTRASNA CHALLENGE - MAIN JAVASCRIPT
   ===================================================== */

/* =====================================================
   SCROLL LOCK (iOS-safe)
   -----------------------------------------------------
   iOS Safari ignores `body{overflow:hidden}`, so the page scrolls behind the
   open nav menu and lightbox. Pinning the body with position:fixed is the only
   approach that works there; we stash the scroll offset and restore it on
   unlock so the reader does not lose their place.
   ===================================================== */
const scrollLock = (function() {
    let savedY = 0;
    let depth = 0;
    return {
        lock() {
            if (depth++ > 0) return;
            savedY = window.scrollY;
            document.body.style.position = 'fixed';
            document.body.style.top = `-${savedY}px`;
            document.body.style.left = '0';
            document.body.style.right = '0';
            document.body.style.overflow = 'hidden';
        },
        unlock() {
            if (depth === 0 || --depth > 0) return;
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.overflow = '';
            // instant, not smooth: this is a restore, not a navigation
            window.scrollTo({ top: savedY, behavior: 'instant' });
        }
    };
})();

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
    initAnimationPausing();

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
        if (!menu?.classList.contains('active')) return;
        toggle?.classList.remove('active');
        menu?.classList.remove('active');
        backdrop?.classList.remove('active');
        toggle?.setAttribute('aria-expanded', 'false');
        scrollLock.unlock();
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
            scrollLock.lock();
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
    // Explicit ISO-8601 with offset: race day is 10:00 Irish Standard Time (UTC+1).
    // Ireland stays on IST until the last Sunday of October (25 Oct 2026), so +01:00
    // is correct. A bare date string would be parsed in the VIEWER's timezone instead.
    const eventDate = new Date('2026-10-17T10:00:00+01:00').getTime();

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
        images.push(`images/gallery/gallery-${i}.jpg?v=20260726`);
    }

    function updateCounter() {
        if (lightboxCounter) {
            lightboxCounter.textContent = `${currentIndex + 1} / ${images.length}`;
        }
    }

    // Element that opened the lightbox, so focus can be handed back on close.
    let lastFocused = null;

    function openLightbox(index) {
        currentIndex = index;
        lightboxImage.src = images[index] || '';
        lightboxImage.alt = `Gallery image ${index + 1}`;
        updateCounter();
        lastFocused = document.activeElement;
        lightbox.classList.add('active');
        scrollLock.lock();
        // Move focus into the dialog so keyboard and screen-reader users are
        // not left behind it; without this the modal is a keyboard trap in
        // the worst sense - unreachable rather than contained.
        // A hidden element cannot take focus, so retry on the next frame if
        // the style change has not been applied yet.
        if (closeBtn) {
            closeBtn.focus();
            if (document.activeElement !== closeBtn) {
                requestAnimationFrame(() => closeBtn.focus());
            }
        }
    }

    function closeLightbox() {
        if (!lightbox.classList.contains('active')) return;
        lightbox.classList.remove('active');
        scrollLock.unlock();
        if (lastFocused && document.contains(lastFocused)) {
            lastFocused.focus();
        }
        lastFocused = null;
    }

    // Keep Tab cycling inside the dialog while it is open.
    function trapFocus(e) {
        if (e.key !== 'Tab' || !lightbox.classList.contains('active')) return;
        const focusable = [closeBtn, prevBtn, nextBtn].filter(Boolean);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
        } else if (!focusable.includes(document.activeElement)) {
            e.preventDefault();
            first.focus();
        }
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
        trapFocus(e);
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
    const isMobile = window.innerWidth <= 768;
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
    if (window.innerWidth <= 768) {
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
   PAUSE OFF-SCREEN ANIMATIONS
   -----------------------------------------------------
   Five animations on this page loop forever (sponsor marquee, hero gradient
   shift, footer runner, scroll arrow, countdown pulse). Left alone they keep
   compositing even when scrolled far out of view, which costs battery on
   phones. Pause them whenever they leave the viewport.
   ===================================================== */
function initAnimationPausing() {
    // Reduced-motion users already have these animations disabled in CSS.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const targets = document.querySelectorAll(
        '.marquee-content, .hero-overlay, .footer-runner, .scroll-indicator, .countdown-item:last-child .countdown-number'
    );
    if (!targets.length) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            entry.target.classList.toggle('anim-paused', !entry.isIntersecting);
        });
    }, { rootMargin: '150px' });

    targets.forEach(target => observer.observe(target));
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
