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

/* Reduced-motion is read once here and reused throughout. CSS handles most of it,
   but scrollIntoView({behavior:'smooth'}) is a JS option that html{scroll-behavior}
   cannot override, so anything calling it has to check this. */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const scrollBehavior = prefersReducedMotion ? 'auto' : 'smooth';

document.addEventListener('DOMContentLoaded', function() {
    // Each init runs in its own try/catch. These are independent features, and a
    // throw in an early one used to abort the whole handler - which took
    // initScrollAnimations down with it and left most of the page at opacity:0.
    [
        initNavigation,
        initCountdown,
        initScrollAnimations,
        initStaggeredGrids,
        initFAQ,
        initRouteExplorer,
        initGallery,
        initSponsorMarquee,
        initAnimatedCounter,
        initParallax,
        initHeroSpotlight,
        initHeroRoute,
        initScrollProgress,
        initMedalTilt,
        initAnimationPausing
    ].forEach(init => {
        try {
            init();
        } catch (err) {
            console.error(`${init.name} failed:`, err);
        }
    });

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
                    behavior: scrollBehavior
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
    const countdownEl = document.getElementById('countdown');
    const messageEl = document.getElementById('countdown-message');
    // The nav pill. Optional - the countdown must still run if it is not there.
    const navCountdownEl = document.getElementById('nav-countdown');

    if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

    // How long the hero keeps saying "today" before it switches to thanks. Both
    // this and the year are DERIVED from eventDate on purpose:
    // tools/set-event-date.py rewrites only the Date literal above, and a second
    // hardcoded date here would silently drift a year out of step.
    const EVENT_RUNS_FOR = 8 * 60 * 60 * 1000;
    const eventYear = new Date(eventDate).getFullYear();
    let timerId = null;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function triggerDigitChange(el, oldValue) {
        if (reducedMotion) return;

        // Drop a copy of the outgoing value into the slot so it can fall out
        // while the new one rolls in from above. Cloned rather than kept as a
        // permanent second element: there is then nothing in the markup to keep
        // in sync with the live digit.
        const slot = el.parentElement;
        if (slot && slot.classList.contains('countdown-slot')) {
            // Never more than one ghost per slot. animationend is what normally
            // removes it, and that does not fire if the tab is backgrounded
            // mid-roll - without this they would pile up a node a second.
            slot.querySelector('.countdown-ghost')?.remove();

            const ghost = el.cloneNode(false);
            // The clone must not carry the live element's id.
            ghost.removeAttribute('id');
            ghost.classList.remove('digit-change');
            ghost.classList.add('countdown-ghost');
            ghost.setAttribute('aria-hidden', 'true');
            ghost.textContent = oldValue;
            ghost.addEventListener('animationend', () => ghost.remove());
            slot.appendChild(ghost);
        }

        el.classList.remove('digit-change');
        // Reflow trick to restart animation
        void el.offsetWidth;
        el.classList.add('digit-change');
    }

    function updateDigit(el, newValue) {
        const oldValue = el.textContent;
        if (oldValue !== newValue) {
            el.textContent = newValue;
            triggerDigitChange(el, oldValue);
        }
    }

    // Swap the four digit tiles for a single line of copy. Without this the
    // hero sat on 0/00/00/00 from race morning onward, which reads as broken.
    function showMessage(text) {
        if (timerId !== null) {
            clearInterval(timerId);
            timerId = null;
        }
        if (countdownEl) countdownEl.hidden = true;
        // The nav pill counts down to a day that has now passed, so it goes too.
        if (navCountdownEl) navCountdownEl.hidden = true;
        if (!messageEl) return;
        messageEl.textContent = text;
        messageEl.hidden = false;
    }

    function updateCountdown() {
        const now = new Date().getTime();
        const distance = eventDate - now;

        if (distance < 0) {
            showMessage(distance > -EVENT_RUNS_FOR
                ? "Today's the day - see you at Dromtrasna!"
                : `Thank you to everyone who took that step in ${eventYear}.`);
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        // Days only - the pill is a glance, not a second timer. CSS fades it in
        // with .nav-header.scrolled, so nothing here has to watch the scroll.
        if (navCountdownEl) {
            navCountdownEl.textContent = days === 1 ? '1 day to go' : `${days} days to go`;
            navCountdownEl.hidden = false;
        }

        updateDigit(daysEl, days.toString());
        updateDigit(hoursEl, hours.toString().padStart(2, '0'));
        updateDigit(minutesEl, minutes.toString().padStart(2, '0'));
        updateDigit(secondsEl, seconds.toString().padStart(2, '0'));
    }

    // Initial update
    updateCountdown();

    // Update every second. showMessage() clears this once the event has passed,
    // so the finished state does not keep ticking for nothing.
    if (eventDate - Date.now() > 0) {
        timerId = setInterval(updateCountdown, 1000);
    }
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

                    // Clear the delay once the reveal finishes. transition-delay
                    // applies to *every* transitioned property, so leaving it set
                    // meant the last gallery tile waited ~1s before its :hover
                    // scale started. Same for event cards and sponsor logos.
                    item.addEventListener('transitionend', function clear(e) {
                        if (e.target !== item) return;
                        item.style.transitionDelay = '';
                        item.removeEventListener('transitionend', clear);
                    });
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
   ROUTE EXPLORER
   ===================================================== */
function initRouteExplorer() {
    const svg = document.querySelector('.route-svg');
    const tabs = Array.from(document.querySelectorAll('.route-tab'));
    if (!svg || tabs.length === 0) return;

    const routes = Array.from(svg.querySelectorAll('.rm-route'));
    const markerGroups = Array.from(svg.querySelectorAll('.rm-markers'));
    const statusEl = document.getElementById('route-status');
    const routesGroup = svg.querySelector('.rm-routes');

    // Lay a grey copy of every route underneath the coloured ones, so the whole
    // road network stays visible and the selected route paints over its own grey
    // line rather than appearing out of nowhere. Cloned here rather than written
    // out in the HTML so each path's `d` exists in exactly one place.
    if (routesGroup) {
        const baseGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        baseGroup.setAttribute('class', 'rm-routes-base');
        baseGroup.setAttribute('aria-hidden', 'true');
        routes.forEach(path => {
            const base = path.cloneNode(false);
            base.setAttribute('class', 'rm-route-base');
            base.removeAttribute('data-route');
            baseGroup.appendChild(base);
        });
        routesGroup.parentNode.insertBefore(baseGroup, routesGroup);
    }

    // Until this point every route is drawn plainly, which is what a visitor
    // without JavaScript keeps. The class is what switches the SVG into
    // "one route at a time" mode, so the no-JS view is never left blank.
    svg.classList.add('is-interactive');

    // Dash the paths so the active one can be drawn on. getTotalLength() is
    // measured once here rather than per click - it forces layout, and the
    // paths never change.
    const lengths = new Map();
    routes.forEach(path => {
        const len = Math.ceil(path.getTotalLength());
        lengths.set(path, len);
        path.setAttribute('stroke-dasharray', len);
        path.setAttribute('stroke-dashoffset', len);
    });

    // "Armed" means the map has been scrolled to at least once. Before that the
    // active route stays wound back so the draw-on is not spent off-screen.
    let armed = false;

    const runner = svg.querySelector('.rm-runner');
    let runnerFrame = null;

    function stopRunner() {
        if (runnerFrame !== null) {
            window.cancelAnimationFrame(runnerFrame);
            runnerFrame = null;
        }
    }

    // Rides the tip of the line while it draws. The position is read back out of
    // the CSS transition each frame rather than re-timed here in JS: the browser
    // is already interpolating stroke-dashoffset, so reading it is exact by
    // construction and stays correct if the 1600ms in the stylesheet changes.
    function rideRunner(path) {
        stopRunner();
        if (!runner) return;

        runner.dataset.route = path.dataset.route;
        runner.classList.remove('is-done');
        runner.hidden = false;

        const len = lengths.get(path);

        function step() {
            const raw = parseFloat(window.getComputedStyle(path).strokeDashoffset);
            const offset = Number.isFinite(raw) ? Math.min(Math.max(raw, 0), len) : 0;
            const pt = path.getPointAtLength(len - offset);
            runner.setAttribute('transform', `translate(${pt.x.toFixed(2)} ${pt.y.toFixed(2)})`);

            if (offset > 0.5) {
                runnerFrame = window.requestAnimationFrame(step);
                return;
            }
            // Every route closes back on the start/finish marker, so parking the
            // runner there would sit it on top of the one point the map most
            // needs to show. Fade it out instead.
            runnerFrame = null;
            runner.classList.add('is-done');
        }

        runnerFrame = window.requestAnimationFrame(step);
    }

    function hideRunner() {
        stopRunner();
        if (runner) {
            runner.hidden = true;
            runner.classList.remove('is-done');
        }
    }

    function draw(path, animate) {
        const len = lengths.get(path);
        if (!armed) {
            path.style.strokeDashoffset = String(len);
            hideRunner();
            return;
        }
        if (!animate || prefersReducedMotion) {
            path.style.strokeDashoffset = '0';
            hideRunner();
            return;
        }
        // Restart from the beginning, then let the CSS transition run. The
        // reflow read is what makes the browser treat this as two states
        // rather than collapsing it into no change at all.
        path.style.strokeDashoffset = String(len);
        void path.getBoundingClientRect();
        path.style.strokeDashoffset = '0';
        rideRunner(path);
    }

    function select(route, animate) {
        tabs.forEach(tab => {
            const on = tab.dataset.route === route;
            tab.classList.toggle('is-active', on);
            tab.setAttribute('aria-checked', String(on));
            // Roving tabindex: only the selected tab is a tab stop, so Tab
            // moves past the whole set and the arrow keys move within it.
            tab.tabIndex = on ? 0 : -1;
        });

        routes.forEach(path => {
            const on = path.dataset.route === route;
            path.classList.toggle('is-active', on);
            if (on) {
                draw(path, animate && !prefersReducedMotion);
            } else {
                path.style.strokeDashoffset = String(lengths.get(path));
            }
        });

        markerGroups.forEach(group => {
            const on = group.dataset.route === route;
            group.classList.toggle('is-active', on);
            if (!on) return;
            // Markers arrive behind the advancing line rather than all at once.
            const kms = group.querySelectorAll('.rm-km, .rm-dot circle');
            kms.forEach((el, i) => {
                el.style.transitionDelay = (animate && !prefersReducedMotion)
                    ? `${300 + (i * 1000 / Math.max(kms.length, 1))}ms`
                    : '0ms';
            });
        });

        // The map is role="img", so it cannot tell a screen reader it changed.
        const chosen = tabs.find(tab => tab.dataset.route === route);
        if (statusEl && chosen) {
            statusEl.textContent = `${chosen.textContent.trim().replace(/\s+/g, ' ')} route shown on the map.`;
        }
    }

    function arm(animate) {
        if (armed) return;
        armed = true;
        svg.classList.add('is-armed');
        const active = routes.find(p => p.classList.contains('is-active'));
        if (active) draw(active, animate);
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            select(tab.dataset.route, true);
            arm(true);
        });
    });

    // Arrow-key navigation within the tablist, per the ARIA tabs pattern.
    const tablist = document.querySelector('.route-tabs');
    tablist?.addEventListener('keydown', (e) => {
        const i = tabs.indexOf(document.activeElement);
        if (i === -1) return;

        let next = -1;
        if (e.key === 'ArrowRight') next = (i + 1) % tabs.length;
        else if (e.key === 'ArrowLeft') next = (i - 1 + tabs.length) % tabs.length;
        else if (e.key === 'Home') next = 0;
        else if (e.key === 'End') next = tabs.length - 1;
        if (next === -1) return;

        e.preventDefault();
        tabs[next].focus();
        select(tabs[next].dataset.route, true);
        arm(true);
    });

    // Settle on the first tab, then let the map draw itself the first time it
    // actually scrolls into view - the same trigger the fundraising counter uses.
    select(tabs[0].dataset.route, false);

    if (prefersReducedMotion || !('IntersectionObserver' in window)) {
        arm(false);
        return;
    }

    const observer = new IntersectionObserver((entries, obs) => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        obs.disconnect();
        arm(true);
    }, { threshold: 0.25 });

    observer.observe(svg);
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
        images.push(`images/gallery/gallery-${i}.jpg?v=20260728`);
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

    // Swipe between photos. The arrow buttons stay for everyone else; this is
    // just what a phone user expects to work, and most of this site's traffic
    // is on a phone. Passive listeners: nothing here calls preventDefault, and
    // saying so up front keeps scrolling off the main thread.
    let touchStartX = 0;
    let touchStartY = 0;
    let swipeCandidate = false;

    lightbox.addEventListener('touchstart', (e) => {
        // A second finger means a pinch-zoom, not a swipe - leave it alone.
        swipeCandidate = e.touches.length === 1;
        if (!swipeCandidate) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
    }, { passive: true });

    lightbox.addEventListener('touchend', (e) => {
        if (!swipeCandidate) return;
        swipeCandidate = false;
        const touch = e.changedTouches[0];
        const dx = touch.clientX - touchStartX;
        const dy = touch.clientY - touchStartY;
        // Ignore short drags, and anything more vertical than horizontal, so
        // that dragging down to dismiss never skips a photo by accident.
        if (Math.abs(dx) < 45 || Math.abs(dx) <= Math.abs(dy)) return;
        if (dx < 0) {
            showNext();
        } else {
            showPrev();
        }
    }, { passive: true });

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
                    behavior: scrollBehavior
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

    // The duplicate copy exists purely to make the -50% loop seamless. With the
    // animation off there is nothing to loop, so skip it and leave one clean copy.
    if (prefersReducedMotion) return;

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

    // The markup carries the formatted total, not "0", so that a visitor with no
    // JS sees the real figure rather than "0.00". Reset to zero here - at load,
    // while the counter is far below the fold - so the count-up still starts from
    // zero without the reset ever being visible.
    counter.textContent = formatNumber(0);

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
        '.marquee-content, .hero-overlay, .footer-runner, .scroll-indicator, .sc-foot, .countdown-item:last-child .countdown-slot'
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
    // .hero-bg-parallax, NOT .hero-bg. .hero-bg carries a 10s transition for the
    // scale-in intro; writing the parallax transform there put every rAF update
    // through that transition, so the parallax lagged seconds behind the scroll
    // and the first scroll after load snapped the hero back to scale(1.1).
    const hero = document.querySelector('.hero-bg-parallax');
    const content = document.querySelector('.hero-content');

    if (!hero || prefersReducedMotion) return;

    let ticking = false;

    window.addEventListener('scroll', () => {
        if (!ticking) {
            window.requestAnimationFrame(() => {
                const scrolled = window.scrollY;
                const rate = scrolled * 0.3;

                // translateY only - the scale belongs to .hero-bg underneath.
                if (scrolled < window.innerHeight) {
                    hero.style.transform = `translateY(${rate}px)`;
                }

                // Drives the hero content's fade/lift/blur out (see .hero-content).
                // Written on EVERY frame, unlike the transform above: clamped and
                // unguarded so a fast scroll past the fold cannot leave the content
                // frozen half-faded, and a scroll back to the top always restores it.
                if (content) {
                    const progress = Math.min(scrolled / window.innerHeight, 1);
                    content.style.setProperty('--hero-exit', progress.toFixed(3));
                }

                ticking = false;
            });

            ticking = true;
        }
    }, { passive: true });
}

