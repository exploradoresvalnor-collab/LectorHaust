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
  const normalizedTitle = title?.toLowerCase().trim() || '';
  const normalizedNumber = String(number).toLowerCase().trim();
  const isRedundant = normalizedTitle === `capitulo ${normalizedNumber}` || normalizedTitle === `capítulo ${normalizedNumber}`;

  return (
    <div className={`chapter-item-container ${isRead ? 'read' : ''}`}>
      <div className="chapter-item-content" onClick={onClick}>
        <div className="chapter-item-info">
          <span className="chapter-item-number">
            {isDownloaded && <IonIcon icon={checkmarkDoneCircle} color="success" style={{ marginRight: '6px', fontSize: '0.85rem', verticalAlign: 'middle' }} />}
            {(!number || number === 'null') ? 'Especial' : (typeof number === 'string' && number.toLowerCase().includes('cap')) ? number : `Capítulo ${number}`}
          </span>
          {title && !isRedundant && (
            <span className="chapter-item-title">{title}</span>
          )}
          {externalUrl && (
            <span className="chapter-external-badge">Enlace Oficial ↗</span>
          )}
        </div>
        
        <div className="chapter-item-meta">
          {publishedAt && <span className="chapter-date">{new Date(publishedAt).toLocaleDateString()}</span>}
          {scanlationGroup && <span className="chapter-fansub-badge">{scanlationGroup}</span>}
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
