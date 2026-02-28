import { db, auth } from "./firebase-config.js";
import { setDoc, doc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const DEFAULT_RATES = {
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

async function seedDatabase() {
    console.log("Starting database seeding...");

    for (const countryId in DEFAULT_RATES) {
        try {
            await setDoc(doc(db, "rates", countryId), DEFAULT_RATES[countryId]);
            console.log(`✅ Uploaded: ${countryId}`);
        } catch (error) {
            console.error(`❌ Error uploading ${countryId}:`, error);
            alert("Upload failed! Make sure your Firestore Rules are set and you are logged in as an Admin.");
            return;
        }
    }
    alert("🎉 All rates have been migrated to the Live Database!");
}

// Only allow seeding if logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (confirm("You are logged in. Do you want to upload the default shipping rates to your LIVE Firestore database?")) {
            seedDatabase();
        }
    } else {
        alert("Please login to the Admin Panel first so the database recognizes you as an authorized user.");
    }
});
