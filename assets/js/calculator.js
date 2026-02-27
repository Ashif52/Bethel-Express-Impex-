/**
 * BETHEL EXPRESS & IMPEX — PUBLIC CALCULATOR UI (Firebase Version)
 */

import {
    initRealTimePricing,
    calculateShippingCost,
    formatCurrency
} from "../../pricing-engine.js";

document.addEventListener('DOMContentLoaded', async function () {

    // DOM REFERENCES
    const countrySelect = document.getElementById('calcCountry');
    const shipmentTypeSelect = document.getElementById('calcShipmentType');
    const weightInput = document.getElementById('calcWeightInput');
    const calculateBtn = document.getElementById('calcSubmitBtn');
    const resultSection = document.getElementById('calcResultSection');
    const errorContainer = document.getElementById('calcError');

    // INITIALIZATION — REAL-TIME SYNC
    initRealTimePricing(({ countries }) => {
        const currentVal = countrySelect.value;
        countrySelect.innerHTML = '<option value="">— Select Country —</option>';
        countries.forEach(c => {
            const option = document.createElement('option');
            option.value = c.key;
            option.textContent = c.label;
            countrySelect.appendChild(option);
        });
        countrySelect.value = currentVal;
    });

    if (calculateBtn) {
        calculateBtn.onclick = (e) => {
            e.preventDefault();
            executeCalculation();
        };
    }

    async function executeCalculation() {
        hideError();
        hideResult();

        const country = countrySelect?.value;
        const shipmentType = shipmentTypeSelect?.value;
        const weight = weightInput?.value.trim();

        if (!country) return showError('Please select a destination country.');
        if (!shipmentType) return showError('Please select a shipment type.');
        if (!weight || parseFloat(weight) <= 0) return showError('Please enter a valid weight.');

        calculateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Calculating...';
        calculateBtn.disabled = true;

        const result = await calculateShippingCost({ country, weight, shipmentType });

        calculateBtn.innerHTML = '<i class="fas fa-calculator"></i> Calculate Cost';
        calculateBtn.disabled = false;

        if (!result.success) {
            showError(result.error);
            return;
        }

        displayBreakdown(result.breakdown);
    }

    function displayBreakdown(breakdown) {
        if (!resultSection) return;

        document.getElementById('resCountry').textContent = breakdown.country;
        document.getElementById('resWeight').textContent = breakdown.weight + ' KG';
        document.getElementById('resType').textContent = breakdown.shipmentType === 'document' ? 'Document' : 'Package';
        document.getElementById('resSlab').textContent = breakdown.slabUsed;

        document.getElementById('resBaseFreight').textContent = formatCurrency(breakdown.baseFreight);
        document.getElementById('resProfit').textContent = formatCurrency(breakdown.profitAmount);
        document.getElementById('resProfitPct').textContent = `(${breakdown.profitPercent}%)`;
        document.getElementById('resFuel').textContent = formatCurrency(breakdown.fuelAmount);
        document.getElementById('resFuelPct').textContent = `(${breakdown.fuelPercent}%)`;
        document.getElementById('resGST').textContent = formatCurrency(breakdown.gstAmount);
        document.getElementById('resGSTPct').textContent = `(${breakdown.gstPercent}%)`;
        document.getElementById('resTotalPayable').textContent = formatCurrency(breakdown.totalPayable);

        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function showError(msg) {
        if (!errorContainer) return alert(msg);
        errorContainer.querySelector('.error-text').textContent = msg;
        errorContainer.style.display = 'flex';
    }

    function hideError() {
        if (errorContainer) errorContainer.style.display = 'none';
    }

    function hideResult() {
        if (resultSection) resultSection.style.display = 'none';
    }
});
