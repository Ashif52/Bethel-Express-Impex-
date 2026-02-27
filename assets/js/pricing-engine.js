/**
 * ============================================================================
 * BETHEL EXPRESS & IMPEX — PRICING ENGINE v1.0
 * ============================================================================
 * 
 * Core pricing calculation module.
 * This module is ISOLATED from all UI logic.
 * It can be replaced with API calls when migrating to a backend.
 * 
 * Architecture:
 *   - Data Layer:    localStorage abstraction (swap with fetch() later)
 *   - Slab Engine:   Per-KG slab-based rate lookup
 *   - Calc Pipeline: Base → Profit → Fuel → GST → Total
 * 
 * All monetary values use 2-decimal precision (toFixed(2) at output).
 * Internal calculations use full floating-point to avoid compounding errors.
 * 
 * @author Bethel Express & Impex
 * @version 1.0.0
 */

'use strict';

const BethelPricingEngine = (function () {

    // =========================================================================
    // STORAGE KEY — single source of truth for localStorage key
    // =========================================================================
    const STORAGE_KEY = 'bethel_pricing_data';
    const DEFAULTS_KEY = 'bethel_pricing_defaults';

    // =========================================================================
    // DEFAULT RATE CONFIGURATION
    // =========================================================================
    const DEFAULT_RATES = {
        USA: {
            label: 'United States',
            slabs: {
                '0-10': 600,
                '11-20': 750,
                '21-44': 730,
                '45+': 710
            },
            fuel: 12,
            gst: 18,
            profit: 15,
            documentRate: 1500
        },
        UK: {
            label: 'United Kingdom',
            slabs: {
                '0-10': 650,
                '11-20': 780,
                '21-44': 760,
                '45+': 740
            },
            fuel: 10,
            gst: 18,
            profit: 15,
            documentRate: 1600
        },
        UAE: {
            label: 'United Arab Emirates',
            slabs: {
                '0-10': 450,
                '11-20': 520,
                '21-44': 500,
                '45+': 480
            },
            fuel: 8,
            gst: 18,
            profit: 12,
            documentRate: 1200
        },
        Australia: {
            label: 'Australia',
            slabs: {
                '0-10': 700,
                '11-20': 820,
                '21-44': 800,
                '45+': 770
            },
            fuel: 14,
            gst: 18,
            profit: 15,
            documentRate: 1800
        },
        Canada: {
            label: 'Canada',
            slabs: {
                '0-10': 620,
                '11-20': 760,
                '21-44': 740,
                '45+': 720
            },
            fuel: 11,
            gst: 18,
            profit: 14,
            documentRate: 1550
        }
    };

    // =========================================================================
    // DATA ACCESS LAYER
    // Future: replace these with fetch('/api/rates') calls
    // =========================================================================

    /**
     * Initialize storage with default rates if not present.
     * Also stores a pristine copy of defaults for reset functionality.
     */
    function initStorage() {
        if (!_readStorage()) {
            _writeStorage(JSON.parse(JSON.stringify(DEFAULT_RATES)));
        }
        // Always store defaults for reset
        if (!localStorage.getItem(DEFAULTS_KEY)) {
            localStorage.setItem(DEFAULTS_KEY, JSON.stringify(DEFAULT_RATES));
        }
    }

    /**
     * Read all rate data from storage.
     * @returns {Object|null} The full rates object or null if not found.
     */
    function _readStorage() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : null;
        } catch (e) {
            console.error('[PricingEngine] Storage read error:', e);
            return null;
        }
    }

    /**
     * Write rate data to storage.
     * @param {Object} data - The full rates object.
     */
    function _writeStorage(data) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error('[PricingEngine] Storage write error:', e);
        }
    }

    /**
     * Get all country rates.
     * @returns {Object} Full rates configuration.
     */
    function getAllRates() {
        initStorage();
        return _readStorage();
    }

    /**
     * Get rates for a specific country.
     * @param {string} countryKey - The country code (e.g. 'USA').
     * @returns {Object|null} Country rate config or null.
     */
    function getCountryRates(countryKey) {
        const rates = getAllRates();
        return rates[countryKey] || null;
    }

    /**
     * Get list of available countries.
     * @returns {Array} Array of { key, label } objects.
     */
    function getAvailableCountries() {
        const rates = getAllRates();
        return Object.keys(rates).map(key => ({
            key: key,
            label: rates[key].label || key
        }));
    }

    /**
     * Save entire rates object to storage.
     * @param {Object} ratesData - Complete rates object.
     */
    function saveAllRates(ratesData) {
        _writeStorage(ratesData);
    }

    /**
     * Save rates for a single country.
     * @param {string} countryKey - Country code.
     * @param {Object} countryData - Country config object.
     */
    function saveCountryRates(countryKey, countryData) {
        const rates = getAllRates();
        rates[countryKey] = countryData;
        _writeStorage(rates);
    }

    /**
     * Delete a country from rates.
     * @param {string} countryKey - Country code to remove.
     * @returns {boolean} True if deleted.
     */
    function deleteCountry(countryKey) {
        const rates = getAllRates();
        if (rates[countryKey]) {
            delete rates[countryKey];
            _writeStorage(rates);
            return true;
        }
        return false;
    }

    /**
     * Reset all rates to factory defaults.
     */
    function resetToDefaults() {
        _writeStorage(JSON.parse(JSON.stringify(DEFAULT_RATES)));
    }

    // =========================================================================
    // SLAB ENGINE
    // =========================================================================

    /**
     * Parse a slab key string like '0-10' or '45+' into min/max bounds.
     * @param {string} slabKey - The slab range string.
     * @returns {Object} { min: number, max: number|Infinity }
     */
    function _parseSlabRange(slabKey) {
        const trimmed = slabKey.trim();

        // Handle "45+" style
        if (trimmed.endsWith('+')) {
            const min = parseFloat(trimmed.replace('+', ''));
            return { min: min, max: Infinity };
        }

        // Handle "0-10" style
        const parts = trimmed.split('-');
        if (parts.length === 2) {
            return {
                min: parseFloat(parts[0]),
                max: parseFloat(parts[1])
            };
        }

        // Fallback: single number
        const num = parseFloat(trimmed);
        return { min: num, max: num };
    }

    /**
     * Find the per-KG rate for a given weight from a slabs object.
     * @param {Object} slabs - Slab definitions { '0-10': 600, '11-20': 750, ... }
     * @param {number} weight - Weight in KG.
     * @returns {number|null} Per-KG rate or null if no matching slab.
     */
    function findSlabRate(slabs, weight) {
        if (!slabs || typeof slabs !== 'object') return null;
        if (weight <= 0) return null;

        // Sort slabs by min value for reliable matching
        const slabEntries = Object.entries(slabs)
            .map(([key, rate]) => ({
                key: key,
                rate: parseFloat(rate),
                range: _parseSlabRange(key)
            }))
            .sort((a, b) => a.range.min - b.range.min);

        for (const slab of slabEntries) {
            if (weight >= slab.range.min && weight <= slab.range.max) {
                return slab.rate;
            }
        }

        // If weight exceeds all slabs, use the last (highest) slab
        if (slabEntries.length > 0) {
            const lastSlab = slabEntries[slabEntries.length - 1];
            if (weight >= lastSlab.range.min) {
                return lastSlab.rate;
            }
        }

        return null;
    }

    // =========================================================================
    // CALCULATION PIPELINE
    // =========================================================================

    /**
     * Calculate complete shipping cost breakdown.
     * 
     * Pipeline:
     *   Step 1: Base Freight = weight × slab rate
     *   Step 2: Profit = Base Freight × (profit% / 100)
     *   Step 3: Fuel Surcharge = (Base + Profit) × (fuel% / 100)
     *   Step 4: GST = (Base + Profit + Fuel) × (gst% / 100)
     *   Step 5: Total = Sum of all above
     * 
     * @param {Object} params - Calculation parameters.
     * @param {string} params.country - Country key (e.g. 'USA').
     * @param {number} params.weight - Weight in KG.
     * @param {string} params.shipmentType - 'document' or 'package'.
     * @returns {Object} Breakdown with all components + total.
     */
    function calculateShippingCost(params) {
        const { country, weight, shipmentType } = params;

        // Validate inputs
        const validation = validateInputs(params);
        if (!validation.valid) {
            return {
                success: false,
                error: validation.error,
                breakdown: null
            };
        }

        const countryRates = getCountryRates(country);
        if (!countryRates) {
            return {
                success: false,
                error: 'Country rates not configured.',
                breakdown: null
            };
        }

        const parsedWeight = parseFloat(weight);

        // ---- STEP 1: BASE FREIGHT ----
        let baseFreight;
        let slabUsed = '';

        if (shipmentType === 'document') {
            // Documents use a flat rate
            baseFreight = countryRates.documentRate || 1500;
            slabUsed = 'Document (Flat Rate)';
        } else {
            // Packages use slab-based pricing
            const perKgRate = findSlabRate(countryRates.slabs, parsedWeight);
            if (perKgRate === null) {
                return {
                    success: false,
                    error: 'No slab rate found for the given weight.',
                    breakdown: null
                };
            }
            baseFreight = parsedWeight * perKgRate;
            slabUsed = _getSlabLabel(countryRates.slabs, parsedWeight);
        }

        // ---- STEP 2: PROFIT MARGIN ----
        const profitPercent = parseFloat(countryRates.profit) || 0;
        const profitAmount = baseFreight * (profitPercent / 100);

        // ---- STEP 3: FUEL SURCHARGE ----
        const fuelPercent = parseFloat(countryRates.fuel) || 0;
        const subtotalBeforeFuel = baseFreight + profitAmount;
        const fuelAmount = subtotalBeforeFuel * (fuelPercent / 100);

        // ---- STEP 4: GST ----
        const gstPercent = parseFloat(countryRates.gst) || 0;
        const subtotalBeforeGST = baseFreight + profitAmount + fuelAmount;
        const gstAmount = subtotalBeforeGST * (gstPercent / 100);

        // ---- STEP 5: TOTAL ----
        const totalPayable = baseFreight + profitAmount + fuelAmount + gstAmount;

        return {
            success: true,
            error: null,
            breakdown: {
                country: countryRates.label || country,
                countryKey: country,
                weight: parsedWeight,
                shipmentType: shipmentType,
                slabUsed: slabUsed,
                baseFreight: _round2(baseFreight),
                profitPercent: profitPercent,
                profitAmount: _round2(profitAmount),
                fuelPercent: fuelPercent,
                fuelAmount: _round2(fuelAmount),
                gstPercent: gstPercent,
                gstAmount: _round2(gstAmount),
                totalPayable: _round2(totalPayable)
            }
        };
    }

    /**
     * Get human-readable slab label for a given weight.
     * @param {Object} slabs - Slab definitions.
     * @param {number} weight - Weight in KG.
     * @returns {string} Slab label.
     */
    function _getSlabLabel(slabs, weight) {
        for (const [key] of Object.entries(slabs)) {
            const range = _parseSlabRange(key);
            if (weight >= range.min && weight <= range.max) {
                return key + ' KG';
            }
        }
        return 'Custom';
    }

    // =========================================================================
    // VALIDATION
    // =========================================================================

    /**
     * Validate calculation inputs.
     * @param {Object} params - { country, weight, shipmentType }
     * @returns {Object} { valid: boolean, error: string|null }
     */
    function validateInputs(params) {
        const { country, weight, shipmentType } = params;

        if (!country || typeof country !== 'string' || country.trim() === '') {
            return { valid: false, error: 'Please select a destination country.' };
        }

        const parsedWeight = parseFloat(weight);
        if (isNaN(parsedWeight) || parsedWeight <= 0) {
            return { valid: false, error: 'Please enter a valid weight greater than 0.' };
        }

        if (parsedWeight > 9999) {
            return { valid: false, error: 'Weight exceeds maximum limit (9999 KG).' };
        }

        if (!shipmentType || !['document', 'package'].includes(shipmentType)) {
            return { valid: false, error: 'Please select a valid shipment type.' };
        }

        return { valid: true, error: null };
    }

    /**
     * Validate admin input for country configuration.
     * @param {Object} countryData - Country config object.
     * @returns {Object} { valid: boolean, errors: string[] }
     */
    function validateCountryConfig(countryData) {
        const errors = [];

        if (!countryData.label || countryData.label.trim() === '') {
            errors.push('Country label is required.');
        }

        if (!countryData.slabs || typeof countryData.slabs !== 'object' || Object.keys(countryData.slabs).length === 0) {
            errors.push('At least one slab must be defined.');
        }

        // Validate each slab rate
        if (countryData.slabs) {
            for (const [key, rate] of Object.entries(countryData.slabs)) {
                const parsedRate = parseFloat(rate);
                if (isNaN(parsedRate) || parsedRate < 0) {
                    errors.push(`Invalid rate for slab "${key}".`);
                }
            }
        }

        // Validate percentages
        const percentFields = ['fuel', 'gst', 'profit'];
        percentFields.forEach(field => {
            const val = parseFloat(countryData[field]);
            if (isNaN(val) || val < 0 || val > 100) {
                errors.push(`${field.toUpperCase()} % must be between 0 and 100.`);
            }
        });

        // Validate document rate
        const docRate = parseFloat(countryData.documentRate);
        if (isNaN(docRate) || docRate < 0) {
            errors.push('Document rate must be a positive number.');
        }

        return { valid: errors.length === 0, errors: errors };
    }

    // =========================================================================
    // UTILITIES
    // =========================================================================

    /**
     * Round a number to 2 decimal places.
     * Uses proper banker's rounding to prevent floating-point drift.
     * @param {number} num - Number to round.
     * @returns {number} Rounded number.
     */
    function _round2(num) {
        return Math.round((num + Number.EPSILON) * 100) / 100;
    }

    /**
     * Format a number as Indian Rupee currency string.
     * @param {number} amount - The amount.
     * @returns {string} Formatted string like "₹ 12,345.67"
     */
    function formatCurrency(amount) {
        const num = parseFloat(amount);
        if (isNaN(num)) return '₹ 0.00';
        return '₹ ' + num.toLocaleString('en-IN', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    // =========================================================================
    // PUBLIC API
    // =========================================================================
    return {
        // Data Access
        initStorage: initStorage,
        getAllRates: getAllRates,
        getCountryRates: getCountryRates,
        getAvailableCountries: getAvailableCountries,
        saveAllRates: saveAllRates,
        saveCountryRates: saveCountryRates,
        deleteCountry: deleteCountry,
        resetToDefaults: resetToDefaults,

        // Calculation
        calculateShippingCost: calculateShippingCost,
        findSlabRate: findSlabRate,

        // Validation
        validateInputs: validateInputs,
        validateCountryConfig: validateCountryConfig,

        // Utilities
        formatCurrency: formatCurrency
    };

})();

// Freeze the public API to prevent tampering via console
Object.freeze(BethelPricingEngine);
