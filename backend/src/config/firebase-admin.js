// Firebase Admin SDK Configuration
// Verifies Firebase ID tokens from the mobile app

const admin = require('firebase-admin');

// Initialize Firebase Admin
// For production, use GOOGLE_APPLICATION_CREDENTIALS environment variable
// or configure with explicit credentials
const initializeFirebaseAdmin = () => {
    if (admin.apps.length > 0) {
        return admin.app();
    }

    // Check for service account credentials in environment
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

    if (projectId && clientEmail && privateKey) {
        // Initialize with explicit credentials
        return admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey,
            }),
        });
    }

    // Fallback: Try to initialize with default credentials
    // This works if GOOGLE_APPLICATION_CREDENTIALS is set
    try {
        return admin.initializeApp({
            projectId: projectId || 'leftover-dde19',
        });
    } catch (error) {
        console.warn('⚠️ Firebase Admin not fully configured. Token verification may fail.');
        console.warn('Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY');
        return null;
    }
};

// Initialize on module load
const firebaseApp = initializeFirebaseAdmin();

/**
 * Verify a Firebase ID token
 * @param {string} idToken - The Firebase ID token from the client
 * @returns {Promise<DecodedIdToken>} - The decoded token with user info
 */
const verifyIdToken = async (idToken) => {
    if (!firebaseApp) {
        throw new Error('Firebase Admin SDK not initialized');
    }

    try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        return decodedToken;
    } catch (error) {
        console.error('Token verification failed:', error.message);
        throw error;
    }
};

/**
 * Get user by phone number
 * @param {string} phoneNumber - The phone number to look up
 * @returns {Promise<UserRecord|null>} - The user record or null
 */
const getUserByPhone = async (phoneNumber) => {
    try {
        const user = await admin.auth().getUserByPhoneNumber(phoneNumber);
        return user;
    } catch (error) {
        if (error.code === 'auth/user-not-found') {
            return null;
        }
        throw error;
    }
};

module.exports = {
    admin,
    verifyIdToken,
    getUserByPhone,
    firebaseApp,
};
