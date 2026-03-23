import React, { useState, useEffect } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonAvatar,
  IonLabel,
  IonButton,
  IonIcon,
  IonButtons,
  IonBackButton,
  IonSegment,
  IonSegmentButton,
  IonBadge,
  useIonToast,
  IonActionSheet,
  useIonRouter,
  IonFab,
  IonFabButton,
  IonAlert
} from '@ionic/react';
import { 
  closeOutline, 
  checkmarkOutline, 
  peopleOutline, 
  personAddOutline, 
  chatbubbleEllipsesOutline,
  ellipsisVerticalOutline,
  trashOutline,
  planetOutline,
  chevronForwardOutline
} from 'ionicons/icons';
import { socialService, FriendRequest } from '../services/socialService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { db } from '../services/firebase';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import './SocialPage.css';

const formatLastActive = (timestamp: number) => {
  if (!timestamp) return 'Desconectado';
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Hace un momento';
  if (mins < 60) return `Hace ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return 'Fuera de línea';
};

const SocialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'amigos' | 'solicitudes'>('amigos');
  const [requests, setRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [showAddAlert, setShowAddAlert] = useState(false);
  const [presentToast] = useIonToast();
  const router = useIonRouter();

  useEffect(() => {
    let unsubReq: (() => void) | undefined;
    let unsubFriends: (() => void) | undefined;
    let unsubChats: (() => void) | undefined;

    const unsubscribeAuth = firebaseAuthService.subscribe(async (user) => {
      // 1. Cleanup previous listeners if user changes or logs out
      if (unsubReq) unsubReq();
      if (unsubFriends) unsubFriends();
      if (unsubChats) unsubChats();

      setCurrentUser(user);

      if (user) {
        // Subscribe to requests
        unsubReq = socialService.subscribeToFriendRequests(user.uid, async (rawRequests) => {
          const detailedRequests = await Promise.all(
            rawRequests.map(async (req) => {
              const userRef = doc(db, 'users', req.fromId);
              const userSnap = await getDoc(userRef);
              const data = userSnap.data() || {};
              return { 
                ...req, 
                userData: { 
                  ...data, 
                  name: data.name || data.displayName || `Usuario ${req.fromId.substring(0, 4)}` 
                } 
              };
            })
          );
          setRequests(detailedRequests);
        });

        // Load Friends (Real-time)
        const userRef = doc(db, 'users', user.uid);
        unsubFriends = onSnapshot(userRef, async (userSnap) => {
          if (userSnap.exists()) {
            const friendIds = userSnap.data().friends || [];
            const detailedFriends = await Promise.all(
              friendIds.map(async (fId: string) => {
                try {
                  const fRef = doc(db, 'users', fId);
                  const fSnap = await getDoc(fRef);
                  const data = fSnap.exists() ? fSnap.data() : {};
                  const lastActive = data.lastActive || 0;
                  const isOnline = Date.now() - lastActive < 300000; // 5 min
                  return { 
                    id: fId, 
                    ...data,
                    name: data.name || data.displayName || `Explorador ${fId.substring(0, 4)}`,
                    isOnline,
                    lastActiveStatus: isOnline ? 'En línea' : formatLastActive(lastActive)
                  };
                } catch (e) {
                  return { id: fId, name: `Usuario ${fId.substring(0, 4)}`, isOnline: false };
                }
              })
            );
            setFriends(detailedFriends);
          }
        });

        // Subscribe to unread counts
        const chatsRef = collection(db, `users/${user.uid}/privateChats`);
        unsubChats = onSnapshot(chatsRef, (snapshot) => {
          const counts: Record<string, number> = {};
          snapshot.forEach(docSnap => {
            counts[docSnap.id] = docSnap.data().unreadCount || 0;
          });
          setUnreadCounts(counts);
        });
      } else {
        // If logged out, reset lists
        setRequests([]);
        setFriends([]);
        setUnreadCounts({});
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubReq) unsubReq();
      if (unsubFriends) unsubFriends();
      if (unsubChats) unsubChats();
    };
  }, []);

  const handleAccept = async (friendUid: string) => {
    if (currentUser) {
      try {
        await socialService.acceptFriendRequest(currentUser.uid, friendUid);
        presentToast({ message: '¡Nuevo Nakama agregado! 🤝', duration: 2000, color: 'success' });
      } catch (e) {
        presentToast({ message: 'Error al aceptar solicitud', duration: 2000, color: 'danger' });
      }
    }
  };

  const handleReject = async (friendUid: string) => {
    if (currentUser) {
      try {
        await socialService.rejectFriendRequest(currentUser.uid, friendUid);
        presentToast({ message: 'Solicitud rechazada', duration: 2000, color: 'medium' });
      } catch (error: any) {
        console.error("Error rejecting request:", error);
        presentToast({ message: 'Error al rechazar solicitud', duration: 2000, color: 'danger' });
      }
    }
  };

  const handleSendRequest = async (friendUid: string) => {
    if (!friendUid || friendUid.trim() === '') {
      presentToast({ message: 'Ingresa un ID válido', duration: 2000, color: 'warning' });
      return;
    }
    if (friendUid === currentUser?.uid) {
      presentToast({ message: 'No puedes agregarte a ti mismo', duration: 2000, color: 'warning' });
      return;
    }
    try {
      await socialService.sendFriendRequest(currentUser.uid, friendUid.trim());
      presentToast({ message: '¡Solicitud enviada! 📨', duration: 2000, color: 'success' });
      setShowAddAlert(false);
    } catch (error: any) {
      console.error("Error enviando solicitud:", error);
      presentToast({ message: `Error: ${error.message || 'No se pudo enviar'}`, duration: 3000, color: 'danger' });
    }
  };

  return (
    <IonPage className="social-page">
      <IonHeader className="ion-no-border">
        <IonToolbar className="social-toolbar">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/profile" />
          </IonButtons>
          <IonTitle>Círculo Social</IonTitle>
        </IonToolbar>
        <IonToolbar className="segment-toolbar">
          <IonSegment 
            value={activeTab} 
            onIonChange={e => setActiveTab(e.detail.value as any)}
            className="social-segment"
          >
            <IonSegmentButton value="amigos">
              <IonLabel>Nakamas</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="solicitudes">
              <IonLabel>
                Pendientes
                {requests.length > 0 && <IonBadge color="danger">{requests.length}</IonBadge>}
              </IonLabel>
            </IonSegmentButton>
          </IonSegment>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="social-content ion-padding">
        {activeTab === 'amigos' && (
          <div className="tab-container animate-fade-in social-hub-container">
            
            {/* TAERNA GLOBAL BANNER */}
            <div 
              className="global-chat-banner glass-card" 
              onClick={() => router.push('/chat')}
            >
              <div className="banner-icon-wrapper">
                <IonIcon icon={planetOutline} />
              </div>
              <div className="banner-text">
                <h2>Taverna Global</h2>
                <p>Habla con todos los lectores del mundo</p>
              </div>
              <IonIcon icon={chevronForwardOutline} className="chevron-icon" />
            </div>

            <h3 className="section-title-social">
              TUS MENSAJES DIRECTOS
            </h3>

            {friends.length > 0 ? (
              <IonList className="social-list glass-list">
                {friends.map(friend => (
                  <IonItem key={friend.id} className="social-item">
                    <IonAvatar slot="start" onClick={() => router.push(`/chat/${friend.id}`)} className="clickable" style={{ position: 'relative' }}>
                      <img src={friend.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${friend.id}`} alt="avatar" />
                      {friend.isOnline && <div className="online-dot-badge"></div>}
                    </IonAvatar>
                    <IonLabel onClick={() => router.push(`/chat/${friend.id}`)} className="clickable">
                      <h2>{friend.name || friend.displayName || 'Lector'} {friend.flag || ''}</h2>
                      <p className={friend.isOnline ? 'status-online' : 'status-offline'}>
                        {friend.lastActiveStatus}
                      </p>
                    </IonLabel>
                    <IonButtons slot="end">
                      <IonButton 
                        color="primary" 
                        fill="clear" 
                        onClick={() => router.push(`/chat/${friend.id}`)}
                        className="msg-btn-social"
                        style={{ position: 'relative', overflow: 'visible' }}
                      >
                        <IonIcon icon={chatbubbleEllipsesOutline} slot="icon-only" />
                        {unreadCounts[friend.id] > 0 && (
                          <IonBadge color="danger" style={{ position: 'absolute', top: '-5px', right: '-5px', fontSize: '10px' }}>
                            {unreadCounts[friend.id]}
                          </IonBadge>
                        )}
                      </IonButton>
                      <IonButton color="medium" fill="clear" onClick={() => {
                        setSelectedFriend(friend.id);
                        setShowActionSheet(true);
                      }}>
                        <IonIcon icon={ellipsisVerticalOutline} slot="icon-only" />
                      </IonButton>
                    </IonButtons>
                  </IonItem>
                ))}
              </IonList>
            ) : (
              <div className="empty-state">
                <div className="empty-mascot-wrapper">
                  <img src="/Buho.webp" alt="Mascot" className="empty-mascot" onError={(e) => (e.currentTarget.src = '/logolh.webp')} />
                </div>
                <h3>No hay Nakamas</h3>
                <p>Socializa en el chat global para forjar nuevas alianzas.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'solicitudes' && (
          <div className="tab-container animate-fade-in">
            {requests.length > 0 ? (
              <IonList className="social-list glass-list">
                {requests.map(req => (
                  <IonItem key={req.id} className="social-item">
                    <IonAvatar slot="start">
                      <img src={req.userData?.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${req.fromId}`} alt="avatar" />
                    </IonAvatar>
                    <IonLabel>
                      <h2>{req.userData?.name || req.userData?.displayName || 'Lector'}</h2>
                      <p>Quiere ser tu Nakama</p>
                    </IonLabel>
                    <div className="request-actions" slot="end">
                      <IonButton color="medium" fill="clear" onClick={() => handleReject(req.fromId)}>
                        <IonIcon icon={closeOutline} slot="icon-only" />
                      </IonButton>
                      <IonButton color="primary" fill="solid" className="accept-btn" onClick={() => handleAccept(req.fromId)}>
                        <IonIcon icon={checkmarkOutline} slot="icon-only" />
                      </IonButton>
                    </div>
                  </IonItem>
                ))}
              </IonList>
            ) : (
              <div className="empty-state">
                <div className="empty-mascot-wrapper">
                  <img src="/Buho.webp" alt="Mascot" className="empty-mascot" onError={(e) => (e.currentTarget.src = '/logolh.webp')} style={{ transform: 'scaleX(-1)' }} />
                </div>
                <h3>Buzón Vacío</h3>
                <p>Aquí aparecerán los exploradores que quieran ser tus Nakamas.</p>
              </div>
            )}
          </div>
        )}
      </IonContent>

      <IonFab vertical="bottom" horizontal="end" slot="fixed">
        <IonFabButton onClick={() => setShowAddAlert(true)} className="add-friend-fab-button">
          <IonIcon icon={personAddOutline} />
        </IonFabButton>
      </IonFab>

      <IonAlert
        isOpen={showAddAlert}
        onDidDismiss={() => setShowAddAlert(false)}
        header="Agregar Nakama"
        message="Ingresa el ID de tu amigo para enviarle una solicitud:"
        inputs={[
          {
            name: 'friendId',
            type: 'text',
            placeholder: 'ID del usuario'
          }
        ]}
        buttons={[
          {
            text: 'Cancelar',
            role: 'cancel'
          },
          {
            text: 'Enviar',
            handler: (data) => {
              handleSendRequest(data.friendId);
            }
          }
        ]}
      />

      <IonActionSheet
        isOpen={showActionSheet}
        onDidDismiss={() => setShowActionSheet(false)}
        header="Opciones de Nakama"
        buttons={[
          {
            text: 'Eliminar Nakama',
            role: 'destructive',
            icon: trashOutline,
            handler: async () => {
              if (currentUser && selectedFriend) {
                try {
                  await socialService.removeFriend(currentUser.uid, selectedFriend);
                  setFriends(prev => prev.filter(f => f.id !== selectedFriend));
                  presentToast({ message: 'Nakama eliminado', duration: 2000, color: 'medium' });
                } catch (error: any) {
                  console.error("Error removing friend:", error);
                  presentToast({ message: 'Error al eliminar Nakama', duration: 2000, color: 'danger' });
                }
              }
            }
          },
          {
            text: 'Cancelar',
            role: 'cancel',
            icon: closeOutline
          }
        ]}
      />
    </IonPage>
  );
};

export default SocialPage;
