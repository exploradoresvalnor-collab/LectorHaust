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
  useIonRouter,
  getPlatforms,
  IonInfiniteScroll,
  IonInfiniteScrollContent
} from '@ionic/react';
import { 
  send, 
  checkmarkOutline, 
  warningOutline, 
  close, 
  copyOutline, 
  happyOutline,
  attachOutline,
  personAddOutline,
  chatbubbleEllipsesOutline,
  alertCircleOutline,
  bookOutline,
  trophyOutline,
  starOutline
} from 'ionicons/icons';
import { Capacitor } from '@capacitor/core';
import { Keyboard } from '@capacitor/keyboard';
import { db } from '../../services/firebase';
import { collection, query, orderBy, limit, onSnapshot, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { firebaseAuthService } from '../../services/firebaseAuthService';
import { socialService } from '../../services/socialService';
import { userStatsService, UserStats } from '../../services/userStatsService';
import EmojiPicker, { Theme as EmojiTheme } from 'emoji-picker-react';
import './styles.css';

// --- Helpers ---
const formatTimestamp = (timestamp: any) => {
  if (!timestamp) return '';
  const date = (timestamp && typeof timestamp.toDate === 'function') 
    ? timestamp.toDate() 
    : new Date(timestamp);
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
  type?: 'recommendation';
  mangaId?: string;
  mangaCover?: string;
  mangaTitle?: string;
  status?: string;
}

const ChatPage: React.FC = () => {
  const router = useIonRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const currentUserIdRef = useRef<string | null>(null);
  const [limitCount, setLimitCount] = useState(30);
  const contentRef = useRef<HTMLIonContentElement | null>(null);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const blockedUsersRef = useRef<string[]>([]);
  
  // Moderation state
  const [presentToast] = useIonToast();
  const [actionMessage, setActionMessage] = useState<ChatMessage | null>(null);
  const [showActionSheet, setShowActionSheet] = useState(false);

  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfileUser, setSelectedProfileUser] = useState<{ uid: string, name: string, avatar: string, isGuest: boolean } | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [friendshipStatus, setFriendshipStatus] = useState<'friends' | 'pending_sent' | 'pending_received' | 'none' | 'loading'>('loading');

  useEffect(() => {
    // 1. Subscribe to auth state (and handle Ghost Mode login)
    const unsubscribeAuth = firebaseAuthService.subscribe(async (user) => {
      if (user) {
        setCurrentUser(user);
        currentUserIdRef.current = user.uid;

        // Fetch blocked users list
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists()) {
          const list = userSnap.data().blockedUsers || [];
          setBlockedUsers(list);
          blockedUsersRef.current = list;
        }
      } else {
        // Ghost Mode Auto-Login
        try {
          const anonUser = await firebaseAuthService.loginAnonymously();
          setCurrentUser(anonUser);
          currentUserIdRef.current = anonUser.uid;
        } catch (error) {
          console.error("Failed to automatically sign in anonymously", error);
        }
      }
    });

    // 2. Listen to Native Keyboard for smooth UX (Ignore on Web)
    let keyboardShowListener: any = null;
    let keyboardHideListener: any = null;

    const setupKeyboard = async () => {
      if (!Capacitor.isNativePlatform()) return;
      try {
        keyboardShowListener = await Keyboard.addListener('keyboardWillShow', info => {
          setIsKeyboardOpen(true);
          setTimeout(() => scrollToBottom(100), 50);
        });
        keyboardHideListener = await Keyboard.addListener('keyboardWillHide', () => {
          setIsKeyboardOpen(false);
        });
      } catch (e) {
        console.warn('Keyboard status fail');
      }
    };
    setupKeyboard();

    // 3. Subscribe to Typing Metadata
    const metaRef = doc(db, 'global_chat', '_meta_typing');
    const unsubscribeTyping = onSnapshot(metaRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as Record<string, string>;
        const activeTypers = Object.keys(data).filter(uid => {
          // Filter out our own typing status using the ref to avoid stale closure
          return currentUserIdRef.current ? uid !== currentUserIdRef.current && data[uid] : data[uid];
        });
        setTypingUsers(activeTypers.map(uid => data[uid] as string));
        // Auto-scroll slightly if someone starts typing at bottom
        setTimeout(() => scrollToBottom(100), 50);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubscribeTyping();
      if (Capacitor.isNativePlatform()) {
        Keyboard.removeAllListeners();
      }
    };
  }, []);

  // Separate useEffect for Chat messages to handle limitCount changes for pagination
  useEffect(() => {
    const chatRef = collection(db, 'global_chat');
    const q = query(chatRef, orderBy('timestamp', 'desc'), limit(limitCount));

    const unsubscribeChat = onSnapshot(q, (snapshot) => {
      const fetchedMessages: ChatMessage[] = [];
      snapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data({ serverTimestamps: 'estimate' }) } as ChatMessage);
      });
      // Filter blocked users and reverse for newest at bottom
      const filtered = fetchedMessages.filter(msg => !blockedUsersRef.current.includes(msg.userId));
      setMessages([...filtered].reverse());
      
      // Only scroll to bottom on initial load, not when paginating
      if (limitCount === 30) {
        scrollToBottom(300);
      }
    });

    return () => unsubscribeChat();
  }, [limitCount]);

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

  const handleReportAndBlock = async () => {
    if (!actionMessage || !currentUser) return;
    
    try {
      // 1. Send report
      await socialService.reportUser(
        currentUser.uid, 
        actionMessage.userId, 
        'Contenido Inapropiado / Spam', 
        actionMessage.text
      );

      // 2. Block user
      await socialService.blockUser(currentUser.uid, actionMessage.userId);
      
      // Update local state immediately
      setBlockedUsers(prev => [...prev, actionMessage.userId]);
      
      presentToast({ 
        message: 'Usuario bloqueado y reportado. No verás más sus mensajes.', 
        duration: 3000, 
        color: 'success',
        position: 'top' 
      });
      setShowActionSheet(false);
    } catch (error) {
      console.error("Error reporting/blocking:", error);
      presentToast({ message: 'Hubo un error al procesar el reporte.', duration: 2000, color: 'danger' });
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
      setFriendshipStatus('loading');
      try {
        const userStats = await userStatsService.getStats(msg.userId);
        setStats(userStats);
        if (currentUser && !currentUser.isAnonymous) {
           const status = await socialService.getFriendshipStatus(currentUser.uid, msg.userId);
           setFriendshipStatus(status);
        } else {
           setFriendshipStatus('none');
        }
      } catch (error) {
        console.warn("Silent: Error loading public profile meta:", error);
        setFriendshipStatus('none');
      } finally {
        setIsStatsLoading(false);
      }
    } else {
      setStats(null);
      setFriendshipStatus('none');
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
        
        <IonInfiniteScroll position="top" onIonInfinite={(e) => {
          setLimitCount(prev => prev + 30);
          setTimeout(() => e.target.complete(), 500);
        }}>
          <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Cargando más mensajes..."></IonInfiniteScrollContent>
        </IonInfiniteScroll>

        <div className="messages-container">
          {messages
            .filter(msg => !blockedUsers.includes(msg.userId))
            .map((msg, index) => {
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
                    <span 
                      className="sender-name" 
                      onClick={() => openPublicProfile(msg)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          openPublicProfile(msg);
                        }
                      }}
                    >
                      {msg.userName}
                    </span>
                  </div>
                )}
                
                <div 
                  className={`message-bubble ${mine ? 'mine' : 'theirs'} ${msg.type === 'recommendation' ? 'recommendation-bubble' : ''}`}
                  onClick={() => openMessageActions(msg)}
                  onContextMenu={(e) => { e.preventDefault(); openMessageActions(msg); }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Opciones de mensaje de ${msg.userName}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      openMessageActions(msg);
                    }
                  }}
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
      <IonFooter className={`chat-footer ion-no-border ${isKeyboardOpen ? 'keyboard-open' : ''}`}>
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
            
            <div 
              className="send-btn-circle" 
              onClick={handleSendMessage}
              role="button"
              tabIndex={0}
              aria-label="Enviar mensaje"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSendMessage();
                }
              }}
            >
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
                {!selectedProfileUser.isGuest && !isMyMessage(selectedProfileUser.uid) && currentUser && !currentUser.isAnonymous && (
                  <div className="social-actions-grid">
                    {friendshipStatus === 'friends' ? (
                      <IonButton expand="block" color="medium" disabled>
                        <IonIcon icon={checkmarkOutline} slot="start" />
                        AMIGOS
                      </IonButton>
                    ) : friendshipStatus === 'pending_sent' ? (
                      <IonButton expand="block" color="medium" disabled>
                        <IonIcon icon={personAddOutline} slot="start" />
                        SOLICITUD ENVIADA
                      </IonButton>
                    ) : friendshipStatus === 'pending_received' ? (
                      <IonButton expand="block" color="success" onClick={async () => {
                        try {
                          await socialService.acceptFriendRequest(currentUser.uid, selectedProfileUser.uid);
                          setFriendshipStatus('friends');
                          presentToast({ message: '¡Nuevo Nakama agregado! 🤝', duration: 2000, color: 'success' });
                        } catch (error: any) {
                          console.error("Error accepting friend request:", error);
                          presentToast({ 
                            message: `Error: ${error.message || 'No se pudo aceptar la solicitud'}`, 
                            duration: 3000, 
                            color: 'danger' 
                          });
                        }
                      }}>
                        <IonIcon icon={checkmarkOutline} slot="start" />
                        ACEPTAR SOLICITUD
                      </IonButton>
                    ) : (
                      <IonButton 
                        expand="block" 
                        color="primary" 
                        disabled={friendshipStatus === 'loading'}
                        onClick={async () => {
                          if (currentUser) {
                            try {
                              await socialService.sendFriendRequest(currentUser.uid, selectedProfileUser.uid);
                              setFriendshipStatus('pending_sent');
                              presentToast({ message: 'Solicitud enviada 🤝', duration: 2000, color: 'success' });
                            } catch (error: any) {
                              console.error("Error sending friend request:", error);
                              presentToast({ 
                                message: `Error: ${error.message || 'No se pudo enviar la solicitud'}`, 
                                duration: 3000, 
                                color: 'danger' 
                              });
                            }
                          }
                        }}
                      >
                        <IonIcon icon={personAddOutline} slot="start" />
                        AGREGAR
                      </IonButton>
                    )}

                    <IonButton 
                      expand="block" 
                      color={friendshipStatus === 'friends' ? "secondary" : "medium"}
                      onClick={() => {
                        if (friendshipStatus === 'friends') {
                          setShowProfileModal(false);
                          router.push(`/chat/${selectedProfileUser.uid}`);
                        } else {
                          presentToast({ message: 'Requiere ser Nakama para enviar mensaje privado', duration: 2000, color: 'warning' });
                        }
                      }}
                    >
                      <IonIcon icon={chatbubbleEllipsesOutline} slot="start" />
                      MENSAJE {friendshipStatus !== 'friends' && '🔒'}
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
            text: 'Bloquear y Reportar',
            role: 'destructive',
            icon: warningOutline,
            handler: handleReportAndBlock
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
