import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  IonBadge,
  IonSkeletonText,
  IonList,
  IonItem,
  IonLabel,
  IonRippleEffect
} from '@ionic/react';
import { 
  closeOutline, 
  imageOutline, 
  personCircleOutline, 
  colorPaletteOutline, 
  checkmarkCircle,
  searchOutline,
  sparklesOutline,
  chevronUpOutline,
  diamondOutline,
  brushOutline,
  flashOutline
} from 'ionicons/icons';
import { artService, SafebooruPost } from '../services/artService';
import './ArtPickerModal.css';

interface ArtPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, type: 'banner' | 'avatar' | 'both') => void;
}

const ArtPickerModal: React.FC<ArtPickerModalProps> = ({ isOpen, onClose, onSelect }) => {
  // Search States
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Gallery States
  const [arts, setArts] = useState<SafebooruPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArt, setSelectedArt] = useState<SafebooruPost | null>(null);
  
  // Refs
  const modalRef = useRef<HTMLIonModalElement>(null);

  const fetchArt = useCallback(async (tags: string = 'highres wallpaper scenery landscape') => {
    setLoading(true);
    setShowSuggestions(false);
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
      fetchArt();
    } else {
      setSearchText('');
      setSuggestions([]);
      setSelectedArt(null);
    }
  }, [isOpen, fetchArt]);

  // Autocomplete Logic
  useEffect(() => {
    if (searchText.length > 1 && !loading) {
      const delayDebounceFn = setTimeout(async () => {
        const suggs = await artService.getTagSuggestions(searchText);
        setSuggestions(suggs);
        setShowSuggestions(suggs.length > 0);
      }, 400);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchText]);

  const handleSearchInput = (e: CustomEvent) => {
    setSearchText(e.detail.value || '');
  };

  const handleSelectSuggestion = (tag: string) => {
    setSearchText(tag);
    fetchArt(tag);
    setShowSuggestions(false);
  };

  const selectAndApply = (type: 'banner' | 'avatar' | 'both') => {
    if (selectedArt) {
      onSelect(selectedArt.file_url, type);
      onClose();
    }
  };

  const renderSkeletons = () => {
    return Array(12).fill(0).map((_, i) => (
      <IonCol size="6" sizeMd="4" key={`skel-${i}`} className="art-col">
        <div className="art-item-skeleton">
          <IonSkeletonText animated style={{ width: '100%', height: '100%' }} />
        </div>
      </IonCol>
    ));
  };

  return (
    <IonModal 
      ref={modalRef}
      isOpen={isOpen} 
      onDidDismiss={onClose} 
      className="art-picker-modal ultra-pro"
      breakpoints={[0, 0.4, 0.7, 0.95]}
      initialBreakpoint={0.7}
      handle={true}
    >
      <IonHeader className="ion-no-border">
        <IonToolbar className="art-picker-toolbar">
          <IonButtons slot="start">
            <IonButton onClick={onClose} className="close-btn-round">
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>Galería Haus Elite</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={() => fetchArt()} disabled={loading} className="sparkle-btn">
              <IonIcon icon={sparklesOutline} color="primary" />
            </IonButton>
          </IonButtons>
        </IonToolbar>
        
        <div className="search-container-premium">
          <IonSearchbar 
            value={searchText} 
            onIonInput={handleSearchInput}
            onKeyPress={(e) => e.key === 'Enter' && fetchArt(searchText)}
            placeholder="Escribe un personaje o tema..."
            className="ultra-searchbar"
            debounce={0}
            animated={true}
          />
          
          {showSuggestions && (
            <div className="suggestions-dropdown animate-fade-in">
              <IonList className="suggestions-list">
                {suggestions.map((tag) => (
                  <IonItem 
                    button 
                    key={tag} 
                    onClick={() => handleSelectSuggestion(tag)}
                    className="suggestion-item"
                    detail={false}
                  >
                    <IonIcon icon={flashOutline} slot="start" color="primary" style={{ fontSize: '0.8rem' }} />
                    <IonLabel>{tag.replace(/_/g, ' ')}</IonLabel>
                  </IonItem>
                ))}
              </IonList>
            </div>
          )}
        </div>

        <div className="quick-filters-scroll premium-curation">
          <div className="quick-filters">
            <button className={`filter-chip ${searchText === '' ? 'active' : ''}`} onClick={() => { setSearchText(''); fetchArt('highres wallpaper scenery landscape'); }}>✨ Elite</button>
            <button className="filter-chip" onClick={() => { setSearchText('official'); fetchArt('official_art highres'); }}>🏆 Oficial</button>
            <button className="filter-chip" onClick={() => { setSearchText('landscape'); fetchArt('scenery landscape highres'); }}>🌅 Paisajes</button>
            <button className="filter-chip" onClick={() => { setSearchText('urban'); fetchArt('cityscape urban neon'); }}>🏙️ Ciudad</button>
            <button className="filter-chip" onClick={() => { setSearchText('watercolor'); fetchArt('traditional_media watercolor aesthetic'); }}>🎨 Arte</button>
            <button className="filter-chip" onClick={() => { setSearchText('cyber'); fetchArt('cyberpunk night_city'); }}>🌃 Cyber</button>
          </div>
        </div>
      </IonHeader>

      <IonContent className="art-picker-content glass-content">
        <div className="content-padding">
          {loading ? (
            <IonGrid className="art-grid">
              <IonRow>{renderSkeletons()}</IonRow>
            </IonGrid>
          ) : (
            <IonGrid className="art-grid">
              <IonRow>
                {arts.map((art) => (
                  <IonCol size="6" sizeMd="4" key={art.id} className="art-col">
                    <div 
                      className={`art-item-card ultra-card ${selectedArt?.id === art.id ? 'selected' : ''}`}
                      onClick={() => setSelectedArt(art)}
                    >
                      <IonImg src={art.preview_url} className="art-thumb" />
                      <div className="art-badge-overlay">
                         <span className="res-tag">{art.width}x{art.height}</span>
                      </div>
                      <IonRippleEffect />
                    </div>
                  </IonCol>
                ))}
              </IonRow>
            </IonGrid>
          )}

          {!loading && arts.length === 0 && (
            <div className="art-empty-state">
              <div className="empty-icon-wrapper">
                <IonIcon icon={searchOutline} />
              </div>
              <h3>Grimorio Vacío</h3>
              <p>No encontramos arte con esa esencia. Prueba etiquetas más simples.</p>
            </div>
          )}
        </div>
      </IonContent>

      {selectedArt && (
        <div className="immersive-preview-overlay animate-slide-up">
            <div className="preview-header">
                <IonButton fill="clear" onClick={() => setSelectedArt(null)} className="back-btn">
                    <IonIcon icon={closeOutline} />
                </IonButton>
                <div className="preview-meta">
                   <h3>Vista Previa</h3>
                   <p>{selectedArt.tags.split(' ').slice(0, 3).join(', ')}</p>
                </div>
                <IonBadge color="primary">{selectedArt.width}x{selectedArt.height}</IonBadge>
            </div>
            
            <div className="preview-body">
              <div className="preview-image-container">
                <IonImg src={selectedArt.sample_url} className="full-preview-img" />
                <div className="preview-glow"></div>
              </div>
            </div>

            <div className="preview-footer-actions">
              <div className="action-row">
                <IonButton expand="block" fill="outline" className="action-btn-pill" onClick={() => selectAndApply('banner')}>
                  <IonIcon icon={colorPaletteOutline} slot="start" />
                  BANNER
                </IonButton>
                <IonButton expand="block" fill="outline" className="action-btn-pill" onClick={() => selectAndApply('avatar')}>
                  <IonIcon icon={personCircleOutline} slot="start" />
                  AVATAR
                </IonButton>
              </div>
              <IonButton expand="block" fill="solid" color="primary" className="apply-both-btn" onClick={() => selectAndApply('both')}>
                <IonIcon icon={diamondOutline} slot="start" />
                APLICAR COMO MAESTRO (AMBOS)
              </IonButton>
            </div>
        </div>
      )}
    </IonModal>
  );
};

export default ArtPickerModal;
