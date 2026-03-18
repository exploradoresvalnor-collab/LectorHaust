import React, { useState, useEffect, useRef } from 'react';
import { 
  IonPage, 
  IonHeader, 
  IonToolbar, 
  IonTitle, 
  IonContent, 
  IonFooter, 
  IonInput, 
  IonButton, 
  IonIcon,
  IonAvatar,
  IonBackButton,
  IonButtons,
  useIonViewWillLeave,
  IonActionSheet,
  useIonToast,
  IonModal,
  IonCard,
  IonCardContent,
  IonBadge,
  IonProgressBar,
  IonText,
  useIonRouter,
  getPlatforms
} from '@ionic/react';
import { 
  send, 
  paperPlaneOutline, 
  checkmarkOutline, 
  checkmarkDoneOutline, 
  warningOutline, 
  close, 
  copyOutline, 
  trophyOutline, 
  starOutline, 
  timeOutline, 
  alertCircleOutline, 
  bookOutline, 
  personAddOutline, 
  chatbubbleEllipsesOutline,
  happyOutline,
  attachOutline
} from 'ionicons/icons';
import { Keyboard } from '@capacitor/keyboard';
import { db } from '../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, setDoc } from 'firebase/firestore';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { socialService, FriendRequest } from '../services/socialService';
import { userStatsService, UserStats } from '../services/userStatsService';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import './ChatPage.css';

// --- Helpers ---
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};
const getCountryFlag = () => {
  try {
    const locale = navigator.language || 'en-US';
    // Extracts the country code (e.g., "US" from "en-US", or "ES" from "es-ES")
    const countryCode = locale.split('-')[1] || locale.toUpperCase();
    
    // Convert 2-letter country code to Regional Indicator Symbol letters (emoji flags)
    const codePoints = countryCode
      .toUpperCase()
      .split('')
      .map(char => 127397 + char.charCodeAt(0));
      
    // Return emoji flag, fallback to generic world icon if parsing fails
    return String.fromCodePoint(...codePoints) || '🌍';
  } catch (e) {
    return '🌍';
  }
};

// Basic word filter
const censorText = (text: string) => {
  if (!text) return '';
  const badWords = ['puta', 'puto', 'mierda', 'pendejo', 'pendeja', 'zorra', 'cabron', 'cabrón', 'verga', 'pene', 'nazi', 'violacion'];
  let censored = text;
  // Case insensitive replacement
  badWords.forEach(word => {
    const regex = new RegExp(word, 'gi');
    censored = censored.replace(regex, '***');
  });
  return censored;
};

interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  userAvatar: string;
  timestamp: any;
}

