import React from 'react';
import { IonGrid, IonRow, IonCol, IonButton, IonIcon } from '@ionic/react';
import { chevronForwardOutline, bookOutline } from 'ionicons/icons';
import MangaCard from '../../../components/MangaCard';

interface HomeSectionGridProps {
  title: string;
  icon: string;
  items: any[];
  onMangaClick: (manga: any) => void;
  onViewAll?: () => void;
  mangaProvider: any;
}

const HomeSectionGrid: React.FC<HomeSectionGridProps> = ({ 
  title, 
  icon, 
  items, 
  onMangaClick, 
  onViewAll,
  mangaProvider 
}) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="home-section-container animate-fade-in">
      <div className="section-header-row">
        <div className="section-title-wrapper">
          <IonIcon icon={icon} className="section-title-icon" />
          <h2 className="section-title-text">{title}</h2>
        </div>
        <IonButton fill="clear" className="view-all-btn" onClick={onViewAll}>
          Ver todos <IonIcon icon={chevronForwardOutline} slot="end" />
        </IonButton>
      </div>

      <IonGrid className="home-manga-grid">
        <IonRow>
          {items.map((manga) => (
            <IonCol size="12" sizeSm="6" sizeMd="6" sizeLg="4" sizeXl="4" key={manga.id}>
              <MangaCard 
                title={mangaProvider.getLocalizedTitle(manga)}
                coverUrl={mangaProvider.getCoverUrl(manga)}
                rating={manga.attributes?.averageRating || manga.attributes?.rating}
                status={manga.attributes?.status === 'completed' ? 'Finalizado' : 'En emisión'}
                chapters={manga.attributes?.lastChapter || manga.attributes?.latestChapterNumber}
                tags={manga.attributes?.tags
                  ?.filter((t: any) => t.attributes?.group === 'genre')
                  .slice(0, 3)
                  .map((t: any) => t.attributes?.name?.en || t.attributes?.name?.es)}
                onClick={() => onMangaClick(manga)}
              />
            </IonCol>
          ))}
        </IonRow>
      </IonGrid>
    </div>
  );
};

export default HomeSectionGrid;
