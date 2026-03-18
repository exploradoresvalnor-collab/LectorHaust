import { 
  doc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  writeBatch, 
  collection, 
  query, 
  where, 
  onSnapshot,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';

export interface FriendRequest {
  id: string; // The UI of the sender
  fromId: string;
  timestamp: any;
  status: 'pending' | 'accepted' | 'rejected';
}

export const socialService = {
  /**
   * Send a friend request to another user
   */
  async sendFriendRequest(fromUid: string, toUid: string) {
    const requestRef = doc(db, `users/${toUid}/friendRequests`, fromUid);
    await setDoc(requestRef, {
      fromId: fromUid,
      status: 'pending',
      timestamp: serverTimestamp()
    });
  },

  /**
   * Accept a friend request
   */
  async acceptFriendRequest(myUid: string, friendUid: string) {
    const batch = writeBatch(db);

    // 1. Add friend to my list of friends
    const myRef = doc(db, 'users', myUid);
    batch.update(myRef, {
      friends: arrayUnion(friendUid)
    });

    // 2. Add me to friend's list of friends
    const friendRef = doc(db, 'users', friendUid);
    batch.set(friendRef, {
      friends: arrayUnion(myUid)
    }, { merge: true });

    // 3. Delete the request
    const requestRef = doc(db, `users/${myUid}/friendRequests`, friendUid);
    batch.delete(requestRef);

    await batch.commit();
  },

  /**
   * Reject a friend request
   */
  async rejectFriendRequest(myUid: string, friendUid: string) {
    const requestRef = doc(db, `users/${myUid}/friendRequests`, friendUid);
    await deleteDoc(requestRef);
  },

  /**
   * Generate a unique and consistent Chat ID for 1-to-1 conversation
   */
  getPrivateChatId(uid1: string, uid2: string): string {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  },

  /**
   * Subscribe to friend requests (real-time)
   */
  subscribeToFriendRequests(myUid: string, callback: (requests: FriendRequest[]) => void) {
    const q = query(collection(db, `users/${myUid}/friendRequests`));
    return onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FriendRequest));
      callback(requests);
    });
  }
};
