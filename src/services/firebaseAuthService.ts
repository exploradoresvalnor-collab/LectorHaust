import { Capacitor } from '@capacitor/core';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged,
  User,
  signInAnonymously,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase';

const googleProvider = new GoogleAuthProvider();

export const firebaseAuthService = {
  /**
   * Login with Google
   */
  async loginWithGoogle() {
    try {
      // On native mobile platforms, signInWithPopup often fails. 
      // Using signInWithRedirect or a future native plugin is recommended.
      if (Capacitor.getPlatform() !== 'web') {
        const { signInWithRedirect } = await import('firebase/auth');
        return await signInWithRedirect(auth, googleProvider);
      }
      const result = await signInWithPopup(auth, googleProvider);
      return result.user;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      throw error;
    }
  },

  /**
   * Login Anonymously (Lector Fantasma)
   */
  /**
   * Helper: Convert country code 'CO' to emoji flag
   */
  getFlagEmoji(countryCode: string) {
    if (!countryCode || countryCode === 'UN') return '🏳️';
    const offset = 127397;
    return countryCode
      .toUpperCase()
      .split('')
      .map(char => String.fromCodePoint(char.charCodeAt(0) + offset))
      .join('');
  },

  /**
   * Login Anonymously (Lector Fantasma) with International Flag
   */
  async loginAnonymously() {
    try {
      const result = await signInAnonymously(auth);
      const user = result.user;

      // If user already has a display name, don't overwrite with new flag (optional)
      if (user.displayName) return user;

      // Fetch country by IP (Fast & Free API)
      let flag = '🌍';
      let countryCode = 'UN';
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        countryCode = data.country_code || 'UN';
        flag = this.getFlagEmoji(countryCode);
      } catch (e) {
        console.warn('Geolocation failed, using default flag');
      }

      // Generate Ghost Name: Lector [ShortID] [Flag]
      const shortId = user.uid.substring(0, 4).toUpperCase();
      const ghostName = `Lector ${shortId} ${flag}`;

      // Update Firebase Profile so it persists
      await updateProfile(user, {
        displayName: ghostName,
        photoURL: `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`
      });

      return user;
    } catch (error) {
      console.error('Error logging in anonymously:', error);
      throw error;
    }
  },

  /**
   * Logout
   */
  async logout() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  },

  /**
   * Listen to auth state changes
   */
  subscribe(callback: (user: User | null) => void) {
    return onAuthStateChanged(auth, callback);
  },

  /**
   * Get current user
   */
  getCurrentUser() {
    return auth.currentUser;
  }
};
