/**
 * BETHEL EXPRESS & IMPEX - Premium Interactive Experience v2.0
 * Enhanced animations, counters, and scroll-triggered effects
 */

document.addEventListener('DOMContentLoaded', () => {

    // --- SPLASH SCREEN REMOVAL ---
    const splash = document.getElementById("splash");
    if (splash) {
        setTimeout(() => {
            splash.style.opacity = '0';
            setTimeout(() => splash.remove(), 500);
        }, 3500);
    }

    // --- CREATE PARTICLE BACKGROUND ---
    createParticles();

    // --- STICKY HEADER WITH SMOOTH TRANSITION ---
    const header = document.querySelector('header');
    let lastScroll = 0;

    window.addEventListener('scroll', () => {
        const currentScroll = window.scrollY;

        if (currentScroll > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }

        // Hide/show header on scroll direction
        if (currentScroll > lastScroll && currentScroll > 500) {
            header.style.transform = 'translateY(-100%)';
        } else {
            header.style.transform = 'translateY(0)';
        }
        lastScroll = currentScroll;
    });

    // --- PARALLAX EFFECT FOR BANNERS ---
    const parallaxElements = document.querySelectorAll('.page-banner, .hero-home');
    window.addEventListener('scroll', () => {
        parallaxElements.forEach(el => {
            const scrolled = window.pageYOffset;
            const rate = scrolled * 0.3;
            el.style.backgroundPositionY = `${rate}px`;
        });
    });

    // --- TRACKING LOGIC ---
    const trackingBtn = document.getElementById('searchBtn');
    if (trackingBtn) {
        trackingBtn.addEventListener('click', handleTracking);

        // Also trigger on Enter key
        const trackInput = document.getElementById('trackNum');
        if (trackInput) {
            trackInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handleTracking(e);
                }
            });
        }
    }

    function handleTracking(e) {
        e.preventDefault();
        const trackInput = document.getElementById('trackNum');
        const errorBox = document.getElementById('trackError');
        const errorMsg = document.getElementById('trackErrorMsg');

        const trackingNumber = trackInput.value.trim();

        // 1. Reset Styles
        if (errorBox) errorBox.style.display = 'none';
        trackInput.style.borderColor = '';

        // 2. Validate Input
        if (!trackingNumber) {
            showTrackError('Please enter a tracking number.');
            return;
        }

        // 3. Auto-Detect Courier
        const courier = detectCourier(trackingNumber);

        const btn = document.getElementById('searchBtn');
        const originalText = btn.innerHTML;

        // 4. UI Feedback
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> OPENING...';
        btn.disabled = true;

        // 5. Construct URL
        let url = '';
        const encodedId = encodeURIComponent(trackingNumber);

        if (courier === 'dhl') {
            url = `https://mydhl.express.dhl/in/en/tracking.html#/results?id=${encodedId}`;
        } else if (courier === 'fedex') {
            url = `https://www.fedex.com/fedextrack/?tracknumbers=${encodedId}`;
        } else if (courier === 'ups') {
            url = `https://www.ups.com/track?tracknum=${encodedId}`;
        } else if (courier === 'bluedart') {
            url = `https://www.bluedart.com/tracking?awb=${encodedId}`;
        } else if (courier === 'dtdc') {
            url = `https://www.dtdc.in/tracking.asp?strCnno=${encodedId}`;
        } else if (courier === 'indiapost') {
            // Official site requires CAPTCHA, using 17TRACK for direct access
            url = `https://t.17track.net/en#nums=${encodedId}`;

        } else if (courier === 'aramex') {
            url = `https://www.aramex.com/track/results?ShipmentNumber=${encodedId}`;
        } else if (courier === 'dpd') {
            url = `https://www.dpd.com/tracking/?parcelNumber=${encodedId}`;
        } else {
            // Default Fallback: Google Search
            url = `https://www.google.com/search?q=${encodeURIComponent(trackingNumber + ' tracking')}`;
        }

        // 6. Execute Redirect
        setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }, 1000);

        // Open Link
        window.location.href = url;
    }

    function showTrackError(msg) {
        const errorBox = document.getElementById('trackError');
        const errorMsg = document.getElementById('trackErrorMsg');
        const trackInput = document.getElementById('trackNum');

        if (errorBox && errorMsg) {
            errorMsg.textContent = msg;
            errorBox.style.display = 'flex';
        } else {
            showNotification(msg, 'error');
        }

        if (trackInput) {
            trackInput.style.borderColor = '#e74c3c';
            shakeElement(trackInput);
            trackInput.focus();
        }
    }

    function detectCourier(trk) {
        // Remove spaces/dashes for regex checks
        const cleanTrk = trk.replace(/[\s-]/g, '').toUpperCase();

        // 1. DHL: 10 digits
        if (/^\d{10}$/.test(cleanTrk)) return 'dhl';

        // 2. FedEx: 12 or 15 digits
        if (/^\d{12}$/.test(cleanTrk) || /^\d{15}$/.test(cleanTrk)) return 'fedex';

        // 3. UPS: Starts with 1Z (18 chars)
        if (/^1Z[A-Z0-9]{16}$/.test(cleanTrk)) return 'ups';

        // 4. Aramex: 10-11 digits (If 10 didn't match DHL, well DHL is checked first)
        // Note: Aramex 10 digits will now be caught by DHL check above.
        // This is the compromise requested ("dhl is not taking").
        // We catch remaining 11 digits here.
        if (/^\d{11}$/.test(cleanTrk)) {
            return 'aramex';

        }

        return null; // Unknown logic -> Google Search
    }

    // --- FORM SUBMISSION WITH ANIMATION ---
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const btn = contactForm.querySelector('button');
            const originalText = btn.innerHTML;

            // Validate form
            const inputs = contactForm.querySelectorAll('input[required], select[required]');
            let isValid = true;

            inputs.forEach(input => {
                if (!input.value.trim()) {
                    isValid = false;
                    input.style.borderColor = '#e74c3c';
                    shakeElement(input);
                } else {
                    input.style.borderColor = '';
                }
            });

            if (!isValid) {
                showNotification('Please fill in all required fields', 'error');
                return;
            }

            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SENDING...';
            btn.disabled = true;

            setTimeout(() => {
                btn.innerHTML = '<i class="fas fa-check"></i> MESSAGE SENT!';
                btn.style.background = '#27ae60';
                contactForm.reset();

                showNotification('Your message has been sent successfully!', 'success');

                setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.style.background = '';
                    btn.disabled = false;
                }, 3000);
            }, 2000);
        });

        // Add focus animations to inputs
        const formInputs = contactForm.querySelectorAll('input, select, textarea');
        formInputs.forEach(input => {
            input.addEventListener('focus', () => {
                input.parentElement.classList.add('focused');
            });
            input.addEventListener('blur', () => {
                input.parentElement.classList.remove('focused');
            });
        });
    }

    // --- CALCULATOR LOGIC WITH ANIMATION ---
    const calcForm = document.getElementById('calcForm');
    if (calcForm) {
        const inputs = calcForm.querySelectorAll('input, select');
        const costDisplay = document.getElementById('totalCost');

        const calculate = () => {
            const h = parseFloat(document.getElementById('calcH')?.value) || 0;
            const w = parseFloat(document.getElementById('calcW')?.value) || 0;
            const d = parseFloat(document.getElementById('calcD')?.value) || 0;
            const weight = parseFloat(document.getElementById('calcWeight')?.value) || 0;
            const courier = document.getElementById('calcCourier')?.value || 'standard';
            const destination = document.getElementById('calcDest')?.value || 'domestic';
            const pkgType = document.getElementById('calcPkg')?.value || 'parcel';

            if (weight === 0 && (h === 0 || w === 0 || d === 0)) {
                animateCounter(costDisplay, 0);
                document.getElementById('actualWeightDisplay').textContent = '0';
                document.getElementById('volWeightDisplay').textContent = '0';
                return;
            }

            // Base rates
            let baseRate = 500;
            if (pkgType === 'document') baseRate = 300;
            if (pkgType === 'pharma') baseRate = 800;

            // Courier multiplier
            let courierMult = 1;
            if (courier === 'dhl') courierMult = 1.5;
            if (courier === 'fedex') courierMult = 1.4;
            if (courier === 'ups') courierMult = 1.3;

            // Destination multiplier
            let destMult = 1;
            if (destination === 'usa') destMult = 2.5;
            if (destination === 'uk') destMult = 2.0;
            if (destination === 'uae') destMult = 1.5;
            if (destination === 'singapore') destMult = 1.4;

            // Volumetric calculation
            const volWeight = (h * w * d) / 5000;
            const finalWeight = Math.max(weight, volWeight);

            // Update displays
            document.getElementById('actualWeightDisplay').textContent = weight;
            document.getElementById('volWeightDisplay').textContent = volWeight.toFixed(2);

            let total = finalWeight * baseRate * courierMult * destMult;
            if (total === 0 && weight > 0) total = baseRate * destMult;

            animateCounter(costDisplay, Math.round(total));
        };

        inputs.forEach(input => {
            input.addEventListener('input', calculate);
            input.addEventListener('change', calculate);
        });
    }

    // --- ANIMATED COUNTER ---
    function animateCounter(element, target, duration = 1000) {
        // Clear any existing animation to prevent conflicts
        if (element.dataset.animId) {
            cancelAnimationFrame(parseInt(element.dataset.animId));
            delete element.dataset.animId;
        }

        const start = parseInt(element.textContent.replace(/,/g, '')) || 0;

        // If values are same, precise update and exit
        if (start === target) {
            element.textContent = target.toLocaleString();
            return;
        }

        const increment = (target - start) / (duration / 16);
        let current = start;

        const updateCounter = () => {
            current += increment;

            // Check if we reached/passed the target
            if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
                element.textContent = target.toLocaleString();
                delete element.dataset.animId;
                return;
            }

            element.textContent = Math.floor(current).toLocaleString();
            element.dataset.animId = requestAnimationFrame(updateCounter);
        };

        element.dataset.animId = requestAnimationFrame(updateCounter);
    }

    // --- SCROLL REVEAL ANIMATIONS ---
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');

                // Special handling for stat cards
                if (entry.target.classList.contains('stat-card')) {
                    const counter = entry.target.querySelector('.counter');
                    const target = parseInt(entry.target.dataset.count) || 0;
                    if (counter) animateCounter(counter, target, 2000);
                }

                // Special handling for process steps
                if (entry.target.classList.contains('process-step')) {
                    entry.target.classList.add('animate');
                }

                // Special handling for timeline items
                if (entry.target.classList.contains('timeline-item')) {
                    entry.target.classList.add('animate');
                }
            }
        });
    }, observerOptions);

    // Observe all reveal elements
    document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale, .stat-card, .process-step, .timeline-item').forEach(el => {
        revealObserver.observe(el);
    });

    // --- TIMELINE PROGRESS ANIMATION ---
    const timelineSection = document.getElementById('timeline') || document.querySelector('.timeline-section');
    if (timelineSection) {
        const timelineObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const progress = document.getElementById('timelineProgress') || document.querySelector('.timeline-progress');
                    const items = document.querySelectorAll('.timeline-item');

                    if (progress) {
                        setTimeout(() => {
                            progress.style.width = '100%';
                        }, 300);
                    }

                    items.forEach((item, index) => {
                        setTimeout(() => {
                            item.classList.add('animate');
                        }, index * 200 + 500);
                    });
                }
            });
        }, { threshold: 0.2 });

        timelineObserver.observe(timelineSection);
    }

    // --- IMAGE LAZY LOADING WITH FADE ---
    const images = document.querySelectorAll('img[data-src]');
    const imageObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                img.src = img.dataset.src;
                img.style.opacity = '0';
                img.onload = () => {
                    img.style.transition = 'opacity 0.5s ease';
                    img.style.opacity = '1';
                };
                imageObserver.unobserve(img);
            }
        });
    });

    images.forEach(img => imageObserver.observe(img));

    // --- SMOOTH SCROLLING FOR ANCHOR LINKS ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // --- HOVER ANIMATIONS FOR INTERACTIVE ELEMENTS ---
    const interactiveCards = document.querySelectorAll('.service-card, .partner-card, .stat-card, .pillar-card, .value-item, .faq-item');
    interactiveCards.forEach(card => {
        card.addEventListener('mouseenter', (e) => {
            card.style.transform = 'translateY(-10px)';
        });
        card.addEventListener('mouseleave', (e) => {
            card.style.transform = 'translateY(0)';
        });
    });

    // --- MAGNETIC BUTTON EFFECT ---
    const magneticBtns = document.querySelectorAll('.btn-primary');
    magneticBtns.forEach(btn => {
        btn.addEventListener('mousemove', (e) => {
            const rect = btn.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            btn.style.transform = `translateY(-3px) translate(${x * 0.1}px, ${y * 0.1}px)`;
        });

        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
        });
    });

    // --- TYPING EFFECT FOR HERO TEXT ---
    const heroTitle = document.querySelector('.hero-content h1');
    if (heroTitle && heroTitle.dataset.typed) {
        typeWriter(heroTitle, heroTitle.dataset.typed);
    }

    // --- FAQ ACCORDION ---
    const faqItems = document.querySelectorAll('.faq-item');
    faqItems.forEach(item => {
        item.addEventListener('click', () => {
            const isActive = item.classList.contains('active');

            // Close all
            faqItems.forEach(i => i.classList.remove('active'));

            // Toggle current
            if (!isActive) {
                item.classList.add('active');
            }
        });
    });

    // --- NEWSLETTER FORM ---
    const newsletterForms = document.querySelectorAll('.newsletter-wrap');
    newsletterForms.forEach(form => {
        const btn = form.querySelector('.btn');
        const input = form.querySelector('input');

        if (btn && input) {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const email = input.value.trim();

                if (!email || !isValidEmail(email)) {
                    shakeElement(form);
                    showNotification('Please enter a valid email address', 'error');
                    return;
                }

                btn.innerHTML = '<i class="fas fa-check"></i>';
                input.value = '';
                showNotification('Thank you for subscribing!', 'success');

                setTimeout(() => {
                    btn.innerHTML = '<i class="fas fa-paper-plane"></i>';
                }, 2000);
            });
        }
    });

    // --- UTILITY FUNCTIONS ---

    function createParticles() {
        const container = document.getElementById('particles') || createParticleContainer();
        if (!container) return;

        for (let i = 0; i < 15; i++) {
            const particle = document.createElement('div');
            particle.className = 'particle';
            particle.style.left = `${Math.random() * 100}%`;
            particle.style.animationDelay = `${Math.random() * 20}s`;
            particle.style.animationDuration = `${15 + Math.random() * 10}s`;
            container.appendChild(particle);
        }
    }

    function createParticleContainer() {
        const container = document.createElement('div');
        container.id = 'particles';
        container.className = 'particle-bg';
        document.body.prepend(container);
        return container;
    }

    function showNotification(message, type = 'info') {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            <span>${message}</span>
        `;

        // Styles
        Object.assign(notification.style, {
            position: 'fixed',
            bottom: '30px',
            right: '30px',
            background: type === 'success' ? '#27ae60' : type === 'error' ? '#e74c3c' : '#3498db',
            color: '#fff',
            padding: '15px 25px',
            borderRadius: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            zIndex: '10000',
            animation: 'slideUp 0.5s ease',
            fontFamily: "'Outfit', sans-serif"
        });

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'fadeOut 0.5s ease forwards';
            setTimeout(() => notification.remove(), 500);
        }, 4000);
    }

    function shakeElement(element) {
        element.style.animation = 'shake 0.5s ease';
        setTimeout(() => element.style.animation = '', 500);
    }

    function isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function typeWriter(element, text, speed = 50) {
        element.textContent = '';
        let i = 0;

        function type() {
            if (i < text.length) {
                element.textContent += text.charAt(i);
                i++;
                setTimeout(type, speed);
            }
        }

        type();
    }

    // Add shake animation to stylesheet
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            50% { transform: translateX(10px); }
            75% { transform: translateX(-5px); }
        }
        
        @keyframes fadeOut {
            to { opacity: 0; transform: translateY(20px); }
        }
        
        .focused label {
            color: #C9A24D !important;
        }
        
        .focused .contact-input {
            border-color: #C9A24D !important;
        }
    `;
    document.head.appendChild(style);


    // --- MOBILE MENU TOGGLE ---
    const menuBtn = document.querySelector('.mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    const navLinksItems = document.querySelectorAll('.nav-link');

    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            menuBtn.classList.toggle('active');
            navLinks.classList.toggle('active');
            document.body.style.overflow = navLinks.classList.contains('active') ? 'hidden' : '';
        });

        // Close menu when clicking a link
        navLinksItems.forEach(link => {
            link.addEventListener('click', () => {
                menuBtn.classList.remove('active');
                navLinks.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    console.log('✨ Bethel Express Premium Experience Loaded');
});

// --- PRELOADER FOR IMAGES ---
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});
