import React from 'react';
import { IonIcon } from '@ionic/react';
import { checkmarkCircle, checkmarkCircleOutline, openOutline, cloudDownloadOutline, checkmarkDoneCircle } from 'ionicons/icons';
import './ChapterItem.css';

interface ChapterItemProps {
  number: string | number;
  title?: string;
  isRead?: boolean;
  isDownloaded?: boolean;
  downloadProgress?: number; // 0-100, undefined = not downloading
  publishedAt?: string;
  externalUrl?: string | null;
  scanlationGroup?: string;
  onClick: () => void;
  onToggleRead?: (e: React.MouseEvent) => void;
  onDownload?: (e: React.MouseEvent) => void;
}

const ChapterItem: React.FC<ChapterItemProps> = ({ number, title, isRead, isDownloaded, downloadProgress, publishedAt, externalUrl, scanlationGroup, onClick, onToggleRead, onDownload }) => {
  return (
    <div className={`chapter-item-container ${isRead ? 'read' : ''}`}>
      <div className="chapter-item-content" onClick={onClick}>
        <div className="chapter-item-info">
          <span className="chapter-item-number">
            {isDownloaded && <IonIcon icon={checkmarkDoneCircle} color="success" style={{ marginRight: '6px', fontSize: '0.9rem', verticalAlign: 'middle' }} />}
            Capítulo {number}
          </span>
          {title && <span className="chapter-item-title">{title}</span>}
        </div>
        
        <div className="chapter-item-meta">
          {publishedAt && <span>{new Date(publishedAt).toLocaleDateString()}</span>}
          {scanlationGroup && <span className="chapter-fansub-badge" style={{ marginLeft: '8px', fontSize: '0.75rem', padding: '2px 6px', background: 'var(--ion-color-medium)', color: '#fff', borderRadius: '4px', opacity: 0.9 }}>{scanlationGroup}</span>}
        </div>

        {/* Download progress bar */}
        {downloadProgress !== undefined && downloadProgress < 100 && (
          <div className="chapter-download-progress">
            <div className="chapter-download-bar" style={{ width: `${downloadProgress}%` }} />
          </div>
        )}
      </div>
      
      <div className="chapter-item-actions">
        {/* Download button */}
        {onDownload && !externalUrl && (
          <button 
            className={`chapter-toggle-btn ${isDownloaded ? 'downloaded' : ''}`}
            onClick={onDownload}
            title={isDownloaded ? 'Descargado' : 'Descargar para leer offline'}
          >
            <IonIcon icon={isDownloaded ? checkmarkDoneCircle : cloudDownloadOutline} color={isDownloaded ? 'success' : 'primary'} />
          </button>
        )}

        {externalUrl && (
          <IonIcon icon={openOutline} color="medium" className="chapter-external-icon" onClick={onClick} />
        )}
        {onToggleRead && (
          <button 
            className={`chapter-toggle-btn ${isRead ? 'active' : ''}`} 
            onClick={onToggleRead}
            title={isRead ? 'Marcar como no leído' : 'Marcar como leído'}
          >
            <IonIcon icon={isRead ? checkmarkCircle : checkmarkCircleOutline} color={isRead ? 'success' : 'medium'} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ChapterItem;
