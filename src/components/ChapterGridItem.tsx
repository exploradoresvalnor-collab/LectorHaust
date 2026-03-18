import React from 'react';
import { IonIcon } from '@ionic/react';
import { checkmarkCircle, checkmarkCircleOutline } from 'ionicons/icons';
import './ChapterItem.css';

interface ChapterGridItemProps {
  number: string | number;
  isRead?: boolean;
  onClick: () => void;
  onToggleRead?: (e: React.MouseEvent) => void;
}

const ChapterGridItem: React.FC<ChapterGridItemProps> = ({ number, isRead, onClick, onToggleRead }) => {
  return (
    <div className={`chapter-grid-item ${isRead ? 'read' : ''}`} onClick={onClick}>
      <span className="grid-item-number">{number}</span>
      <div className="grid-item-check" onClick={(e) => {
        e.stopPropagation();
        onToggleRead && onToggleRead(e);
      }}>
        <IonIcon icon={isRead ? checkmarkCircle : checkmarkCircleOutline} color={isRead ? 'success' : 'medium'} />
      </div>
    </div>
  );
};

export default ChapterGridItem;
