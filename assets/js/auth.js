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

let authCallback = null;

/**
 * Handle user login.
 */
export async function login(email, password) {
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
