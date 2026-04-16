import React from 'react';
import { IonIcon, IonChip, IonLabel } from '@ionic/react';
import { gridOutline } from 'ionicons/icons';

interface TrendingGenresProps {
  genres: string[];
  onGenreClick: (genre: string) => void;
}

const TrendingGenres: React.FC<TrendingGenresProps> = ({ genres, onGenreClick }) => {
  return (
    <div className="sidebar-section genres-section">
      <div className="sidebar-section-header">
        <IonIcon icon={gridOutline} className="sidebar-header-icon" />
        <h3>Trending Genres</h3>
      </div>
      
      <div className="genres-grid">
        {genres.map((genre) => (
          <IonChip 
            key={genre} 
            className="genre-sidebar-chip"
            onClick={() => onGenreClick(genre)}
          >
            <IonLabel>{genre}</IonLabel>
          </IonChip>
        ))}
      </div>
    </div>
  );
};

export default TrendingGenres;
