import React, { useState, useEffect, useCallback } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonSearchbar,
  IonGrid,
  IonRow,
  IonCol,
  IonIcon,
  IonSpinner,
  IonImg,
  IonFooter,
  IonText,
  IonBadge
} from '@ionic/react';
import { 
  closeOutline, 
  imageOutline, 
  personCircleOutline, 
  colorPaletteOutline, 
  checkmarkCircle,
  searchOutline,
  sparklesOutline
} from 'ionicons/icons';
import { artService, SafebooruPost } from '../services/artService';
import './ArtPickerModal.css';

interface ArtPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, type: 'banner' | 'avatar' | 'both') => void;
}

const ArtPickerModal: React.FC<ArtPickerModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [searchText, setSearchText] = useState('');
  const [arts, setArts] = useState<SafebooruPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArt, setSelectedArt] = useState<SafebooruPost | null>(null);

  const fetchArt = useCallback(async (tags: string = 'scenery landscape') => {
    setLoading(true);
    try {
      const results = await artService.getRandomBackgrounds(tags, 40);
      setArts(results);
    } catch (error) {
      console.error("Error fetching gallery:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchArt(); // Initial load
    } else {
      setSearchText('');
      setSelectedArt(null);
    }
  }, [isOpen, fetchArt]);

  const handleSearch = (e: CustomEvent) => {
    const query = e.detail.value;
    setSearchText(query);
    if (!query) {
      fetchArt();
    } else {
      // Use spaces instead of + for cleaner encoding in artService
      fetchArt(query.trim());
    }
  };

  const selectAndApply = (type: 'banner' | 'avatar' | 'both') => {
    if (selectedArt) {
      onSelect(selectedArt.file_url, type);
      onClose();
    }
  };

  return (
    <IonModal isOpen={isOpen} onDidDismiss={onClose} className="art-picker-modal">
      <IonHeader className="ion-no-border">
        <IonToolbar className="art-picker-toolbar">
          <IonButtons slot="start">
            <IonButton onClick={onClose}>
              <IonIcon icon={closeOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
          <IonTitle>Galería de Arte Elite</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => fetchArt()} disabled={loading}>
              <IonIcon icon={sparklesOutline} slot="icon-only" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        <IonToolbar className="art-picker-search-toolbar">
          <IonSearchbar 
            value={searchText} 
            onIonInput={handleSearch}
            placeholder="Buscar personaje o tema..."
            className="premium-searchbar"
            debounce={1000}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent className="art-picker-content">
        {loading ? (
          <div className="art-loader">
            <IonSpinner name="crescent" color="primary" />
            <p>Descifrando grimorios visuales...</p>
          </div>
        ) : (
          <IonGrid className="art-grid">
            <IonRow>
              {arts.map((art) => (
                <IonCol size="6" sizeMd="4" key={art.id} className="art-col">
                  <div 
                    className={`art-item-card ${selectedArt?.id === art.id ? 'selected' : ''}`}
                    onClick={() => setSelectedArt(art)}
                  >
                    <IonImg src={art.preview_url} className="art-thumb" />
                    {selectedArt?.id === art.id && (
                      <div className="selection-overlay">
                        <IonIcon icon={checkmarkCircle} />
                      </div>
                    )}
                  </div>
                </IonCol>
              ))}
            </IonRow>
          </IonGrid>
        )}

        {!loading && arts.length === 0 && (
          <div className="art-empty">
            <IonIcon icon={searchOutline} className="empty-icon" />
            <h3>No se encontró este arte</h3>
            <p>Prueba con etiquetas más simples en inglés (ej: blue_sky, luffy, red_eyes)</p>
          </div>
        )}
      </IonContent>

      {selectedArt && (
        <IonFooter className="art-picker-footer animate-slide-up">
          <div className="selected-preview-banner">
             <div className="preview-info">
                <IonBadge color="primary">ID: {selectedArt.id}</IonBadge>
                <IonText color="light">
                  <p>{selectedArt.tags.split(' ').slice(0, 5).join(', ')}...</p>
                </IonText>
             </div>
             <div className="selection-actions">
                <IonButton fill="outline" size="small" onClick={() => selectAndApply('banner')}>
                  <IonIcon icon={colorPaletteOutline} slot="start" />
                  BANNER
                </IonButton>
                <IonButton fill="outline" size="small" onClick={() => selectAndApply('avatar')}>
                  <IonIcon icon={personCircleOutline} slot="start" />
                  AVATAR
                </IonButton>
                <IonButton fill="solid" size="small" color="primary" onClick={() => selectAndApply('both')}>
                  <IonIcon icon={imageOutline} slot="start" />
                  AMBOS
                </IonButton>
             </div>
          </div>
        </IonFooter>
      )}
    </IonModal>
  );
};

export default ArtPickerModal;
