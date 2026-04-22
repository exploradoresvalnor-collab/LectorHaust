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
  IonButton,
  useIonViewWillLeave,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  useIonRouter
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { send, happyOutline, attachOutline, close } from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { db } from '../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { socialService } from '../../services/socialService';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import '../ChatPage/styles.css'; // Reuse global chat CSS

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
  const router = useIonRouter();
  const { friendId } = useParams<{ friendId: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const [limitCount, setLimitCount] = useState(30);
  const contentRef = useRef<HTMLIonContentElement | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef<boolean>(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [friendData, setFriendData] = useState<any>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  const privateChatId = currentUser ? socialService.getPrivateChatId(currentUser.uid, friendId) : null;

  useEffect(() => {
    // 1. Subscribe to auth
    const unsubscribeAuth = firebaseAuthService.subscribe((user) => {
      if (user && !user.isAnonymous) {
        setCurrentUser(user);
        currentUserIdRef.current = user.uid;
      }
    });

    // 2. Fetch Friend Data & Presence (Real-time)
    let unsubFriend: (() => void) | null = null;
    if (friendId) {
      unsubFriend = onSnapshot(doc(db, 'users', friendId), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          const lastActive = data.lastActive || 0;
          const isOnline = Date.now() - lastActive < 300000;
          setFriendData({
            ...data,
            isOnline,
            statusText: isOnline ? 'En línea' : formatLastSeen(lastActive)
          });
        }
      });
    }

    // 3. Setup Keyboard
    let keyboardShowListener: any = null;
    let keyboardHideListener: any = null;

    const setupKeyboard = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        keyboardShowListener = await Keyboard.addListener('keyboardWillShow', () => { 
          setIsKeyboardOpen(true);
          setTimeout(() => scrollToBottom(100), 50); 
        });
        keyboardHideListener = await Keyboard.addListener('keyboardWillHide', () => {
          setIsKeyboardOpen(false);
        });
      } catch (e) {
        console.warn('Keyboard not available');
      }
    };
    setupKeyboard();

    return () => {
      unsubscribeAuth();
      if (unsubFriend) unsubFriend();
      if (keyboardShowListener) keyboardShowListener.remove();
      if (keyboardHideListener) keyboardHideListener.remove();
    };
  }, [friendId]);

