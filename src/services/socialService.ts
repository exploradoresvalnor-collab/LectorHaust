import { 
  doc, 
  setDoc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove,
  writeBatch, 
  collection, 
  query, 
  where, 
  onSnapshot,
  deleteDoc,
  serverTimestamp,
  getDoc,
  increment
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
  },

  /**
   * Remove a friend
   */
  async removeFriend(myUid: string, friendUid: string) {
    const batch = writeBatch(db);
    batch.update(doc(db, 'users', myUid), { friends: arrayRemove(friendUid) });
    batch.update(doc(db, 'users', friendUid), { friends: arrayRemove(myUid) });
    await batch.commit();
  },

  /**
   * Check full friendship status
   */
  async getFriendshipStatus(myUid: string, targetUid: string): Promise<'friends' | 'pending_sent' | 'pending_received' | 'none'> {
    const myDoc = await getDoc(doc(db, 'users', myUid));
    if (myDoc.exists() && myDoc.data().friends?.includes(targetUid)) {
      return 'friends';
    }
    const sentReq = await getDoc(doc(db, `users/${targetUid}/friendRequests`, myUid));
    if (sentReq.exists()) return 'pending_sent';

    const receivedReq = await getDoc(doc(db, `users/${myUid}/friendRequests`, targetUid));
    if (receivedReq.exists()) return 'pending_received';

    return 'none';
  },

  /**
   * Manage Private Chat Unread Counts
   */
  async markPrivateMessagesRead(myUid: string, friendUid: string) {
    const chatStatusRef = doc(db, `users/${myUid}/privateChats`, friendUid);
    await setDoc(chatStatusRef, { unreadCount: 0 }, { merge: true });
  },

  async incrementUnreadCount(receiverUid: string, senderUid: string) {
    const chatStatusRef = doc(db, `users/${receiverUid}/privateChats`, senderUid);
    await setDoc(chatStatusRef, { 
      unreadCount: increment(1),
      lastMessageTime: serverTimestamp()
    }, { merge: true });
  },

  subscribeToUnreadCount(myUid: string, friendUid: string, callback: (count: number) => void) {
    const chatStatusRef = doc(db, `users/${myUid}/privateChats`, friendUid);
    return onSnapshot(chatStatusRef, (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data().unreadCount || 0);
      } else {
        callback(0);
      }
    });
  },

  subscribeToAllUnreadCount(myUid: string, callback: (count: number) => void) {
    const q = collection(db, `users/${myUid}/privateChats`);
    return onSnapshot(q, (snapshot) => {
      let total = 0;
      snapshot.forEach(doc => {
        total += doc.data().unreadCount || 0;
      });
      callback(total);
    });
  }
};
