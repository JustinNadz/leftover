// Firebase Phone Authentication Service
// This service handles OTP sending and verification using Firebase

import auth from '@react-native-firebase/auth';

/**
 * Format phone number to international format
 * @param {string} phone - Local phone number (e.g., "09361919427")
 * @param {string} countryCode - Country code (default: "+63" for Philippines)
 * @returns {string} - Formatted phone number (e.g., "+639361919427")
 */
export const formatPhoneNumber = (phone, countryCode = '+63') => {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If starts with 0, remove it (Philippine format)
    if (cleaned.startsWith('0')) {
        cleaned = cleaned.substring(1);
    }

    // If already has country code digits, don't add again
    if (cleaned.startsWith('63')) {
        return '+' + cleaned;
    }

    return countryCode + cleaned;
};

/**
 * Send OTP to phone number
 * @param {string} phoneNumber - Phone number in local format
 * @returns {Promise<ConfirmationResult>} - Firebase confirmation result
 */
export const sendOTP = async (phoneNumber) => {
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        console.log('📱 Sending OTP to:', formattedPhone);

        const confirmation = await auth().signInWithPhoneNumber(formattedPhone);
        console.log('✅ OTP sent successfully');

        return confirmation;
    } catch (error) {
        console.error('❌ Send OTP error:', error);
        throw error;
    }
};

/**
 * Verify OTP code
 * @param {ConfirmationResult} confirmation - Firebase confirmation result from sendOTP
 * @param {string} code - 6-digit OTP code
 * @returns {Promise<UserCredential>} - Firebase user credential
 */
export const verifyOTP = async (confirmation, code) => {
    try {
        console.log('🔐 Verifying OTP...');

        const userCredential = await confirmation.confirm(code);
        console.log('✅ OTP verified successfully');

        return userCredential;
    } catch (error) {
        console.error('❌ Verify OTP error:', error);
        throw error;
    }
};

/**
 * Get Firebase ID token for backend authentication
 * @returns {Promise<string|null>} - Firebase ID token
 */
export const getIdToken = async () => {
    const user = auth().currentUser;
    if (user) {
        return await user.getIdToken();
    }
    return null;
};

/**
 * Sign out from Firebase
 */
export const signOut = async () => {
    try {
        await auth().signOut();
        console.log('👋 Signed out from Firebase');
    } catch (error) {
        console.error('❌ Sign out error:', error);
    }
};

/**
 * Get current Firebase user
 * @returns {FirebaseUser|null}
 */
export const getCurrentUser = () => {
    return auth().currentUser;
};

/**
 * Listen to auth state changes
 * @param {function} callback - Callback function
 * @returns {function} - Unsubscribe function
 */
export const onAuthStateChanged = (callback) => {
    return auth().onAuthStateChanged(callback);
};

export const firebaseAuth = {
    sendOTP,
    verifyOTP,
    getIdToken,
    signOut,
    getCurrentUser,
    onAuthStateChanged,
    formatPhoneNumber,
};

export default firebaseAuth;
