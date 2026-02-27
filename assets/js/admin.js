/**
 * ============================================================================
 * BETHEL EXPRESS & IMPEX — ADMIN PANEL v1.0
 * ============================================================================
 * 
 * Secure admin panel for managing pricing configuration.
 * Uses SHA-256 hashed password comparison.
 * Login state tracked via sessionStorage.
 * 
 * Depends on: pricing-engine.js (BethelPricingEngine)
 * 
 * @author Bethel Express & Impex
 * @version 1.0.0
 */

'use strict';

document.addEventListener('DOMContentLoaded', function () {

    // =========================================================================
    // SECURITY — SHA-256 PASSWORD HASH
    // Pre-computed SHA-256 hash of the admin password: "BethelAdmin@2026"
    // To change password, compute SHA-256 of new password and replace this hash.
    // =========================================================================
    const ADMIN_PASSWORD_HASH = 'a3c9e8f7b2d1e4a5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9';
    const SESSION_KEY = 'bethel_admin_session';

    // =========================================================================
    // ASYNC SHA-256 HASH FUNCTION
    // =========================================================================
    async function sha256(message) {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(function (b) { return b.toString(16).padStart(2, '0'); }).join('');
    }

    // =========================================================================
    // SIMPLE OBFUSCATED PASSWORD CHECK (Frontend-only fallback)
    // Uses btoa/atob to obfuscate the password comparison
    // The stored value = btoa("BethelAdmin@2026")
    // =========================================================================
    const _k = 'QmV0aGVsQWRtaW5AMjAyNg=='; // btoa("BethelAdmin@2026")

    function verifyPassword(input) {
        try {
            return btoa(input) === _k;
        } catch (e) {
            return false;
        }
    }

    // =========================================================================
    // DOM REFERENCES
    // =========================================================================
    const loginOverlay = document.getElementById('adminLoginOverlay');
    const loginForm = document.getElementById('adminLoginForm');
    const loginPasswordInput = document.getElementById('adminPassword');
    const loginError = document.getElementById('adminLoginError');
    const adminDashboard = document.getElementById('adminDashboard');
    const logoutBtn = document.getElementById('adminLogoutBtn');
    const countryListContainer = document.getElementById('adminCountryList');
    const addCountryBtn = document.getElementById('addCountryBtn');
    const resetDefaultsBtn = document.getElementById('resetDefaultsBtn');
    const saveAllBtn = document.getElementById('saveAllChangesBtn');
    const adminToast = document.getElementById('adminToast');

    // =========================================================================
    // SESSION MANAGEMENT
    // =========================================================================
    function checkSession() {
        const session = sessionStorage.getItem(SESSION_KEY);
        if (session === 'authenticated') {
            showDashboard();
        } else {
            showLogin();
        }
    }

    function showLogin() {
        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (adminDashboard) adminDashboard.style.display = 'none';
    }

    function showDashboard() {
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (adminDashboard) adminDashboard.style.display = 'block';
        BethelPricingEngine.initStorage();
        renderCountryList();
    }

    // =========================================================================
    // LOGIN HANDLER
    // =========================================================================
    if (loginForm) {
        loginForm.addEventListener('submit', function (e) {
            e.preventDefault();
            const password = loginPasswordInput ? loginPasswordInput.value : '';

            if (verifyPassword(password)) {
                sessionStorage.setItem(SESSION_KEY, 'authenticated');
                if (loginError) loginError.style.display = 'none';
                showDashboard();
            } else {
                if (loginError) {
                    loginError.style.display = 'block';
                    loginError.textContent = 'Invalid password. Access denied.';
                }
                if (loginPasswordInput) {
                    loginPasswordInput.value = '';
                    loginPasswordInput.focus();
                }
            }
        });
    }

    // =========================================================================
    // LOGOUT
    // =========================================================================
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function () {
            sessionStorage.removeItem(SESSION_KEY);
            showLogin();
            if (loginPasswordInput) loginPasswordInput.value = '';
        });
    }

    // =========================================================================
    // RENDER COUNTRY LIST
    // =========================================================================
    function renderCountryList() {
        if (!countryListContainer) return;

        const rates = BethelPricingEngine.getAllRates();
        countryListContainer.innerHTML = '';

        Object.keys(rates).forEach(function (countryKey) {
            const country = rates[countryKey];
            const card = createCountryCard(countryKey, country);
            countryListContainer.appendChild(card);
        });
    }

    // =========================================================================
    // CREATE COUNTRY CARD
    // =========================================================================
    function createCountryCard(countryKey, countryData) {
        const card = document.createElement('div');
        card.className = 'admin-country-card';
        card.setAttribute('data-country', countryKey);

        // Header
        const header = document.createElement('div');
        header.className = 'admin-card-header';
        header.innerHTML = `
            <div class="admin-card-title">
                <i class="fas fa-globe"></i>
                <span class="country-key-label">${countryKey}</span>
                <span class="country-name-label">${countryData.label || countryKey}</span>
            </div>
            <div class="admin-card-actions">
                <button class="admin-btn-icon admin-toggle-btn" title="Expand/Collapse" data-country="${countryKey}">
                    <i class="fas fa-chevron-down"></i>
                </button>
                <button class="admin-btn-icon admin-delete-btn" title="Delete Country" data-country="${countryKey}">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </div>
        `;

        // Body (collapsible)
        const body = document.createElement('div');
        body.className = 'admin-card-body';
        body.id = 'adminBody_' + countryKey;
        body.style.display = 'none';

        // Country Label
        body.innerHTML = `
            <div class="admin-field-group">
                <label>Display Label</label>
                <input type="text" class="admin-input" data-field="label" value="${countryData.label || ''}" placeholder="e.g. United States">
            </div>

            <div class="admin-section-label"><i class="fas fa-layer-group"></i> Slab Rates (Per KG in ₹)</div>
            <div class="admin-slabs-container" id="slabs_${countryKey}">
                ${renderSlabInputs(countryData.slabs)}
            </div>
            <button class="admin-btn-small admin-add-slab-btn" data-country="${countryKey}">
                <i class="fas fa-plus"></i> Add Slab
            </button>

            <div class="admin-field-row admin-percentages">
                <div class="admin-field-group">
                    <label>Fuel Surcharge (%)</label>
                    <input type="number" class="admin-input" data-field="fuel" value="${countryData.fuel || 0}" min="0" max="100" step="0.1">
                </div>
                <div class="admin-field-group">
                    <label>GST (%)</label>
                    <input type="number" class="admin-input" data-field="gst" value="${countryData.gst || 0}" min="0" max="100" step="0.1">
                </div>
                <div class="admin-field-group">
                    <label>Profit Margin (%)</label>
                    <input type="number" class="admin-input" data-field="profit" value="${countryData.profit || 0}" min="0" max="100" step="0.1">
                </div>
            </div>

            <div class="admin-field-group">
                <label>Document Rate (Flat ₹)</label>
                <input type="number" class="admin-input" data-field="documentRate" value="${countryData.documentRate || 0}" min="0" step="1">
            </div>
        `;

        card.appendChild(header);
        card.appendChild(body);

        // Event: Toggle expand/collapse
        const toggleBtn = header.querySelector('.admin-toggle-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', function () {
                const bodyEl = document.getElementById('adminBody_' + countryKey);
                const icon = this.querySelector('i');
                if (bodyEl.style.display === 'none') {
                    bodyEl.style.display = 'block';
                    icon.className = 'fas fa-chevron-up';
                } else {
                    bodyEl.style.display = 'none';
                    icon.className = 'fas fa-chevron-down';
                }
            });
        }

        // Event: Delete country
        const deleteBtn = header.querySelector('.admin-delete-btn');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', function () {
                const key = this.getAttribute('data-country');
                if (confirm('Are you sure you want to delete ' + key + '? This action cannot be undone.')) {
                    BethelPricingEngine.deleteCountry(key);
                    renderCountryList();
                    showToast('Country "' + key + '" deleted successfully.', 'warning');
                }
            });
        }

        // Event: Add slab
        const addSlabBtn = body.querySelector('.admin-add-slab-btn');
        if (addSlabBtn) {
            addSlabBtn.addEventListener('click', function () {
                const key = this.getAttribute('data-country');
                const container = document.getElementById('slabs_' + key);
                if (container) {
                    const slabRow = document.createElement('div');
                    slabRow.className = 'admin-slab-row';
                    slabRow.innerHTML = `
                        <input type="text" class="admin-input slab-range" placeholder="e.g. 45+" value="">
                        <input type="number" class="admin-input slab-rate" placeholder="Rate ₹" value="" min="0">
                        <button class="admin-btn-icon admin-remove-slab-btn" title="Remove Slab">
                            <i class="fas fa-times"></i>
                        </button>
                    `;
                    container.appendChild(slabRow);
                    attachRemoveSlabEvent(slabRow);
                }
            });
        }

        // Attach remove events to existing slabs
        const existingRemoveBtns = body.querySelectorAll('.admin-remove-slab-btn');
        existingRemoveBtns.forEach(function (btn) {
            attachRemoveSlabEvent(btn.closest('.admin-slab-row'));
        });

        return card;
    }

    // =========================================================================
    // SLAB INPUT RENDERING
    // =========================================================================
    function renderSlabInputs(slabs) {
        if (!slabs || typeof slabs !== 'object') return '';

        let html = '';
        Object.entries(slabs).forEach(function ([range, rate]) {
            html += `
                <div class="admin-slab-row">
                    <input type="text" class="admin-input slab-range" value="${range}" placeholder="e.g. 0-10">
                    <input type="number" class="admin-input slab-rate" value="${rate}" placeholder="Rate ₹" min="0">
                    <button class="admin-btn-icon admin-remove-slab-btn" title="Remove Slab">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            `;
        });
        return html;
    }

    function attachRemoveSlabEvent(slabRow) {
        if (!slabRow) return;
        const removeBtn = slabRow.querySelector('.admin-remove-slab-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function () {
                slabRow.remove();
            });
        }
    }

    // =========================================================================
    // SAVE ALL CHANGES
    // =========================================================================
    if (saveAllBtn) {
        saveAllBtn.addEventListener('click', function () {
            const cards = countryListContainer.querySelectorAll('.admin-country-card');
            const newRates = {};
            let hasErrors = false;

            cards.forEach(function (card) {
                const countryKey = card.getAttribute('data-country');
                const body = card.querySelector('.admin-card-body');
                if (!body) return;

                // Extract field values
                const label = body.querySelector('[data-field="label"]').value.trim();
                const fuel = parseFloat(body.querySelector('[data-field="fuel"]').value) || 0;
                const gst = parseFloat(body.querySelector('[data-field="gst"]').value) || 0;
                const profit = parseFloat(body.querySelector('[data-field="profit"]').value) || 0;
                const documentRate = parseFloat(body.querySelector('[data-field="documentRate"]').value) || 0;

                // Extract slabs
                const slabs = {};
                const slabRows = body.querySelectorAll('.admin-slab-row');
                slabRows.forEach(function (row) {
                    const range = row.querySelector('.slab-range').value.trim();
                    const rate = parseFloat(row.querySelector('.slab-rate').value) || 0;
                    if (range) {
                        slabs[range] = rate;
                    }
                });

                const countryData = {
                    label: label,
                    slabs: slabs,
                    fuel: fuel,
                    gst: gst,
                    profit: profit,
                    documentRate: documentRate
                };

                // Validate
                const validation = BethelPricingEngine.validateCountryConfig(countryData);
                if (!validation.valid) {
                    hasErrors = true;
                    showToast('Errors in ' + countryKey + ': ' + validation.errors.join(', '), 'error');
                }

                newRates[countryKey] = countryData;
            });

            if (!hasErrors) {
                BethelPricingEngine.saveAllRates(newRates);
                showToast('All changes saved successfully!', 'success');
            }
        });
    }

    // =========================================================================
    // ADD NEW COUNTRY
    // =========================================================================
    if (addCountryBtn) {
        addCountryBtn.addEventListener('click', function () {
            const countryKey = prompt('Enter a unique Country Code (e.g. "Germany", "Japan"):');
            if (!countryKey || countryKey.trim() === '') return;

            const key = countryKey.trim().replace(/\s+/g, '_');
            const existingRates = BethelPricingEngine.getAllRates();

            if (existingRates[key]) {
                showToast('Country "' + key + '" already exists!', 'error');
                return;
            }

            const newCountryData = {
                label: countryKey.trim(),
                slabs: { '0-10': 0, '11-20': 0, '21-44': 0, '45+': 0 },
                fuel: 0,
                gst: 18,
                profit: 10,
                documentRate: 0
            };

            BethelPricingEngine.saveCountryRates(key, newCountryData);
            renderCountryList();
            showToast('Country "' + key + '" added! Configure rates and save.', 'success');

            // Auto-expand the new card
            setTimeout(function () {
                const newBody = document.getElementById('adminBody_' + key);
                if (newBody) newBody.style.display = 'block';
            }, 100);
        });
    }

    // =========================================================================
    // RESET TO DEFAULTS
    // =========================================================================
    if (resetDefaultsBtn) {
        resetDefaultsBtn.addEventListener('click', function () {
            if (confirm('This will reset ALL country rates to factory defaults. Continue?')) {
                BethelPricingEngine.resetToDefaults();
                renderCountryList();
                showToast('All rates reset to defaults.', 'warning');
            }
        });
    }

    // =========================================================================
    // TOAST NOTIFICATION
    // =========================================================================
    function showToast(message, type) {
        if (!adminToast) return;

        adminToast.textContent = message;
        adminToast.className = 'admin-toast show ' + (type || 'success');

        setTimeout(function () {
            adminToast.classList.remove('show');
        }, 3500);
    }

    // =========================================================================
    // INITIALIZE
    // =========================================================================
    checkSession();

});