/* =====================================================
   HERO POINTER SPOTLIGHT
   ===================================================== */
function initHeroSpotlight() {
    const hero = document.querySelector('.hero');

    if (!hero || prefersReducedMotion) return;

    // Fine pointers only, for the same reason as the medal tilt: a touch device
    // never fires pointerleave, so a tap would light the hero and leave it lit.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let pending = null;
    let ticking = false;

    function apply() {
        ticking = false;
        if (!pending) return;

        // Measured per frame rather than cached on enter: the hero moves under
        // the pointer as the page scrolls, so a stored rect goes stale.
        const rect = hero.getBoundingClientRect();
        const x = ((pending.clientX - rect.left) / rect.width) * 100;
        const y = ((pending.clientY - rect.top) / rect.height) * 100;

        hero.style.setProperty('--hero-light-x', `${x.toFixed(2)}%`);
        hero.style.setProperty('--hero-light-y', `${y.toFixed(2)}%`);
    }

    hero.addEventListener('pointermove', (e) => {
        pending = { clientX: e.clientX, clientY: e.clientY };
        hero.classList.add('is-lit');

        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(apply);
        }
    });

    hero.addEventListener('pointerleave', () => {
        pending = null;
        // Removing the class fades the light out through the CSS transition; the
        // position is dropped too so the next enter does not start from a stale
        // point on the far side of the hero.
        hero.classList.remove('is-lit');
        hero.style.removeProperty('--hero-light-x');
        hero.style.removeProperty('--hero-light-y');
    });
}

