import React from 'react';
import { IonButton, IonIcon } from '@ionic/react';
import './EmptyState.css';

interface EmptyStateProps {
  icon?: string;
  emoji?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, emoji, title, subtitle, actionLabel, onAction }) => {
  return (
    <div className="empty-state-container animate-fade-in">
      <div className="empty-state-visual">
        {emoji ? (
          <span className="empty-state-emoji">{emoji}</span>
        ) : icon ? (
          <IonIcon icon={icon} className="empty-state-icon" />
        ) : null}
      </div>
      <h3 className="empty-state-title">{title}</h3>
      {subtitle && <p className="empty-state-subtitle">{subtitle}</p>}
      {actionLabel && onAction && (
        <IonButton fill="outline" className="empty-state-btn" onClick={onAction}>
          {actionLabel}
        </IonButton>
      )}
    </div>
  );
};

export default EmptyState;
