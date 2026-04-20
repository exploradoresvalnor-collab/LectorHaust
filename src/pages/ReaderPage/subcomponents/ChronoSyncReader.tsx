/**
 * ChronoSync Reader Widget - Integración en ReaderPage
 * Lectura colaborativa con chat y leaderboard
 */

import React, { useState } from 'react';
import {
  IonButton,
  IonIcon,
  IonBadge,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonInput,
  IonCard,
  IonCardContent
} from '@ionic/react';
import { 
  people, 
  peopleOutline, 
  closeOutline, 
  send,
  warningOutline
} from 'ionicons/icons';
import { useChronoSync } from '../../../hooks/useChronoSync';
import './chronosync-reader.css';

interface ChronoSyncReaderProps {
  mangaId: string;
  chapterId: string;
  userId: string;
  userName: string;
  totalPages: number;
}

export const ChronoSyncReader: React.FC<ChronoSyncReaderProps> = ({
  mangaId,
  chapterId,
  userId,
  userName,
  totalPages
}) => {
  const [showPanel, setShowPanel] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [spoilerMode, setSpoilerMode] = useState(false);

  const {
    currentSession,
    joinedGroup,
    availableGroups,
    stats,
    groupLeaderboard,
    startSession,
    updateProgress,
    joinGroup,
    leaveGroup,
    sendChatMessage,
    isInGroup
  } = useChronoSync();

  // Iniciar sesión al montar
  React.useEffect(() => {
    if (!currentSession) {
      startSession(userId, userName, mangaId, 'Manga', chapterId, 'Capítulo', totalPages);
    }
  }, [userId, userName, mangaId, chapterId, totalPages]);

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      sendChatMessage(messageInput, spoilerMode);
      setMessageInput('');
      setSpoilerMode(false);
    }
  };

  const handleJoinGroup = (groupId: string) => {
    joinGroup(groupId);
  };

  return (
    <>
      {/* Botón flotante */}
      <button className="chronosync-fab" onClick={() => setShowPanel(true)}>
        <IonIcon icon={peopleOutline} />
        {isInGroup && <IonBadge color="success" className="badge">EN GRUPO</IonBadge>}
        {availableGroups.length > 0 && !isInGroup && (
          <IonBadge color="warning" className="badge">{availableGroups.length}</IonBadge>
        )}
      </button>

      {/* Panel Modal */}
      <IonModal
        isOpen={showPanel}
        onDidDismiss={() => setShowPanel(false)}
        className="chronosync-modal"
      >
        <IonHeader>
          <IonToolbar>
            <IonTitle>
              <IonIcon icon={people} /> Lectura en Vivo
            </IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowPanel(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="chronosync-content">
          {/* Stats Header */}
          <div className="chronosync-stats">
            <div className="stat-item">
              <span className="stat-value">{stats.activeReaders}</span>
              <span className="stat-label">Leyendo ahora</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.activeGroups}</span>
              <span className="stat-label">Grupos</span>
            </div>
            <div className="stat-item">
              <span className="stat-value">{stats.activeRaces}</span>
              <span className="stat-label">Carreras</span>
            </div>
          </div>

          {/* Grupo Activo */}
          {isInGroup && joinedGroup && (
            <IonCard className="active-group-card">
              <IonCardContent>
                <div className="group-header">
                  <h3>Mi Grupo</h3>
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={() => leaveGroup()}
                    className="leave-btn"
                  >
                    Salir
                  </IonButton>
                </div>

                {/* Leaderboard */}
                <div className="leaderboard-mini">
                  <h4>🏆 Top Lectores</h4>
                  <div className="leaderboard-list">
                    {groupLeaderboard.slice(0, 3).map((entry, idx) => (
                      <div key={idx} className="leaderboard-item">
                        <span className="rank-badge">
                          {idx === 0 && '🥇'}
                          {idx === 1 && '🥈'}
                          {idx === 2 && '🥉'}
                        </span>
                        <span className="name">{entry.userName}</span>
                        <span className="speed">{entry.readingSpeed.toFixed(1)} pág/min</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Chat */}
                <div className="group-chat">
                  <h4>💬 Chat</h4>
                  <div className="chat-messages">
                    {joinedGroup.chatMessages.slice(-5).map((msg, idx) => (
                      <div key={idx} className={`message ${msg.isSpoiler ? 'spoiler' : ''}`}>
                        <strong>{msg.userName}</strong>
                        {msg.isSpoiler && <span className="spoiler-badge">⚠️</span>}
                        <p>{msg.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Chat Input */}
                  <div className="chat-input-area">
                    <div className="input-wrapper">
                      <IonInput
                        placeholder="Escribe un mensaje..."
                        value={messageInput}
                        onIonChange={(e) => setMessageInput(e.detail.value || '')}
                        onKeyPress={(e) => {
                          if (e.key === 'Enter') {
                            handleSendMessage();
                          }
                        }}
                      />
                      <IonButton
                        fill={spoilerMode ? 'solid' : 'clear'}
                        size="small"
                        onClick={() => setSpoilerMode(!spoilerMode)}
                        className="spoiler-toggle"
                        title="Marcar como spoiler"
                      >
                        <IonIcon icon={warningOutline} />
                      </IonButton>
                      <IonButton
                        fill="clear"
                        size="small"
                        onClick={handleSendMessage}
                      >
                        <IonIcon icon={send} />
                      </IonButton>
                    </div>
                  </div>
                </div>
              </IonCardContent>
            </IonCard>
          )}

          {/* Grupos Disponibles */}
          {!isInGroup && availableGroups.length > 0 && (
            <div className="available-groups">
              <h3>Grupos Disponibles</h3>
              {availableGroups.map((group) => (
                <IonCard key={group.groupId} className="group-card">
                  <IonCardContent>
                    <div className="group-info">
                      <div className="group-details">
                        <h4>{group.mangaTitle}</h4>
                        <p className="group-stats">
                          {group.totalReaders} lectores • {group.averageReadingSpeed.toFixed(1)} pág/min
                        </p>
                      </div>
                      <IonButton
                        fill="solid"
                        size="small"
                        onClick={() => handleJoinGroup(group.groupId)}
                      >
                        Unirse
                      </IonButton>
                    </div>
                  </IonCardContent>
                </IonCard>
              ))}
            </div>
          )}

          {/* Sin Grupo y Sin Disponibles */}
          {!isInGroup && availableGroups.length === 0 && (
            <div className="empty-state">
              <IonIcon icon={peopleOutline} />
              <p>No hay grupos activos en este capítulo</p>
              <p className="hint">Sé el primero en crear uno</p>
            </div>
          )}
        </IonContent>
      </IonModal>
    </>
  );
};

export default ChronoSyncReader;
