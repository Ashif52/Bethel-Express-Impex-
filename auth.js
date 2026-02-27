import {
    signInWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import {
    doc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { auth, db } from "./firebase-config.js";

// --- DEMO MODE CONFIG ---
export const IS_DEMO_MODE = true;
const DEMO_USER = { email: "admin@bethel.com", password: "admin123", uid: "demo-user-123", role: "admin" };

let authCallback = null;

/**
 * Handle user login.
 */
export async function login(email, password) {
    // Demo Mode Bypass
    if (IS_DEMO_MODE) {
        if (email === DEMO_USER.email && password === DEMO_USER.password) {
            sessionStorage.setItem('bethel_demo_logged_in', 'true');
            if (authCallback) authCallback(DEMO_USER);
            return { success: true, user: DEMO_USER };
        }
        return { success: false, error: "Demo: Use admin@bethel.com / admin123" };
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const userDoc = await getDoc(doc(db, "users", user.uid));

        if (userDoc.exists() && userDoc.data().role === 'admin') {
            return { success: true, user: user };
        } else {
            await signOut(auth);
            return { success: false, error: "Access denied. Admin role required." };
        }
    } catch (error) {
        let message = "Authentication failed.";
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            message = "Invalid email or password.";
        }
        return { success: false, error: message };
    }
}

/**
 * Handle user logout.
 */
export async function logout() {
    if (IS_DEMO_MODE) {
        sessionStorage.removeItem('bethel_demo_logged_in');
        if (authCallback) authCallback(null);
        window.location.href = "admin.html";
        return;
    }
    try {
        await signOut(auth);
        window.location.href = "admin.html";
    } catch (error) {
        console.error("Logout error:", error);
    }
}

/**
 * Listen for auth state changes.
 */
export function observeAuthState(callback) {
    authCallback = callback;

    if (IS_DEMO_MODE) {
        if (sessionStorage.getItem('bethel_demo_logged_in') === 'true') {
            callback(DEMO_USER);
        } else {
            callback(null);
        }
        return;
    }

    onAuthStateChanged(auth, async (user) => {
        if (user) {
            const userDoc = await getDoc(doc(db, "users", user.uid));
            if (userDoc.exists() && userDoc.data().role === 'admin') {
                callback(user);
            } else {
                await signOut(auth);
                callback(null);
            }
        } else {
            callback(null);
        }
    });
}
