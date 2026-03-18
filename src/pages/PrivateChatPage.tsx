import React, { useState, useEffect, useRef } from 'react';
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonFooter, 
  IonInput, 
  IonIcon,
  IonAvatar,
  IonBackButton,
  IonButtons,
  useIonViewWillLeave,
  IonInfiniteScroll,
  IonInfiniteScrollContent
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { send, happyOutline, attachOutline } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { socialService } from '../services/socialService';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import './ChatPage.css'; // Reuse global chat CSS

const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return '';
  const date = (timestamp && typeof timestamp.toDate === 'function') 
    ? timestamp.toDate() 
    : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  timestamp: any;
  status?: string;
}

const PrivateChatPage: React.FC = () => {
  const { friendId } = useParams<{ friendId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const [limitCount, setLimitCount] = useState(30);
  const contentRef = useRef<HTMLIonContentElement | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [friendData, setFriendData] = useState<any>(null);

  const privateChatId = currentUser ? socialService.getPrivateChatId(currentUser.uid, friendId) : null;

  useEffect(() => {
    // 1. Subscribe to auth
    const unsubscribeAuth = firebaseAuthService.subscribe((user) => {
      if (user && !user.isAnonymous) {
        setCurrentUser(user);
        currentUserIdRef.current = user.uid;
      }
    });

    // 2. Fetch Friend Data
    const fetchFriend = async () => {
      if (friendId) {
        const snap = await getDoc(doc(db, 'users', friendId));
        if (snap.exists()) setFriendData(snap.data());
      }
    };
    fetchFriend();

    // 3. Setup Keyboard
    const setupKeyboard = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        await Keyboard.addListener('keyboardWillShow', () => { setTimeout(() => scrollToBottom(100), 50); });
        await Keyboard.addListener('keyboardWillHide', () => {});
      } catch (e) {
        console.warn('Keyboard not available');
      }
    };
    setupKeyboard();

    return () => {
      unsubscribeAuth();
      if (Capacitor.isNativePlatform()) Keyboard.removeAllListeners();
    };
  }, [friendId]);

  // Messages Subscription
  useEffect(() => {
    if (!privateChatId || !currentUser) return;

    const chatRef = collection(db, 'private_chats', privateChatId, 'messages');
    const q = query(chatRef, orderBy('timestamp', 'desc'), limit(limitCount));

    const unsubscribeChat = onSnapshot(q, async (snapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      snapshot.forEach((docSnap) => {
        fetchedMessages.push({ id: docSnap.id, ...docSnap.data({ serverTimestamps: 'estimate' }) } as ChatMessage);
      });
      setMessages(fetchedMessages.reverse());
      
      // Mark messages as read when viewing
      if (currentUserIdRef.current) {
        await socialService.markPrivateMessagesRead(currentUserIdRef.current, friendId);
      }

      if (limitCount === 30) {
        scrollToBottom(300);
      }
    });

    // Sub to Typing Metadata
    const metaRef = doc(db, 'private_chats', privateChatId, '_meta_typing');
    const unsubscribeTyping = onSnapshot(metaRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Record<string, boolean>;
        const activeTypers = Object.keys(data).filter(uid => {
          return currentUserIdRef.current ? uid !== currentUserIdRef.current && data[uid] : data[uid];
        });
        setTypingUsers(activeTypers);
        setTimeout(() => scrollToBottom(100), 50);
      }
    });

    return () => {
      unsubscribeChat();
      unsubscribeTyping();
    };
  }, [privateChatId, limitCount, friendId, currentUser]);

  useIonViewWillLeave(() => {
    if (Capacitor.isNativePlatform()) {
      Keyboard.removeAllListeners();
    }
    // Mark as read one last time before leaving
    if (currentUser) {
      socialService.markPrivateMessagesRead(currentUser.uid, friendId);
    }
  });

  const scrollToBottom = (speed = 300) => {
    if (contentRef.current) {
      contentRef.current.scrollToBottom(speed);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !privateChatId) return;
    
    const textToSend = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false);

    try {
      await addDoc(collection(db, 'private_chats', privateChatId, 'messages'), {
        text: textToSend,
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
        status: 'sent'
      });
      // Increment unread count for the remote friend
      await socialService.incrementUnreadCount(friendId, currentUser.uid);

      await setDoc(doc(db, 'private_chats', privateChatId, '_meta_typing'), {
        [currentUser.uid]: false
      }, { merge: true });
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(textToSend);
    }
  };

  const handleTyping = async (e: any) => {
    const text = e.detail.value!;
    setNewMessage(text);
    if (!currentUser || !privateChatId) return;

    await setDoc(doc(db, 'private_chats', privateChatId, '_meta_typing'), {
      [currentUser.uid]: true
    }, { merge: true });

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(async () => {
      await setDoc(doc(db, 'private_chats', privateChatId, '_meta_typing'), {
        [currentUser.uid]: false
      }, { merge: true });
    }, 2000);
  };

  if (!currentUser || currentUser.isAnonymous) {
    return (
      <IonPage>
        <IonHeader>
          <IonToolbar>
            <IonButtons slot="start"><IonBackButton defaultHref="/social" /></IonButtons>
            <IonTitle>Chat Privado</IonTitle>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding center-content">
          <p>Debes iniciar sesión para usar el chat privado.</p>
        </IonContent>
      </IonPage>
    );
  }

  return (
    <IonPage className="chat-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/social" />
          </IonButtons>
          {friendData && (
            <div slot="start" style={{ display: 'flex', alignItems: 'center', marginLeft: '10px' }}>
              <IonAvatar style={{ width: '32px', height: '32px', marginRight: '10px' }}>
                <img src={friendData.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${friendId}`} alt="avatar" />
              </IonAvatar>
              <IonTitle style={{ padding: 0 }}>{friendData.name || friendData.displayName || 'Nakama'}</IonTitle>
            </div>
          )}
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef} className="chat-content ion-padding">
        <IonInfiniteScroll position="top" onIonInfinite={(e) => {
          setLimitCount(prev => prev + 30);
          setTimeout(() => e.target.complete(), 500);
        }}>
          <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Cargando más mensajes..."></IonInfiniteScrollContent>
        </IonInfiniteScroll>

        <div className="messages-container">
          {messages.map((msg, index) => {
            const mine = msg.userId === currentUser.uid;
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isConsecutive = prevMsg && prevMsg.userId === msg.userId;

            return (
              <div key={msg.id} className={`message-wrapper ${mine ? 'mine' : 'theirs'} ${isConsecutive ? 'consecutive' : ''}`}>
                <div className={`message-bubble ${mine ? 'mine' : 'theirs'}`}>
                  <div className="message-text">{msg.text}</div>
                  <div className="timestamp-inline">
                    {formatTimestamp(msg.timestamp)}
                    {mine && <span className="message-status-inline">✓✓</span>}
                  </div>
                </div>
              </div>
            );
          })}

          {typingUsers.length > 0 && (
            <div className="message-wrapper theirs typing">
              <div className="message-bubble theirs typing-bubble">
                <span className="dot"></span>
                <span className="dot"></span>
                <span className="dot"></span>
              </div>
            </div>
          )}
        </div>
      </IonContent>

      <IonFooter className="chat-footer ion-no-border">
        <IonToolbar className="chat-input-toolbar">
          <div className="input-container">
            <div className="text-input-wrapper">
              <IonIcon icon={happyOutline} className="action-icon" onClick={() => setShowEmojiPicker(!showEmojiPicker)} />
              <IonInput
                className="chat-input"
                placeholder="Mensaje..."
                value={newMessage}
                onIonInput={handleTyping}
                onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                onFocus={() => setShowEmojiPicker(false)}
              />
              <IonIcon icon={attachOutline} className="action-icon" />
            </div>
            <div className="send-btn-circle" onClick={handleSendMessage}>
              <IonIcon icon={send} style={{ color: 'white', marginLeft: '3px' }} />
            </div>
          </div>
        </IonToolbar>
        <div className={`emoji-picker-container ${showEmojiPicker ? 'emoji-visible' : 'emoji-hidden'}`}>
          <EmojiPicker
            theme={EmojiTheme.DARK}
            onEmojiClick={(e) => setNewMessage(p => p + e.emoji)}
            width="100%"
            height={350}
            skinTonesDisabled
            searchDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      </IonFooter>
    </IonPage>
  );
};

export default PrivateChatPage;