/* =====================================================
   HERO ROUTE WATERMARK
   ===================================================== */
function initHeroRoute() {
    const line = document.querySelector('.hero-route-line');
    // Deliberately read from the route section rather than duplicated into the
    // hero markup: the route geometry lives in exactly one place in this file.
    const source = document.querySelector('.rm-route[data-route="10k"]');

    if (!line || !source) return;

    const d = source.getAttribute('d');
    if (!d) return;
    line.setAttribute('d', d);

    const len = Math.ceil(line.getTotalLength());
    line.setAttribute('stroke-dasharray', len);
    line.setAttribute('stroke-dashoffset', len);

    if (prefersReducedMotion) {
        line.style.strokeDashoffset = '0';
        return;
    }

    // After the title has finished writing itself, so the two do not compete.
    setTimeout(() => {
        line.style.strokeDashoffset = '0';
    }, 1200);
}

/* =====================================================
   SCROLL PROGRESS BAR
   ===================================================== */
function initScrollProgress() {
    const bar = document.getElementById('scroll-progress-bar');

    if (!bar) return;

    let ticking = false;

    function update() {
        ticking = false;
        // Guarded: a page shorter than the viewport has nothing to scroll, and
        // the division would be by zero.
        const scrollable = document.documentElement.scrollHeight - window.innerHeight;
        const progress = scrollable > 0
            ? Math.min(Math.max(window.scrollY / scrollable, 0), 1)
            : 0;
        bar.style.setProperty('--scroll-progress', progress.toFixed(4));
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(update);
        }
    }, { passive: true });

    // Not gated on reduced motion: this is a position indicator, not an effect.
    update();
}

