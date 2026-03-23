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
  chevronDownOutline,
  diamondOutline,
  brushOutline,
  flashOutline,
  arrowBackOutline
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
      setSelectedArt(null);
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
    <>
      {/* 1. Main Gallery Modal */}
      <IonModal 
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
              placeholder="Buscar personaje o tema..."
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
              <button className="filter-chip" onClick={() => { setSearchText('oficial'); fetchArt('official_art highres'); }}>🏆 Oficial</button>
              <button className="filter-chip" onClick={() => { setSearchText('paisajes'); fetchArt('scenery landscape highres'); }}>🌅 Paisajes</button>
              <button className="filter-chip" onClick={() => { setSearchText('ciudad'); fetchArt('cityscape urban neon'); }}>🏙️ Ciudad</button>
              <button className="filter-chip" onClick={() => { setSearchText('arte'); fetchArt('traditional_media watercolor aesthetic'); }}>🎨 Arte</button>
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
                <p>No encontramos arte con esa esencia.</p>
              </div>
            )}
          </div>
        </IonContent>
      </IonModal>

      {/* 2. Pro Detail Modal (Native Scroll & Bottom Safe) */}
      <IonModal 
        isOpen={!!selectedArt} 
        onDidDismiss={() => setSelectedArt(null)}
        className="art-detail-modal"
        breakpoints={[0, 0.95]}
        initialBreakpoint={0.95}
        handle={true}
      >
        <IonHeader className="ion-no-border">
          <IonToolbar className="detail-header-toolbar">
            <IonButtons slot="start">
              <IonButton onClick={() => setSelectedArt(null)} className="back-btn-square">
                <IonIcon icon={arrowBackOutline} />
              </IonButton>
            </IonButtons>
            <IonTitle>Vista Elite</IonTitle>
            <IonButtons slot="end">
               {selectedArt && <IonBadge color="primary" className="detail-res-badge">{selectedArt.width}x{selectedArt.height}</IonBadge>}
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="art-detail-content">
          {selectedArt && (
            <div className="detail-body-wrapper">
              <div className="detail-meta-header">
                <h3>{selectedArt.tags.split(' ').slice(0, 4).join(', ').replace(/_/g, ' ')}</h3>
                <p>Inspiración Maestra • Safebooru Elite</p>
              </div>
              
              <div className="preview-frame animate-fade-in">
                <IonImg src={selectedArt.sample_url} className="ultra-preview-img" />
                <div className="frame-glow"></div>
              </div>

              <div className="usage-tip">
                 <IonIcon icon={imageOutline} />
                 <span>Puedes deslizar para ver toda la imagen</span>
              </div>
            </div>
          )}
        </IonContent>

        <IonFooter className="ion-no-border detail-footer">
          <div className="action-pill-container">
            <div className="action-row">
              <IonButton fill="outline" className="pro-action-btn" onClick={() => selectAndApply('banner')}>
                <IonIcon icon={colorPaletteOutline} slot="start" />
                BANNER
              </IonButton>
              <IonButton fill="outline" className="pro-action-btn" onClick={() => selectAndApply('avatar')}>
                <IonIcon icon={personCircleOutline} slot="start" />
                AVATAR
              </IonButton>
            </div>
            <IonButton expand="block" fill="solid" color="primary" className="pro-master-btn" onClick={() => selectAndApply('both')}>
              <IonIcon icon={diamondOutline} slot="start" />
              APLICAR EN PERFIL COMPLETO
            </IonButton>
          </div>
        </IonFooter>
      </IonModal>
    </>
  );
};

export default ArtPickerModal;
