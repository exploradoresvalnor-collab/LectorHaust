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
  IonImg,
  IonFooter,
  IonBadge,
  IonSkeletonText,
  IonList,
  IonItem,
  IonLabel,
  IonRippleEffect,
  isPlatform
} from '@ionic/react';
import { 
  closeOutline, 
  personCircleOutline, 
  colorPaletteOutline, 
  searchOutline, 
  sparklesOutline,
  diamondOutline,
  flashOutline,
  arrowBackOutline,
  expandOutline,
  refreshOutline
} from 'ionicons/icons';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import { artService, SafebooruPost } from '../services/artService';
import './ArtPickerModal.css';

interface ArtPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (url: string, type: 'banner' | 'avatar' | 'both') => void;
}

const ArtPickerModal: React.FC<ArtPickerModalProps> = ({ isOpen, onClose, onSelect }) => {
  const [searchText, setSearchText] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [arts, setArts] = useState<SafebooruPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedArt, setSelectedArt] = useState<SafebooruPost | null>(null);
  
  const isDesktop = isPlatform('desktop') || isPlatform('tablet');

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
      <IonCol size="6" sizeMd="4" sizeLg="3" key={`skel-${i}`} className="art-col">
        <div className="art-item-skeleton">
          <IonSkeletonText animated style={{ width: '100%', height: '100%' }} />
        </div>
      </IonCol>
    ));
  };

  return (
    <>
      {/* 1. Main Gallery Modal - Still a Sheet on Mobile, centered on PC */}
      <IonModal 
        isOpen={isOpen} 
        onDidDismiss={onClose} 
        className={`art-picker-modal elite-adaptive ${isDesktop ? 'desktop-view' : 'mobile-view'}`}
        breakpoints={isDesktop ? undefined : [0, 0.4, 0.7, 0.95]}
        initialBreakpoint={isDesktop ? undefined : 0.7}
        handle={!isDesktop}
      >
        <IonHeader className="ion-no-border">
          <IonToolbar className="art-picker-toolbar">
            <IonButtons slot="start">
              <IonButton onClick={onClose} className="close-btn-round">
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
            <IonTitle>Haus Elite • Galería</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => fetchArt()} disabled={loading} className="sparkle-btn">
                <IonIcon icon={sparklesOutline} color="secondary" />
              </IonButton>
            </IonButtons>
          </IonToolbar>
          
          <div className="search-container-premium">
            <IonSearchbar 
              value={searchText} 
              onIonInput={handleSearchInput}
              onKeyPress={(e) => e.key === 'Enter' && fetchArt(searchText)}
              placeholder="Explorar arte (ej. 'cyberpunk', 'naruto')..."
              className="ultra-searchbar"
              debounce={0}
              animated={true}
            />
            
            {showSuggestions && (
              <div className="suggestions-dropdown animate-fade-in">
                <IonList className="suggestions-list">
                  {suggestions.map((tag) => (
                    <IonItem button key={tag} onClick={() => handleSelectSuggestion(tag)} className="suggestion-item">
                      <IonIcon icon={flashOutline} slot="start" color="secondary" />
                      <IonLabel>{tag.replace(/_/g, ' ')}</IonLabel>
                    </IonItem>
                  ))}
                </IonList>
              </div>
            )}
          </div>

          <div className="quick-filters-scroll premium-curation">
            <div className="quick-filters">
              <button className={`filter-chip ${searchText === '' ? 'active' : ''}`} onClick={() => { setSearchText(''); fetchArt(); }}>🚀 Destacados</button>
              <button className="filter-chip" onClick={() => { setSearchText('oficial'); fetchArt('official_art highres'); }}>🏆 Oficial</button>
              <button className="filter-chip" onClick={() => { setSearchText('sky'); fetchArt('sky scenery highres'); }}>☁️ Cielos</button>
              <button className="filter-chip" onClick={() => { setSearchText('city'); fetchArt('cityscape night_sky highres'); }}>🏙️ Ciudad</button>
              <button className="filter-chip" onClick={() => { setSearchText('art'); fetchArt('traditional_media watercolor aesthetic'); }}>🎨 Arte</button>
            </div>
          </div>
        </IonHeader>

        <IonContent className="art-picker-content glass-content" forceOverscroll={true}>
          <div className="gallery-wrapper">
            {loading ? (
              <IonGrid className="art-grid">
                <IonRow>{renderSkeletons()}</IonRow>
              </IonGrid>
            ) : (
              <IonGrid className="art-grid">
                <IonRow>
                  {arts.map((art) => (
                    <IonCol size="6" sizeMd="4" sizeLg="3" key={art.id} className="art-col">
                      <div className={`art-item-card ultra-card ${selectedArt?.id === art.id ? 'selected' : ''}`} onClick={() => setSelectedArt(art)}>
                        <IonImg src={art.preview_url} className="art-thumb" />
                        <div className="res-overlay"><span className="res-tag">{art.width}x{art.height}</span></div>
                        <IonRippleEffect />
                      </div>
                    </IonCol>
                  ))}
                </IonRow>
              </IonGrid>
            )}
            {!loading && arts.length === 0 && (
              <div className="art-empty-state">
                <IonIcon icon={searchOutline} className="empty-icon" />
                <h3>Sin Resonancia</h3>
                <p>Prueba con otras etiquetas mágicas.</p>
              </div>
            )}
          </div>
        </IonContent>
      </IonModal>

      {/* 2. Pro Adaptive Detail Modal - No Sheet here to fix scroll wheel/touch */}
      <IonModal 
        isOpen={!!selectedArt} 
        onDidDismiss={() => setSelectedArt(null)}
        className={`art-detail-modal-pro ${isDesktop ? 'desktop-card' : 'mobile-full'}`}
      >
        <IonHeader className="ion-no-border">
          <IonToolbar className="detail-header-toolbar">
            <IonButtons slot="start">
              <IonButton onClick={() => setSelectedArt(null)} className="back-btn-elite">
                <IonIcon icon={isDesktop ? closeOutline : arrowBackOutline} />
                {!isDesktop && <span style={{ marginLeft: '5px' }}>Volver</span>}
              </IonButton>
            </IonButtons>
            <IonTitle>{isDesktop ? 'Inspección de Arte' : ''}</IonTitle>
            <IonButtons slot="end">
               {selectedArt && <IonBadge color="secondary" className="detail-res-badge">{selectedArt.width}x{selectedArt.height}</IonBadge>}
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent className="art-detail-content-pro" forceOverscroll={true}>
          {selectedArt && (
            <div className={`detail-adaptive-container ${isDesktop ? 'layout-row' : 'layout-col'}`}>
              <div className="preview-inspection-zone">
                <TransformWrapper initialScale={1} minScale={1} maxScale={4}>
                  <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }}>
                    <div className="zoom-image-wrapper">
                      <IonImg src={selectedArt.sample_url} className="ultra-pro-img" />
                    </div>
                  </TransformComponent>
                </TransformWrapper>
                <div className="zoom-hint">
                  <IonIcon icon={expandOutline} />
                  <span>{isDesktop ? 'Usa la rueda para zoom' : 'Pellizca para ampliar'}</span>
                </div>
              </div>

              <div className="art-meta-sidebar">
                <div className="meta-info-pro">
                  <h3>{selectedArt.tags.split(' ').slice(0, 5).join(', ').replace(/_/g, ' ')}</h3>
                  <div className="meta-pills">
                    <IonBadge color="light" fill="outline">Premium Content</IonBadge>
                    <IonBadge color="light" fill="outline">Safebooru Elite</IonBadge>
                  </div>
                </div>

                <div className="detail-actions-elite">
                  <IonButton expand="block" fill="outline" className="elite-action-btn" onClick={() => selectAndApply('banner')}>
                    <IonIcon icon={colorPaletteOutline} slot="start" />
                    APLICAR BANNER
                  </IonButton>
                  <IonButton expand="block" fill="outline" className="elite-action-btn" onClick={() => selectAndApply('avatar')}>
                    <IonIcon icon={personCircleOutline} slot="start" />
                    APLICAR AVATAR
                  </IonButton>
                  <IonButton expand="block" fill="solid" color="secondary" className="elite-master-btn" onClick={() => selectAndApply('both')}>
                    <IonIcon icon={diamondOutline} slot="start" />
                    PERFIL COMPLETO (MASTER)
                  </IonButton>
                </div>
              </div>
            </div>
          )}
        </IonContent>
      </IonModal>
    </>
  );
};

export default ArtPickerModal;
