/**
 * CharacterDex Widget - Integración en MangaDetailsPage
 * Muestra personajes principales del manga
 */

import React, { useState } from 'react';
import {
  IonCard,
  IonCardContent,
  IonText,
  IonIcon,
  IonButton,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonSegment,
  IonSegmentButton,
  IonLabel
} from '@ionic/react';
import { star, starOutline, closeOutline, add } from 'ionicons/icons';
import { useCharacterDex } from '../../../hooks/useCharacterDex';
import './character-dex.css';

interface CharacterDexWidgetProps {
  mangaId: string;
  mangaTitle: string;
  characters?: Array<{
    id: string;
    name: string;
    role: 'protagonist' | 'antagonist' | 'support' | 'minor';
    archetype?: string;
    imageUrl?: string;
    description?: string;
  }>;
}

export const CharacterDexWidget: React.FC<CharacterDexWidgetProps> = ({
  mangaId,
  mangaTitle,
  characters = [
    {
      id: 'char-1',
      name: 'Protagonista Principal',
      role: 'protagonist',
      archetype: 'determinado',
      description: 'Personaje principal del manga'
    },
    {
      id: 'char-2',
      name: 'Personaje de Apoyo',
      role: 'support',
      archetype: 'inteligente',
      description: 'Ayuda al protagonista en su viaje'
    },
    {
      id: 'char-3',
      name: 'Antagonista',
      role: 'antagonist',
      archetype: 'misterioso',
      description: 'Principal obstáculo del protagonista'
    }
  ]
}) => {
  const [showModal, setShowModal] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<any>(null);
  const [filterRole, setFilterRole] = useState<'all' | 'protagonist' | 'support' | 'antagonist'>('all');

  const { 
    favorites, 
    addToFavorites, 
    removeFromFavorites, 
    isFavorite,
    findSimilar
  } = useCharacterDex();

  const filteredCharacters = filterRole === 'all'
    ? characters
    : characters.filter(c => c.role === filterRole);

  const handleCharacterSelect = (char: any) => {
    setSelectedCharacter(char);
  };

  const handleToggleFavorite = (character: any) => {
    if (isFavorite(character.id)) {
      removeFromFavorites(character.id);
    } else {
      addToFavorites({
        ...character,
        mangaId,
        mangaTitle
      }, 5, '');
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'protagonist':
        return 'success';
      case 'antagonist':
        return 'danger';
      case 'support':
        return 'primary';
      default:
        return 'medium';
    }
  };

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      protagonist: 'Protagonista',
      antagonist: 'Antagonista',
      support: 'Apoyo',
      minor: 'Secundario'
    };
    return labels[role] || role;
  };

  return (
    <>
      <IonCard className="character-card">
        <IonCardContent>
          <div className="character-header">
            <h3>📖 Personajes Principales</h3>
            <span className="char-count">{characters.length}</span>
          </div>

          {/* Filtro por rol */}
          <IonSegment 
            value={filterRole} 
            onIonChange={(e) => setFilterRole(e.detail.value as any)}
            className="role-filter"
          >
            <IonSegmentButton value="all">
              <IonLabel>Todos</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="protagonist">
              <IonLabel>Protagonista</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="support">
              <IonLabel>Apoyo</IonLabel>
            </IonSegmentButton>
            <IonSegmentButton value="antagonist">
              <IonLabel>Antagonista</IonLabel>
            </IonSegmentButton>
          </IonSegment>

          {/* Lista de personajes */}
          <div className="characters-list">
            {filteredCharacters.map((char) => (
              <div key={char.id} className="character-item">
                <div className="char-icon">
                  {char.imageUrl ? (
                    <img src={char.imageUrl} alt={char.name} />
                  ) : (
                    <div className="char-placeholder">
                      {char.name.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="char-info">
                  <h4>{char.name}</h4>
                  <div className="char-meta">
                    <span className={`role-badge role-${char.role}`}>
                      {getRoleLabel(char.role)}
                    </span>
                    {char.archetype && (
                      <span className="archetype">{char.archetype}</span>
                    )}
                  </div>
                  {char.description && (
                    <p className="description">{char.description}</p>
                  )}
                </div>

                <div className="char-actions">
                  <IonButton
                    fill="clear"
                    size="small"
                    onClick={() => handleToggleFavorite(char)}
                    className={isFavorite(char.id) ? 'favorited' : ''}
                  >
                    <IonIcon
                      icon={isFavorite(char.id) ? star : starOutline}
                      slot="icon-only"
                    />
                  </IonButton>
                </div>
              </div>
            ))}
          </div>

          {/* Ver todos los personajes */}
          <IonButton
            expand="block"
            fill="outline"
            onClick={() => setShowModal(true)}
            className="view-all-btn"
          >
            Ver colección completa
          </IonButton>
        </IonCardContent>
      </IonCard>

      {/* Modal de personaje seleccionado */}
      {selectedCharacter && (
        <IonModal
          isOpen={!!selectedCharacter}
          onDidDismiss={() => setSelectedCharacter(null)}
          className="character-modal"
        >
          <IonHeader>
            <IonToolbar>
              <IonTitle>{selectedCharacter.name}</IonTitle>
              <IonButtons slot="end">
                <IonButton onClick={() => setSelectedCharacter(null)}>
                  <IonIcon icon={closeOutline} />
                </IonButton>
              </IonButtons>
            </IonToolbar>
          </IonHeader>
          <IonContent>
            <div className="modal-content">
              {selectedCharacter.imageUrl && (
                <div className="modal-image">
                  <img src={selectedCharacter.imageUrl} alt={selectedCharacter.name} />
                </div>
              )}

              <div className="modal-info">
                <h2>{selectedCharacter.name}</h2>

                <div className="info-section">
                  <h3>Rol</h3>
                  <p>{getRoleLabel(selectedCharacter.role)}</p>
                </div>

                {selectedCharacter.archetype && (
                  <div className="info-section">
                    <h3>Arquetipo</h3>
                    <p>{selectedCharacter.archetype}</p>
                  </div>
                )}

                {selectedCharacter.description && (
                  <div className="info-section">
                    <h3>Descripción</h3>
                    <p>{selectedCharacter.description}</p>
                  </div>
                )}

                <div className="action-buttons">
                  <IonButton
                    expand="block"
                    fill={isFavorite(selectedCharacter.id) ? 'solid' : 'outline'}
                    onClick={() => {
                      handleToggleFavorite(selectedCharacter);
                      setSelectedCharacter(null);
                    }}
                  >
                    <IonIcon icon={isFavorite(selectedCharacter.id) ? star : starOutline} slot="start" />
                    {isFavorite(selectedCharacter.id) ? 'En favoritos' : 'Agregar a favoritos'}
                  </IonButton>
                </div>
              </div>
            </div>
          </IonContent>
        </IonModal>
      )}
    </>
  );
};

export default CharacterDexWidget;
