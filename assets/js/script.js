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
        const val = trackInput.value.trim();

        if (!val) {
            showNotification('Please enter a tracking number', 'error');
            trackInput.focus();
            return;
        }

        const btn = document.getElementById('searchBtn');
        const originalText = btn.innerText;

        // Add loading animation
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> SEARCHING...';
        btn.disabled = true;

        setTimeout(() => {
            const results = document.getElementById('resWrap');
            if (results) {
                document.getElementById('resId').innerText = val.toUpperCase();
                results.style.display = 'block';

                // Animate result appearance
                results.style.animation = 'slideUp 0.6s ease forwards';

                // Scroll to results
                results.scrollIntoView({ behavior: 'smooth', block: 'start' });

                // Animate route steps
                animateRouteSteps();
            }

            btn.innerHTML = originalText;
            btn.disabled = false;

            showNotification('Shipment found! Displaying details...', 'success');
        }, 1500);
    }

    // --- ANIMATED ROUTE STEPS ---
    function animateRouteSteps() {
        const steps = document.querySelectorAll('.route-step, [style*="text-align: center"]');
        steps.forEach((step, index) => {
            step.style.opacity = '0';
            step.style.transform = 'translateY(20px)';

            setTimeout(() => {
                step.style.transition = 'all 0.5s ease';
                step.style.opacity = '1';
                step.style.transform = 'translateY(0)';
            }, index * 150);
        });
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
        const start = parseInt(element.textContent.replace(/,/g, '')) || 0;
        const increment = (target - start) / (duration / 16);
        let current = start;

        const updateCounter = () => {
            current += increment;

            if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
                element.textContent = target.toLocaleString();
                return;
            }

            element.textContent = Math.floor(current).toLocaleString();
            requestAnimationFrame(updateCounter);
        };

        updateCounter();
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

    console.log('✨ Bethel Express Premium Experience Loaded');
});

// --- PRELOADER FOR IMAGES ---
window.addEventListener('load', () => {
    document.body.classList.add('loaded');
});
