import React, { useState, useEffect } from 'react';
import { IonIcon, IonButton, useIonToast } from '@ionic/react';
import { star, starOutline, shareSocialOutline } from 'ionicons/icons';
import { doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../services/firebase';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { hapticsService } from '../services/hapticsService';
import './UniversalEngagementBar.css';

interface Props {
  contentId: string;
  title: string;
  coverUrl?: string;
  type: 'manga' | 'anime' | 'chapter' | 'episode';
}

const UniversalEngagementBar: React.FC<Props> = ({ contentId, title, coverUrl, type }) => {
  const [rating, setRating] = useState<number>(0);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [totalRatings, setTotalRatings] = useState<number>(0);
  const [presentToast] = useIonToast();

  useEffect(() => {
    // Load avg rating and user's rating
    const loadRatings = async () => {
      const q = query(collection(db, 'content_ratings'), where('contentId', '==', contentId));
      const snaps = await getDocs(q);
      
      let total = 0;
      let count = 0;
      const user = firebaseAuthService.getCurrentUser();
      
      snaps.forEach(docSnap => {
        const data = docSnap.data();
        total += data.rating;
        count++;
        if (user && docSnap.id === `${contentId}_${user.uid}`) {
           setRating(data.rating);
        }
      });
      
      if (count > 0) {
        setAvgRating(total / count);
        setTotalRatings(count);
      }
    };
    loadRatings();
  }, [contentId]);

  const handleRate = async (stars: number) => {
    const user = firebaseAuthService.getCurrentUser();
    if (!user || user.isAnonymous) {
      presentToast({ message: 'Inicia sesión para calificar', duration: 2000, color: 'warning' });
      return;
    }

    hapticsService.lightImpact();
    setRating(stars);
    
    // Optimistic update
    const newCount = rating === 0 ? totalRatings + 1 : totalRatings;
    const currentTotal = avgRating * totalRatings;
    const newTotal = currentTotal - rating + stars;
    setAvgRating(newTotal / newCount);
    setTotalRatings(newCount);

    try {
      await setDoc(doc(db, 'content_ratings', `${contentId}_${user.uid}`), {
        contentId,
        contentType: type,
        userId: user.uid,
        rating: stars,
        timestamp: new Date()
      });
      presentToast({ message: '¡Gracias por calificar!', duration: 1500, color: 'success' });
    } catch (e) {
      console.error('Save rating failed', e);
    }
  };

  const handleShare = async () => {
    hapticsService.mediumImpact();
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: `¡Tienes que ver esto en Lector Haus! ${title}`,
          url: window.location.href,
        });
      } catch (err) {}
    } else {
      navigator.clipboard.writeText(window.location.href);
      presentToast({ message: 'Enlace copiado al portapapeles', duration: 2000, color: 'primary' });
    }
  };

  return (
    <div className="universal-engagement-bar">
      <div className="ueb-rating-section">
        <div className="ueb-stars">
          {[1, 2, 3, 4, 5].map((starIdx) => (
             <IonIcon 
               key={starIdx}
               icon={starIdx <= (rating || Math.round(avgRating)) ? star : starOutline}
               className={starIdx <= rating ? 'star-active focus-bounce' : 'star-inactive'}
               onClick={() => handleRate(starIdx)}
             />
          ))}
        </div>
        <span className="ueb-score">
          {avgRating > 0 ? `${avgRating.toFixed(1)} (${totalRatings})` : 'Sin calificar'}
        </span>
      </div>

      <div className="ueb-actions">
        <IonButton fill="clear" className="ueb-action-btn" onClick={handleShare}>
           <IonIcon slot="start" icon={shareSocialOutline} />
           Compartir
        </IonButton>
      </div>
    </div>
  );
};
export default UniversalEngagementBar;
