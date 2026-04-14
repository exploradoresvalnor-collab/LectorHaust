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
import { auth, db } from './firebase';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';

const googleProvider = new GoogleAuthProvider();

export const firebaseAuthService = {
  /**
   * Helper: Ensure user document exists in Firestore
   */
  async ensureUserDoc(user: User, customData: any = {}) {
    try {
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.displayName,
          avatar: user.photoURL,
          email: user.email || null,
          createdAt: serverTimestamp(),
          friends: [],
          ...customData
        });
      }
    } catch (e) {
      console.warn('[Auth] Failed to ensure user doc:', e);
    }
  },

  /**
   * Login with Google
   */
  async loginWithGoogle() {
    try {
      if (Capacitor.getPlatform() !== 'web') {
        const { signInWithRedirect } = await import('firebase/auth');
        return await signInWithRedirect(auth, googleProvider);
      }
      const result = await signInWithPopup(auth, googleProvider);
      
      // Sync with Firestore
      await this.ensureUserDoc(result.user);

      return result.user;
    } catch (error) {
      console.error('Error logging in with Google:', error);
      throw error;
    }
  },

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

      if (user.displayName) return user;

      // Geolocation
      let flag = '🌍';
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        flag = this.getFlagEmoji(data.country_code || 'UN');
      } catch (e) {
        console.warn('Geolocation failed');
      }

      const shortId = user.uid.substring(0, 4).toUpperCase();
      const ghostName = `Lector ${shortId} ${flag}`;
      const ghostAvatar = `https://api.dicebear.com/7.x/identicon/svg?seed=${user.uid}`;

      // Update Firebase Profile
      await updateProfile(user, {
        displayName: ghostName,
        photoURL: ghostAvatar
      });
      
      // Sync with Firestore
      await this.ensureUserDoc(user, { isAnonymous: true });

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
