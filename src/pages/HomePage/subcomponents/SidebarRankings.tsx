import React from 'react';
import { IonIcon } from '@ionic/react';
import { trendingUpOutline, eyeOutline } from 'ionicons/icons';
import SmartImage from '../../../components/SmartImage';

interface RankingItem {
  id: string;
  title: string;
  cover: string;
  views?: string;
  score?: number;
}

interface SidebarRankingsProps {
  rankings: RankingItem[];
  onItemClick: (id: string) => void;
}

const SidebarRankings: React.FC<SidebarRankingsProps> = ({ rankings, onItemClick }) => {
  return (
    <div className="sidebar-section rankings-section">
      <div className="sidebar-section-header">
        <IonIcon icon={trendingUpOutline} className="sidebar-header-icon" />
        <h3>TOP RANKINGS</h3>
      </div>
      
      <div className="rankings-list">
        {rankings.map((item, index) => (
          <div 
            key={item.id} 
            className="ranking-item"
            onClick={() => onItemClick(item.id)}
          >
            <div className="ranking-number">
              {(index + 1).toString().padStart(2, '0')}
            </div>
            <div className="ranking-thumb">
              <SmartImage src={item.cover} alt={item.title} width={45} height={60} />
            </div>
            <div className="ranking-info">
              <h4 className="ranking-title">{item.title}</h4>
              <div className="ranking-meta">
                <span className="ranking-score">⭐ {item.score?.toFixed(1) || '8.5'}</span>
                {item.views && (
                  <span className="ranking-views">
                    <IonIcon icon={eyeOutline} /> {item.views}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SidebarRankings;
