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
  useIonRouter
} from '@ionic/react';
import { 
  closeOutline, 
  checkmarkOutline, 
  peopleOutline, 
  personAddOutline, 
  chatbubbleEllipsesOutline,
  ellipsisVerticalOutline,
  trashOutline
} from 'ionicons/icons';
import { socialService, FriendRequest } from '../services/socialService';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { db } from '../services/firebase';
import { doc, getDoc, collection, onSnapshot } from 'firebase/firestore';
import './SocialPage.css';

const SocialPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'amigos' | 'solicitudes'>('amigos');
  const [requests, setRequests] = useState<any[]>([]);
  const [friends, setFriends] = useState<any[]>([]);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [presentToast] = useIonToast();
  const router = useIonRouter();

  useEffect(() => {
    const unsubscribe = firebaseAuthService.subscribe(async (user) => {
      setCurrentUser(user);
      if (user) {
        // Subscribe to requests
        const unsubReq = socialService.subscribeToFriendRequests(user.uid, async (rawRequests) => {
          const detailedRequests = await Promise.all(
            rawRequests.map(async (req) => {
              const userRef = doc(db, 'users', req.fromId);
              const userSnap = await getDoc(userRef);
              return { ...req, userData: userSnap.data() || { name: 'Usuario Desconocido' } };
            })
          );
          setRequests(detailedRequests);
        });

        // Load Friends
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const friendIds = userSnap.data().friends || [];
          const detailedFriends = await Promise.all(
            friendIds.map(async (fId: string) => {
              const fRef = doc(db, 'users', fId);
              const fSnap = await getDoc(fRef);
              return { id: fId, ...(fSnap.data() || { name: 'Usuario Desconocido' }) };
            })
          );
          setFriends(detailedFriends);
        }

        // Subscribe to unread counts
        const chatsRef = collection(db, `users/${user.uid}/privateChats`);
        const unsubChats = onSnapshot(chatsRef, (snapshot) => {
          const counts: Record<string, number> = {};
          snapshot.forEach(docSnap => {
            counts[docSnap.id] = docSnap.data().unreadCount || 0;
          });
          setUnreadCounts(counts);
        });

        return () => {
          unsubReq();
          unsubChats();
        };
      }
    });

    return () => unsubscribe();
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
      await socialService.rejectFriendRequest(currentUser.uid, friendUid);
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
          <div className="tab-container animate-fade-in">
            {friends.length > 0 ? (
              <IonList className="social-list glass-list">
                {friends.map(friend => (
                  <IonItem key={friend.id} className="social-item">
                    <IonAvatar slot="start" onClick={() => router.push(`/chat/${friend.id}`)} className="clickable">
                      <img src={friend.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${friend.id}`} alt="avatar" />
                    </IonAvatar>
                    <IonLabel onClick={() => router.push(`/chat/${friend.id}`)} className="clickable">
                      <h2>{friend.name || friend.displayName || 'Lector'} {friend.flag || ''}</h2>
                      <p>{friend.rank || 'Explorador'}</p>
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
                <IonIcon icon={peopleOutline} />
                <h3>No tienes amigos aún</h3>
                <p>Socializa en el chat global para conocer a otros lectores.</p>
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
                      <img src={req.userData.avatarUrl || `https://api.dicebear.com/7.x/identicon/svg?seed=${req.fromId}`} alt="avatar" />
                    </IonAvatar>
                    <IonLabel>
                      <h2>{req.userData.name || req.userData.displayName || 'Lector'}</h2>
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
                <IonIcon icon={personAddOutline} />
                <h3>No hay solicitudes</h3>
                <p>Aquí aparecerán las personas que quieran ser tus amigos.</p>
              </div>
            )}
          </div>
        )}
      </IonContent>

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
                await socialService.removeFriend(currentUser.uid, selectedFriend);
                setFriends(prev => prev.filter(f => f.id !== selectedFriend));
                presentToast({ message: 'Nakama eliminado', duration: 2000 });
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