/* =====================================================
   MEDAL TILT
   ===================================================== */
function initMedalTilt() {
    // .medal-tilt, NOT .medal-image - see the comment on the wrapper in
    // index.html. The outer element owns the reveal-scale entrance; this one
    // owns the tilt, so the two transforms never share a property.
    const frame = document.querySelector('.medal-tilt');

    if (!frame || prefersReducedMotion) return;

    // Fine pointers only. On touch there is no hover to leave, so a tap would
    // tilt the medal and leave it tilted until the next tap landed somewhere
    // else - that reads as a rendering fault rather than an effect. Phones
    // keep the plain photo, which is what they had before.
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    const MAX_TILT = 8;
    let pending = null;
    let ticking = false;

    function apply() {
        ticking = false;
        if (!pending) return;

        // Measured here rather than in the handler: getBoundingClientRect
        // forces layout, and the medal moves with the scroll so the rect
        // cannot be cached on enter. Once per frame is the floor.
        const rect = frame.getBoundingClientRect();
        const x = (pending.clientX - rect.left) / rect.width;
        const y = (pending.clientY - rect.top) / rect.height;

        frame.style.transform =
            `rotateX(${((0.5 - y) * 2 * MAX_TILT).toFixed(2)}deg) ` +
            `rotateY(${((x - 0.5) * 2 * MAX_TILT).toFixed(2)}deg) scale(1.02)`;
        // Drives the light sweep across the face; see .medal-tilt::after.
        frame.style.setProperty('--medal-shine', x.toFixed(3));
    }

    frame.addEventListener('pointermove', (e) => {
        pending = { clientX: e.clientX, clientY: e.clientY };
        // .is-tilting drops `transform` from the transition list, so the medal
        // tracks the pointer 1:1 while it is over it. Removing the class on
        // leave hands the transform back to the base rule's transition, which
        // is what eases it back to flat - no JS timing involved.
        frame.classList.add('is-tilting');

        if (!ticking) {
            ticking = true;
            window.requestAnimationFrame(apply);
        }
    });

    frame.addEventListener('pointerleave', () => {
        pending = null;
        frame.classList.remove('is-tilting');
        frame.style.transform = '';
        frame.style.removeProperty('--medal-shine');
    });
}
