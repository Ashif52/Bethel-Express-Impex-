import {
    collection,
    onSnapshot,
    getDocs,
    setDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { db } from "./firebase-config.js";
import { login, logout, observeAuthState, IS_DEMO_MODE } from "./auth.js";
import { formatCurrency } from "./pricing-engine.js";

// DOM Elements
const loginOverlay = document.getElementById('adminLoginOverlay');
const loginForm = document.getElementById('adminLoginForm');
const loginError = document.getElementById('adminLoginError');
const dashboard = document.getElementById('adminDashboard');
const countryList = document.getElementById('adminCountryList');
const logoutBtn = document.getElementById('adminLogoutBtn');
const addCountryBtn = document.getElementById('addCountryBtn');

// Courier definitions
const COURIERS = [
    { key: 'dhl', label: 'DHL Express', icon: 'fa-shipping-fast' },
    { key: 'fedex', label: 'FedEx Priority', icon: 'fa-plane' },
    { key: 'ups', label: 'UPS Worldwide', icon: 'fa-box' },
    { key: 'aramex', label: 'Aramex', icon: 'fa-truck' }
];

function getDefaultRates() {
    return {
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
}



// Fetch and Render Rates (Real-Time or Demo)
function loadRates() {
    countryList.innerHTML = '<div class="loading">Syncing with database...</div>';

    if (IS_DEMO_MODE) {
        const demoData = JSON.parse(localStorage.getItem('bethel_rates_demo')) || getDefaultRates();
        countryList.innerHTML = '';
        Object.keys(demoData).forEach(id => {
            renderCountryCard(id, demoData[id]);
        });
        return;
    }

    return onSnapshot(collection(db, "rates"), (querySnapshot) => {
        countryList.innerHTML = '';
        querySnapshot.forEach((docSnap) => {
            renderCountryCard(docSnap.id, docSnap.data());
        });
        if (querySnapshot.empty) {
            countryList.innerHTML = '<div class="info">No countries configured. Add your first country above.</div>';
        }
    }, (error) => {
        console.error("Link error:", error);
        countryList.innerHTML = '<div class="error">Access denied. Check Firestore security rules.</div>';
    });
}

function renderCountryCard(id, data) {
    const card = document.createElement('div');
    card.className = 'admin-country-card';
    card.id = `card-${id}`;

    const couriers = data.couriers || {};

    // Build courier sections
    let couriersHtml = '';
    COURIERS.forEach(courier => {
        const cData = couriers[courier.key] || { baseFreight: 0, slabs: {} };

        let slabsHtml = '';
        const sortedSlabs = Object.keys(cData.slabs || {}).sort((a, b) => parseInt(a) - parseInt(b));
        sortedSlabs.forEach(slab => {
            slabsHtml += `
                <div class="slab-row">
                    <input type="text" value="${slab}" class="slab-key" placeholder="e.g. 0-10">
                    <input type="number" value="${cData.slabs[slab]}" class="slab-value">
                    <button class="remove-slab-btn" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
                </div>
            `;
        });

        couriersHtml += `
            <div class="courier-section" data-courier="${courier.key}">
                <div class="courier-header">
                    <i class="fas ${courier.icon}"></i>
                    <span>${courier.label}</span>
                </div>
                <div class="courier-base-group">
                    <div class="config-item">
                        <label>Base Freight — Documents (₹)</label>
                        <input type="number" value="${cData.baseFreight || 0}" class="courier-base-input">
                    </div>
                </div>
                <div class="slabs-section">
                    <h4 style="font-size:13px; margin-bottom:10px;">Weight Slabs (Packages)</h4>
                    <div class="slabs-container" data-courier="${courier.key}">
                        ${slabsHtml}
                    </div>
                    <button class="add-slab-btn" data-courier="${courier.key}"><i class="fas fa-plus"></i> Add Slab</button>
                </div>
            </div>
        `;
    });

    card.innerHTML = `
        <div class="card-header">
            <h3><input type="text" value="${data.label || id}" class="country-label-input"></h3>
            <div class="card-actions">
                <button class="save-btn" data-id="${id}"><i class="fas fa-save"></i> Save</button>
                <button class="delete-btn" data-id="${id}"><i class="fas fa-trash"></i></button>
            </div>
        </div>
        <div class="card-body">
            <div class="config-grid" style="grid-template-columns: repeat(3, 1fr);">
                <div class="config-item">
                    <label>Fuel Surcharge (%)</label>
                    <input type="number" value="${data.fuel || 0}" class="fuel-input">
                </div>
                <div class="config-item">
                    <label>GST (%)</label>
                    <input type="number" value="${data.gst || 0}" class="gst-input">
                </div>
                <div class="config-item">
                    <label>Profit Margin (%)</label>
                    <input type="number" value="${data.profit || 0}" class="profit-input">
                </div>
            </div>

            <div class="couriers-container">
                ${couriersHtml}
            </div>
        </div>
    `;

    // Event Listeners — Add Slab for each courier
    card.querySelectorAll('.add-slab-btn').forEach(btn => {
        btn.onclick = () => {
            const courierKey = btn.dataset.courier;
            const container = card.querySelector(`.slabs-container[data-courier="${courierKey}"]`);
            const div = document.createElement('div');
            div.className = 'slab-row';
            div.innerHTML = `
                <input type="text" placeholder="e.g. 45+" class="slab-key">
                <input type="number" placeholder="Rate" class="slab-value">
                <button class="remove-slab-btn" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
            `;
            container.appendChild(div);
        };
    });

    card.querySelector('.save-btn').onclick = () => saveCountry(id, card);
    card.querySelector('.delete-btn').onclick = () => deleteCountry(id);

    countryList.appendChild(card);
}

async function saveCountry(id, card) {
    const label = card.querySelector('.country-label-input').value;
    const fuel = parseFloat(card.querySelector('.fuel-input').value) || 0;
    const gst = parseFloat(card.querySelector('.gst-input').value) || 0;
    const profit = parseFloat(card.querySelector('.profit-input').value) || 0;

    // Collect per-courier data
    const couriers = {};
    card.querySelectorAll('.courier-section').forEach(section => {
        const courierKey = section.dataset.courier;
        const baseFreight = parseFloat(section.querySelector('.courier-base-input').value) || 0;

        const slabs = {};
        section.querySelectorAll('.slab-row').forEach(row => {
            const key = row.querySelector('.slab-key').value;
            const val = parseFloat(row.querySelector('.slab-value').value);
            if (key && !isNaN(val)) slabs[key] = val;
        });

        couriers[courierKey] = { baseFreight, slabs };
    });

    const payload = { label, fuel, gst, profit, couriers };

    if (IS_DEMO_MODE) {
        const demoData = JSON.parse(localStorage.getItem('bethel_rates_demo')) || {};
        demoData[id] = payload;
        localStorage.setItem('bethel_rates_demo', JSON.stringify(demoData));
        showToast("Demo: Saved to Local Storage");
        window.dispatchEvent(new Event('storage'));
        return;
    }

    try {
        await setDoc(doc(db, "rates", id), payload);
        showToast("Changes saved successfully!");
    } catch (error) {
        console.error("Save error:", error);
        alert("Permission denied. You must be an admin to update rates.");
    }
}

async function deleteCountry(id) {
    if (!confirm(`Are you sure you want to delete ${id}?`)) return;

    if (IS_DEMO_MODE) {
        const demoData = JSON.parse(localStorage.getItem('bethel_rates_demo')) || {};
        delete demoData[id];
        localStorage.setItem('bethel_rates_demo', JSON.stringify(demoData));
        document.getElementById(`card-${id}`).remove();
        showToast("Demo: Deleted from Local Storage");
        window.dispatchEvent(new Event('storage'));
        return;
    }

    try {
        await deleteDoc(doc(db, "rates", id));
        document.getElementById(`card-${id}`).remove();
        showToast("Country deleted.");
    } catch (error) {
        alert("Operation failed.");
    }
}

addCountryBtn.onclick = () => {
    const id = prompt("Enter Country ID (e.g. CANADA, GERMANY):");
    if (!id) return;
    const idClean = id.toUpperCase().trim();
    if (document.getElementById(`card-${idClean}`)) {
        alert("Country already exists.");
        return;
    }
    const emptyCouriers = {};
    COURIERS.forEach(c => { emptyCouriers[c.key] = { baseFreight: 0, slabs: { '0-10': 0, '45+': 0 } }; });
    renderCountryCard(idClean, { label: id, fuel: 0, gst: 18, profit: 10, couriers: emptyCouriers });
};

function showToast(msg) {
    const toast = document.getElementById('adminToast');
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// =========================================================================
// INITIALIZATION — Start the application
// =========================================================================

// Login Handler setup
const loginSubmitBtn = document.getElementById('loginSubmitBtn');
const emailInput = document.getElementById('adminEmail');
const passwordInput = document.getElementById('adminPassword');

async function handleLogin() {
    const email = emailInput.value;
    const password = passwordInput.value;

    console.log("Attempting login for:", email);
    loginError.textContent = "Authenticating...";

    try {
        const result = await login(email, password);
        console.log("Login result:", result);

        if (!result.success) {
            loginError.textContent = result.error;
        } else {
            loginError.textContent = ""; // Clear on success
        }
    } catch (err) {
        console.error("Critical login error:", err);
        loginError.textContent = "System error. Check console.";
    }
}

if (loginSubmitBtn) {
    loginSubmitBtn.addEventListener('click', handleLogin);
}

// Support for "Enter" key in login fields
[emailInput, passwordInput].forEach(el => {
    if (el) {
        el.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleLogin();
            }
        });
    }
});

// Logout button
if (logoutBtn) {
    logoutBtn.addEventListener('click', logout);
}

// Observe Auth State (This triggers the initial load)
observeAuthState((user) => {
    if (user) {
        if (loginOverlay) loginOverlay.style.display = 'none';
        if (dashboard) dashboard.style.display = 'block';
        loadRates();
    } else {
        if (loginOverlay) loginOverlay.style.display = 'flex';
        if (dashboard) dashboard.style.display = 'none';
    }
});
