import React from 'react';
import { IonSkeletonText, IonGrid, IonRow, IonCol } from '@ionic/react';
import './HausSkeleton.css';

interface HausSkeletonProps {
  type: 'hero' | 'card' | 'list-item' | 'grid';
  count?: number;
}

const HausSkeleton: React.FC<HausSkeletonProps> = ({ type, count = 1 }) => {
  if (type === 'hero') {
    return (
      <div className="hero-skeleton-wrapper animate-pulse">
        <div className="hero-skeleton-content">
          <div className="hero-skeleton-info">
             <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
                <IonSkeletonText animated className="skeleton-badge" />
                <IonSkeletonText animated className="skeleton-badge" />
             </div>
             <IonSkeletonText animated className="skeleton-title" />
             <IonSkeletonText animated className="skeleton-desc" />
             <div style={{ display: 'flex', gap: '15px' }}>
                <IonSkeletonText animated className="skeleton-btn" />
                <IonSkeletonText animated className="skeleton-btn" />
             </div>
          </div>
          <div className="hero-skeleton-poster">
             <IonSkeletonText animated className="skeleton-poster-img" />
          </div>
        </div>
      </div>
    );
  }

  if (type === 'card') {
    return (
      <div className="card-skeleton">
        <div className="card-skeleton-img">
          <IonSkeletonText animated style={{ height: '100%', margin: 0 }} />
        </div>
        <div className="card-skeleton-meta">
          <IonSkeletonText animated style={{ width: '80%', height: '14px', borderRadius: '4px' }} />
          <IonSkeletonText animated style={{ width: '40%', height: '12px', borderRadius: '3px' }} />
        </div>
      </div>
    );
  }

  if (type === 'list-item') {
    return (
      <div className="list-item-skeleton">
        <div className="list-item-skeleton-thumb">
          <IonSkeletonText animated style={{ height: '100%', margin: 0 }} />
        </div>
        <div className="list-item-skeleton-info">
          <IonSkeletonText animated style={{ width: '30%', height: '10px', marginBottom: '8px' }} />
          <IonSkeletonText animated style={{ width: '90%', height: '16px', marginBottom: '10px' }} />
          <IonSkeletonText animated style={{ width: '50%', height: '12px' }} />
        </div>
        <div className="list-item-skeleton-action">
          <IonSkeletonText animated style={{ width: '40px', height: '20px', borderRadius: '4px' }} />
        </div>
      </div>
    );
  }

  if (type === 'grid') {
    return (
      <IonGrid style={{ padding: 0 }}>
        <IonRow>
          {Array.from({ length: count }).map((_, i) => (
            <IonCol size="6" sizeSm="4" sizeMd="3" sizeLg="2" key={i}>
              <HausSkeleton type="card" />
            </IonCol>
          ))}
        </IonRow>
      </IonGrid>
    );
  }

  return null;
};

export default HausSkeleton;