const formatLastSeen = (timestamp: number) => {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const timeStr = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return isToday ? `últ. vez hoy a las ${timeStr}` : `últ. vez el ${date.toLocaleDateString()}`;
};

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
        socialService.markPrivateMessagesRead(currentUserIdRef.current, friendId).catch(() => {});
      }

      // Scroll to bottom on load or new message
      setTimeout(() => scrollToBottom(300), 100);
    }, (error) => {
      console.error("Chat subscription error:", error);
    });

    // Sub to Typing Metadata
    const metaRef = doc(db, 'private_chats', privateChatId, 'typing', 'status');
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
    if (currentUser && privateChatId) {
      socialService.markPrivateMessagesRead(currentUser.uid, friendId).catch(() => {});
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      setDoc(doc(db, 'private_chats', privateChatId, 'typing', 'status'), {
        [currentUser.uid]: false
      }, { merge: true }).catch(() => {});
    }
  });

  const scrollToBottom = (speed = 300) => {
    const scrollEl = document.querySelector('.chat-scroll-area');
    if (scrollEl) {
      scrollEl.scrollTo({ top: scrollEl.scrollHeight, behavior: speed > 0 ? 'smooth' : 'auto' });
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser || !privateChatId) return;
    
    const textToSend = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false);

    // 1. Clear typing status locally & reset ref
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    isTypingRef.current = false;

    // 2. Notify server typing ended (Don't await to speed up message send)
    setDoc(doc(db, 'private_chats', privateChatId, 'typing', 'status'), {
      [currentUser.uid]: false
    }, { merge: true }).catch(() => {});

    try {
      // 3. Send actual message
      await addDoc(collection(db, 'private_chats', privateChatId, 'messages'), {
        text: textToSend,
        userId: currentUser.uid,
        timestamp: serverTimestamp(),
        status: 'sent'
      });
      
      // Increment unread count for friend
      await socialService.incrementUnreadCount(friendId, currentUser.uid);
      
      setTimeout(() => scrollToBottom(300), 50);
    } catch (error) {
      console.error("Error sending message:", error);
      setNewMessage(textToSend);
    }
  };

  const handleTyping = (e: any) => {
    const text = e.detail.value || '';
    setNewMessage(text);
    if (!currentUser || !privateChatId) return;

    // If empty text, clear typing immediately
    if (text.trim() === '') {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (isTypingRef.current) {
        isTypingRef.current = false;
        setDoc(doc(db, 'private_chats', privateChatId, 'typing', 'status'), {
          [currentUser.uid]: false
        }, { merge: true }).catch(() => {});
      }
      return;
    }

    // High performance typing indicator: only notify server if we weren't already typing
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      setDoc(doc(db, 'private_chats', privateChatId, 'typing', 'status'), {
        [currentUser.uid]: true
      }, { merge: true }).catch(() => {});
    }

    // Reset timeout
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    
    typingTimeoutRef.current = setTimeout(async () => {
      isTypingRef.current = false;
      setDoc(doc(db, 'private_chats', privateChatId, 'typing', 'status'), {
        [currentUser.uid]: false
      }, { merge: true }).catch(() => {});
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
      <IonContent ref={contentRef} className="chat-content" scrollY={false}>
        <div className="chat-viewport">
          <div className="chat-window">
            
            {/* Window Header (Fixed) */}
            <div className="chat-window-header">
              <div className="window-header-actions">
                <IonButton fill="clear" onClick={() => router.back()} className="window-back-btn">
                  <IonIcon icon={close} />
                </IonButton>
              </div>

              {friendData && (
                <div className="chat-window-avatar-area private">
                  <img 
                    src={friendData.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${friendId}`} 
                    alt="" 
                    className="window-header-logo"
                  />
                  <div className={`window-status-badge ${friendData.isOnline ? 'online' : ''}`}>
                    <span className="dot"></span> {friendData.isOnline ? 'Online' : 'Offline'}
                  </div>
                </div>
              )}
              
              <div className="chat-window-info">
                <h1 className="window-title">{friendData?.name || friendData?.displayName || 'Nakama'}</h1>
                <p className="window-subtitle">{friendData?.statusText || 'Conectando...'}</p>
              </div>
            </div>

            {/* Scrollable Message Area */}
            <div className="chat-scroll-area">
              <IonInfiniteScroll position="top" onIonInfinite={(e) => {
                setLimitCount(prev => prev + 30);
                setTimeout(() => e.target.complete(), 500);
              }}>
                <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Cargando historia..."></IonInfiniteScrollContent>
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
            </div>

            {/* Fixed Footer */}
            <div className="chat-window-footer-fixed">
              <div className="chat-input-centered-wrapper">
                <div className="chat-input-glass">
                  <IonIcon 
                    icon={happyOutline} 
                    className="chat-glass-icon" 
                    onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
                  />
                  <IonInput
                    className="chat-glass-input"
                    placeholder="Escribe un mensaje..."
                    value={newMessage}
                    onIonInput={handleTyping}
                    onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                    onFocus={() => setShowEmojiPicker(false)}
                  />
                  <div className="chat-glass-actions">
                    <IonIcon icon={attachOutline} className="chat-glass-icon" />
                    <button className="chat-send-pill" onClick={handleSendMessage}>
                      <IonIcon icon={send} />
                    </button>
                  </div>
                </div>
              </div>

              <div className={`emoji-picker-container ${showEmojiPicker ? 'emoji-visible' : 'emoji-hidden'}`}>
                <EmojiPicker
                  theme={EmojiTheme.DARK}
                  onEmojiClick={(emojiData) => {
                    setNewMessage(prev => prev + emojiData.emoji);
                  }}
                  width="100%"
                  height={300}
                  skinTonesDisabled
                  searchDisabled
                  previewConfig={{ showPreview: false }}
                />
              </div>
            </div>
          </div>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PrivateChatPage;
