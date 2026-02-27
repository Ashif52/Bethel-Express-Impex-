import {
    collection,
    onSnapshot,
    getDoc,
    doc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";

/**
 * Bethel Express & Impex — PRICING ENGINE (Firebase Version)
 * Real-time Reactive Edition
 */

import { IS_DEMO_MODE } from "./auth.js";

// Local cache for real-time updates
let countriesCache = [];
let ratesCache = {};
let subscribers = [];

/**
 * Initialize real-time listeners for rates.
 * Supports Demo Mode using LocalStorage.
 */
export function initRealTimePricing(callback) {
    if (callback) subscribers.push(callback);

    if (IS_DEMO_MODE) {
        const syncDemo = () => {
            const demoData = JSON.parse(localStorage.getItem('bethel_rates_demo')) || {
                USA: {
                    label: 'United States', fuel: 32, gst: 18, profit: 12,
                    couriers: {
                        dhl: { baseFreight: 1500, slabs: { '0-10': 1099, '45+': 710 } },
                        fedex: { baseFreight: 1400, slabs: { '0-10': 999, '45+': 650 } },
                        ups: { baseFreight: 1300, slabs: { '0-10': 899, '45+': 600 } },
                        aramex: { baseFreight: 1200, slabs: { '0-10': 799, '45+': 550 } }
                    }
                },
                UK: {
                    label: 'United Kingdom', fuel: 32, gst: 18, profit: 12,
                    couriers: {
                        dhl: { baseFreight: 1600, slabs: { '0-10': 1199, '45+': 740 } },
                        fedex: { baseFreight: 1500, slabs: { '0-10': 1099, '45+': 690 } },
                        ups: { baseFreight: 1400, slabs: { '0-10': 999, '45+': 640 } },
                        aramex: { baseFreight: 1300, slabs: { '0-10': 899, '45+': 590 } }
                    }
                }
            };
            countriesCache = Object.keys(demoData).map(key => ({ key, label: demoData[key].label }));
            ratesCache = demoData;
            subscribers.forEach(cb => cb({ countries: countriesCache, rates: ratesCache }));
        };

        syncDemo();
        window.addEventListener('storage', syncDemo);
        return () => window.removeEventListener('storage', syncDemo);
    }

    return onSnapshot(collection(db, "rates"), (querySnapshot) => {
        countriesCache = [];
        ratesCache = {};

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            countriesCache.push({ key: docSnap.id, label: data.label || docSnap.id });
            ratesCache[docSnap.id] = data;
        });

        subscribers.forEach(cb => cb({ countries: countriesCache, rates: ratesCache }));
    }, (error) => {
        console.error("Real-time pricing error:", error);
    });
}

/**
 * Fetch all available countries (from cache if available, else fetch)
 */
export async function getAvailableCountries() {
    if (countriesCache.length > 0) return countriesCache;

    const { getDocs } = await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js");
    const querySnapshot = await getDocs(collection(db, "rates"));
    return querySnapshot.docs.map(d => ({
        key: d.id,
        label: d.data().label || d.id
    }));
}

/**
 * Fetch rates for a specific country.
 */
export async function getCountryRates(countryKey) {
    if (ratesCache[countryKey]) return ratesCache[countryKey];

    try {
        const docRef = doc(db, "rates", countryKey);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (error) {
        console.error("Error fetching country rates:", error);
        return null;
    }
}

/**
 * Main calculation function.
 * @param {string} country - Country key
 * @param {number} weight - Weight in KG
 * @param {string} shipmentType - 'document' or 'package'
 * @param {string} courier - Courier key: 'dhl', 'fedex', 'ups', 'aramex'
 */
export async function calculateShippingCost({ country, weight, shipmentType, courier }) {
    if (!country) return { success: false, error: "Please select a destination country." };

    const parsedWeight = parseFloat(weight);
    if (isNaN(parsedWeight) || parsedWeight <= 0) return { success: false, error: "Please enter a valid weight." };

    const rates = await getCountryRates(country);
    if (!rates) return { success: false, error: "Rates not found for selected country." };

    // Get courier-specific data
    const courierKey = courier || 'dhl';
    const courierData = (rates.couriers && rates.couriers[courierKey]) || {};

    let baseFreight;
    let slabUsed = "";

    if (shipmentType === "document") {
        // Documents use the courier's Base Freight
        baseFreight = courierData.baseFreight || 0;
        slabUsed = "Document (Base Freight)";
    } else {
        // Packages use the courier's weight slabs
        const slabData = findSlabData(courierData.slabs || {}, parsedWeight);
        if (!slabData) return { success: false, error: "Weight range not supported for this courier." };

        if (slabData.isFlat) {
            baseFreight = slabData.rate;
        } else {
            baseFreight = parsedWeight * slabData.rate;
        }
        slabUsed = slabData.key + (slabData.isFlat ? " (Flat)" : " /KG");
    }

    // --- COMPOUNDING CALCULATION: Base → +Fuel% → +GST% → +Profit% ---
    const fuelAmount = baseFreight * ((rates.fuel || 0) / 100);
    const afterFuel = baseFreight + fuelAmount;

    const gstAmount = afterFuel * ((rates.gst || 0) / 100);
    const afterGST = afterFuel + gstAmount;

    const profitAmount = afterGST * ((rates.profit || 0) / 100);
    const totalPayable = afterGST + profitAmount;

    return {
        success: true,
        breakdown: {
            country: rates.label || country,
            courier: courierKey,
            weight: parsedWeight,
            shipmentType,
            slabUsed,
            baseFreight: round2(baseFreight),
            fuelPercent: rates.fuel,
            fuelAmount: round2(fuelAmount),
            gstPercent: rates.gst,
            gstAmount: round2(gstAmount),
            profitPercent: rates.profit,
            profitAmount: round2(profitAmount),
            totalPayable: round2(totalPayable)
        }
    };
}

// --- UTILITIES ---

function findSlabData(slabs, weight) {
    if (!slabs || Object.keys(slabs).length === 0) return null;

    const ranges = Object.keys(slabs).map(key => ({
        key,
        rate: slabs[key],
        ...parseSlabKey(key)
    })).sort((a, b) => a.min - b.min);

    for (const range of ranges) {
        if (weight >= range.min && weight <= range.max) return range;
    }

    if (ranges.length > 0 && weight > ranges[ranges.length - 1].min) {
        return ranges[ranges.length - 1];
    }

    return null;
}

function parseSlabKey(key) {
    if (key.endsWith('+')) {
        return { min: parseFloat(key), max: Infinity, isFlat: false };
    }
    const parts = key.split('-');
    if (parts.length === 2) {
        return { min: parseFloat(parts[0]), max: parseFloat(parts[1]), isFlat: true };
    }
    return { min: parseFloat(key), max: parseFloat(key), isFlat: true };
}

function round2(num) {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

export function formatCurrency(amount) {
    return "₹ " + parseFloat(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
}

