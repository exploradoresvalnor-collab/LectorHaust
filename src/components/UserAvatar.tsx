import React, { useEffect, useState } from 'react';
import { IonIcon } from '@ionic/react';
import { personCircleOutline } from 'ionicons/icons';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';
import { User } from 'firebase/auth';

interface UserAvatarProps {
  user?: User | null;
  uid?: string;
  fallbackSrc?: string;
  size?: number;
  className?: string;
}

const UserAvatar: React.FC<UserAvatarProps> = ({ user, uid, fallbackSrc, size = 32, className = '' }) => {
  const [firestoreAvatar, setFirestoreAvatar] = useState<string | null>(null);
  const targetUid = user?.uid || uid;

  useEffect(() => {
    if (!targetUid) {
      setFirestoreAvatar(null);
      return;
    }

    // Escuchar cambios en Firestore para obtener el avatar más actualizado
    const userRef = doc(db, 'users', targetUid);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        // Intentar obtener de varios campos posibles para mayor compatibilidad
        setFirestoreAvatar(data.avatar || data.avatarUrl || data.photoURL || null);
      }
    }, (err) => {
      // Silently fail for Firestore if not available
    });

    return () => unsubscribe();
  }, [targetUid]);

  // Prioridad: Firestore > Prop Fallback > Auth > Dicebear Fallback
  const resolvedSrc = firestoreAvatar || fallbackSrc || user?.photoURL || (targetUid ? `https://api.dicebear.com/7.x/identicon/svg?seed=${targetUid}` : null);

  if (!targetUid && !resolvedSrc) {
    return (
      <div className={`user-avatar-placeholder ${className}`} style={{ width: size, height: size, borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <IonIcon icon={personCircleOutline} style={{ fontSize: size * 0.7, color: 'rgba(255,255,255,0.4)' }} />
      </div>
    );
  }

  return (
    <div className={`user-avatar-wrapper ${className}`} style={{ width: size, height: size, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, position: 'relative', border: '1px solid rgba(255,255,255,0.1)' }}>
      {resolvedSrc ? (
        <img 
          src={resolvedSrc} 
          alt="User Avatar" 
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={(e) => {
            // Fallback inmediato si la URL principal falla
            if (targetUid) {
              e.currentTarget.src = `https://api.dicebear.com/7.x/identicon/svg?seed=${targetUid}`;
            }
          }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
           <IonIcon icon={personCircleOutline} style={{ fontSize: size * 0.7, color: 'rgba(255,255,255,0.4)' }} />
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
