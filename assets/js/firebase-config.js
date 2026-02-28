/**
 * Firebase configuration and initialization.
 * Replace the values below with your actual Firebase project configuration.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBWuPc-tg7bFEsv7RXSQQFcg_u1KqNy0Jc",
    authDomain: "bethelexpressimpex-804c7.firebaseapp.com",
    projectId: "bethelexpressimpex-804c7",
    storageBucket: "bethelexpressimpex-804c7.firebasestorage.app",
    messagingSenderId: "955694071656",
    appId: "1:955694071656:web:bab83ca98f7ffb36a0e0dd",
    measurementId: "G-E6ZCC97BZS"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