const ChatPage: React.FC = () => {
  const router = useIonRouter();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<any>(null);
  const contentRef = useRef<HTMLIonContentElement | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Moderation state
  const [presentToast] = useIonToast();
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<{ uid: string, name: string, avatar: string, isGuest: boolean } | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  useEffect(() => {
    // 1. Subscribe to auth state (and handle Ghost Mode login)
    const unsubscribeAuth = firebaseAuthService.subscribe(async (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        // Ghost Mode Auto-Login
        try {
          const anonUser = await firebaseAuthService.loginAnonymously();
          setCurrentUser(anonUser);
        } catch (error) {
          console.error("Failed to automatically sign in anonymously", error);
        }
      }
    });

    // 2. Subscribe to Firebase Global Chat
    const chatRef = collection(db, 'global_chat');
    const q = query(chatRef, orderBy('timestamp', 'desc'), limit(50));

    const unsubscribeChat = onSnapshot(q, (snapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as ChatMessage);
      });
      // Reverse to render oldest top to newest bottom
      setMessages(fetchedMessages.reverse());
      scrollToBottom(300);
    });

    // 3. Listen to Native Keyboard for smooth UX (Ignore on Web)
    const setupKeyboard = async () => {
      if (!Capacitor.isNativePlatform()) return;
      
      try {
        await Keyboard.addListener('keyboardWillShow', info => {
          setIsKeyboardOpen(true);
          setTimeout(() => scrollToBottom(100), 50);
        });
        await Keyboard.addListener('keyboardWillHide', () => {
          setIsKeyboardOpen(false);
        });
      } catch (e) {
        console.warn('Keyboard plugin not available');
      }
    };
    setupKeyboard();

    // 4. Subscribe to Typing Metadata
    const metaRef = doc(db, 'global_chat', '_meta_typing');
    const unsubscribeTyping = onSnapshot(metaRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const activeTypers = Object.keys(data).filter(uid => {
          // Filter out our own typing status
          return currentUser ? uid !== currentUser.uid && data[uid] : data[uid];
        });
        setTypingUsers(activeTypers.map(uid => data[uid] as string));
        // Auto-scroll slightly if someone starts typing at bottom
        setTimeout(() => scrollToBottom(100), 50);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeChat();
      unsubscribeTyping();
      if (Capacitor.isNativePlatform()) {
        Keyboard.removeAllListeners();
      }
    };
  }, []);

  useIonViewWillLeave(() => {
    if (Capacitor.isNativePlatform()) {
      Keyboard.removeAllListeners();
    }
  });

  const scrollToBottom = (speed = 300) => {
    if (contentRef.current) {
      contentRef.current.scrollToBottom(speed);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentUser) return;
    
    // Optimistic clear
    const textToSend = newMessage.trim();
    setNewMessage('');
    setShowEmojiPicker(false); // Hide emoji picker after sending

    try {
      // Ghost Mode Name Generator
      const flag = getCountryFlag();
      const guestId = currentUser.uid.substring(0, 4).toUpperCase();
      const finalDisplayName = currentUser.displayName || `Lector ${guestId} ${flag}`;

      await addDoc(collection(db, 'global_chat'), {
        text: textToSend,
        userId: currentUser.uid,
        userName: finalDisplayName,
        userAvatar: currentUser.photoURL || `https://api.dicebear.com/7.x/identicon/svg?seed=${currentUser.uid}`,
        timestamp: serverTimestamp(),
        status: 'sent' // Initial status
      });
      // Auto-scroll handled by onSnapshot
    } catch (error) {
      console.error("Error sending message:", error);
      // Revert if failed (optional sophisticated UX)
      setNewMessage(textToSend);
    }
  };

  const handleTyping = async (e: any) => {
    const text = e.detail.value!;
    setNewMessage(text);

    if (!currentUser) return;

    // Ghost Mode Name Generator (e.g., "Lector 001 🇪🇸")
    const flag = getCountryFlag();
    // Use the first 4 chars of the UID as the unique 'Guest ID'
    const guestId = currentUser.uid.substring(0, 4).toUpperCase();
    const finalDisplayName = currentUser.displayName || `Lector ${guestId} ${flag}`;
    
    // Set typing state to true in Firebase
    await setDoc(doc(db, 'global_chat', '_meta_typing'), {
      [currentUser.uid]: finalDisplayName
    }, { merge: true });

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to clear typing state after 2 seconds
    typingTimeoutRef.current = setTimeout(async () => {
      await setDoc(doc(db, 'global_chat', '_meta_typing'), {
        [currentUser.uid]: null
      }, { merge: true });
    }, 2000);
  };

  const isMyMessage = (msgUserId: string) => {
    return currentUser && currentUser.uid === msgUserId;
  };

  const openMessageActions = (msg: ChatMessage) => {
    setActionMessage(msg);
    setShowActionSheet(true);
  };

  const handleReport = async () => {
    if (!actionMessage || !currentUser) return;
    
    try {
      await addDoc(collection(db, 'reports'), {
        messageId: actionMessage.id,
        reportedUserId: actionMessage.userId,
        reporterId: currentUser.uid,
        reason: 'Inappropriate Content or Spam',
        timestamp: serverTimestamp()
      });
      presentToast({
        message: 'Mensaje reportado. Nuestro equipo lo revisará.',
        duration: 2500,
        color: 'success',
        position: 'top'
      });
    } catch (error) {
      console.error('Error reporting message:', error);
      presentToast({
        message: 'Hubo un error al enviar el reporte.',
        duration: 2000,
        color: 'danger',
        position: 'top'
      });
    }
  };

  const openPublicProfile = async (msg: ChatMessage) => {
    const isGuest = msg.userName.startsWith('Lector ');
    setSelectedProfileUser({
      uid: msg.userId,
      name: msg.userName,
      avatar: msg.userAvatar,
      isGuest
    });
    setShowProfileModal(true);
    
    if (!isGuest) {
      setIsStatsLoading(true);
      try {
        const userStats = await userStatsService.getOrInitStats(msg.userId);
        setStats(userStats);
      } catch (error) {
        console.error("Error loading user stats:", error);
      } finally {
        setIsStatsLoading(false);
      }
    } else {
      setStats(null);
    }
  };

  const handleCopy = () => {
    if (actionMessage) {
      navigator.clipboard.writeText(actionMessage.text);
      presentToast({
        message: 'Mensaje copiado al portapapeles',
        duration: 2000,
        color: 'primary',
        position: 'top'
      });
    }
  };

  return (
    <IonPage className="chat-page">
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/home" />
          </IonButtons>
          <IonTitle>Chat Global
            <div className="online-indicator">
              <span className="dot"></span> Online
            </div>
          </IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent ref={contentRef} className="chat-content ion-padding">
        {/* We no longer show the login prompt because Ghost Mode logs them in silently! */}
        
        <div className="messages-container">
          {messages.map((msg, index) => {
            const mine = isMyMessage(msg.userId);
            const prevMsg = index > 0 ? messages[index - 1] : null;
            const isConsecutive = prevMsg && prevMsg.userId === msg.userId;

            return (
              <div 
                key={msg.id} 
                className={`message-wrapper ${mine ? 'mine' : 'theirs'} ${isConsecutive ? 'consecutive' : ''}`}
              >
                {!mine && !isConsecutive && (
                  <div className="message-header">
                    <IonAvatar 
                      className="chat-avatar clickable" 
                      onClick={() => openPublicProfile(msg)}
                    >
                      <img src={msg.userAvatar || `https://api.dicebear.com/7.x/identicon/svg?seed=${msg.userId}`} alt="Avatar" />
                    </IonAvatar>
                    <span className="sender-name" onClick={() => openPublicProfile(msg)}>{msg.userName}</span>
                  </div>
                )}
                
                <div 
                  className={`message-bubble ${mine ? 'mine' : 'theirs'} ${msg.type === 'recommendation' ? 'recommendation-bubble' : ''}`}
                  onClick={() => openMessageActions(msg)}
                  onContextMenu={(e) => { e.preventDefault(); openMessageActions(msg); }}
                >
                  {msg.type === 'recommendation' ? (
                    <div className="recommendation-card" onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/manga/${msg.mangaId}`);
                    }}>
                      <div className="rec-badge">RECOMENDACIÓN ✨</div>
                      <div className="rec-content">
                        <img src={msg.mangaCover} alt={msg.mangaTitle} className="rec-cover" />
                        <div className="rec-info">
                          <span className="rec-title">{msg.mangaTitle}</span>
                          <IonButton size="small" fill="solid" color="primary" className="rec-view-btn">
                            VER DETALLES
                          </IonButton>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="message-text">
                        {censorText(msg.text)}
                      </div>
                      <div className="timestamp-inline">
                        {formatTimestamp(msg.timestamp)}
                        {isMyMessage(msg.userId) && (
                          <span className="message-status-inline">
                            {msg.status === 'read' ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            );
          })}

          {typingUsers.length > 0 && (
            <div className="message-wrapper theirs typing">
              <div className="message-header">
                <span className="sender-name">
                  {typingUsers.length === 1 
                    ? `${typingUsers[0]} está escribiendo...` 
                    : 'Varios están escribiendo...'}
                </span>
              </div>
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
              <IonIcon 
                icon={happyOutline} 
                className="action-icon" 
                onClick={() => setShowEmojiPicker(!showEmojiPicker)} 
              />
              <IonInput
                className="chat-input"
                placeholder="Escribe un mensaje..."
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
            onEmojiClick={(emojiData) => {
              setNewMessage(prev => prev + emojiData.emoji);
            }}
            width="100%"
            height={350}
            skinTonesDisabled
            searchDisabled
            previewConfig={{ showPreview: false }}
          />
        </div>
      </IonFooter>

      {/* Profile Modal - Redesigned as "Player Card" */}
      <IonModal
        isOpen={showProfileModal}
        onDidDismiss={() => {
          setShowProfileModal(false);
          setSelectedProfileUser(null);
          setStats(null);
        }}
        className="profile-modal premium-player-card"
      >
        {selectedProfileUser && (
          <div className="player-card-container">
            {/* Banner Area */}
            <div className="player-card-banner">
              <div className="banner-overlay"></div>
              <IonButton 
                fill="clear" 
                className="close-card-btn" 
                onClick={() => setShowProfileModal(false)}
              >
                <IonIcon icon={close} />
              </IonButton>
            </div>

            <div className="player-card-content">
              {/* Profile Main Header */}
              <div className="player-main-header">
                <div className="player-avatar-wrapper">
                  <img src={selectedProfileUser.avatar} alt="Avatar" className="player-card-avatar" />
                  {!selectedProfileUser.isGuest && (
                    <div className="player-level-badge">
                      LVL {stats?.level || 1}
                    </div>
                  )}
                </div>
                <div className="player-name-info">
                  <h2 className="player-card-name">{selectedProfileUser.name}</h2>
                  <span className="player-rank">
                    {selectedProfileUser.isGuest ? 'Invitado Temporal' : (userStatsService.getRankName(stats?.level || 1))}
                  </span>
                </div>
              </div>

              {/* Stats Section */}
              {selectedProfileUser.isGuest ? (
                <div className="ghost-vibe-msg">
                  <IonIcon icon={alertCircleOutline} />
                  <p>Inicia sesión con Google para desbloquear estadísticas, niveles y logros únicos.</p>
                </div>
              ) : (
                <div className="player-stats-section">
                  {/* XP Progress Bar */}
                  <div className="xp-container">
                    <div className="xp-label">
                      <span>Progreso de Nivel</span>
                      <span>{stats?.xp || 0} / {(stats?.level || 1) * 1000} XP</span>
                    </div>
                    <div className="xp-bar-wrapper">
                      <div 
                        className="xp-bar-fill" 
                        style={{ width: `${Math.min(((stats?.xp || 0) / ((stats?.level || 1) * 1000)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="stats-badges-grid">
                    <div className="stat-badge-card highlight">
                      <IonIcon icon={bookOutline} />
                      <div className="stat-value">{stats?.chaptersRead || 0}</div>
                      <div className="stat-label">Capítulos</div>
                    </div>
                    <div className="stat-badge-card highlight">
                      <IonIcon icon={trophyOutline} />
                      <div className="stat-value">{stats?.achievements?.length || 0}</div>
                      <div className="stat-label">Logros</div>
                    </div>
                    <div className="stat-badge-card highlight">
                      <IonIcon icon={starOutline} />
                      <div className="stat-value">{stats?.xp || 0}</div>
                      <div className="stat-label">Total XP</div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="player-card-footer">
                {!selectedProfileUser.isGuest && !isMyMessage(selectedProfileUser.uid) && (
                  <div className="social-actions-grid">
                    <IonButton 
                      expand="block" 
                      color="primary" 
                      onClick={() => {
                        if (currentUser) {
                          socialService.sendFriendRequest(currentUser.uid, selectedProfileUser.uid);
                          presentToast({ message: 'Solicitud enviada 🤝', duration: 2000, color: 'success' });
                        }
                      }}
                    >
                      <IonIcon icon={personAddOutline} slot="start" />
                      AGREGAR
                    </IonButton>
                    <IonButton 
                      expand="block" 
                      color="secondary"
                      onClick={() => {
                        // Future: Navigate to private chat
                        presentToast({ message: 'Chat privado (Próximamente)', duration: 2000 });
                      }}
                    >
                      <IonIcon icon={chatbubbleEllipsesOutline} slot="start" />
                      MENSAJE
                    </IonButton>
                  </div>
                )}
                <IonButton expand="block" fill="clear" onClick={() => setShowProfileModal(false)} className="close-btn">
                  CERRAR PERFIL
                </IonButton>
              </div>
            </div>
          </div>
        )}
      </IonModal>

      <IonActionSheet
        isOpen={showActionSheet}
        onDidDismiss={() => setShowActionSheet(false)}
        header="Opciones de mensaje"
        buttons={[
          {
            text: 'Copiar texto',
            icon: copyOutline,
            handler: handleCopy
          },
          {
            text: 'Reportar mensaje',
            role: 'destructive',
            icon: warningOutline,
            handler: handleReport
          },
          {
            text: 'Cancelar',
            role: 'cancel',
            icon: close
          }
        ]}
      />
    </IonPage>
  );
};

export default ChatPage;
