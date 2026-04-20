/**
 * DropRiskBanner - Shows warning for series at risk of abandonment
 */

import React from 'react';
import { IonCard, IonCardContent, IonIcon, IonChip } from '@ionic/react';
import { warningOutline, arrowForwardOutline, heartOutline } from 'ionicons/icons';
import { DropPrediction } from '../../../services/dropPredictorEngine';
import './drop-risk-banner.css';

export interface DropRiskBannerProps {
  prediction: DropPrediction;
  onAction?: (mangaId: string, action: string) => void;
  compact?: boolean;
}

export const DropRiskBanner: React.FC<DropRiskBannerProps> = ({
  prediction,
  onAction,
  compact = false
}) => {
  const riskColorMap = {
    low: '#4CAF50',
    medium: '#FF9800',
    high: '#FF5722',
    critical: '#F44336'
  };

  const riskLabelMap = {
    low: 'Bajo Riesgo',
    medium: 'Riesgo Moderado',
    high: 'Alto Riesgo',
    critical: '⚠️ Riesgo Crítico'
  };

  const handleAction = (action: string) => {
    if (onAction) {
      onAction(prediction.mangaId, action);
    }
  };

  if (compact) {
    return (
      <div className="drop-risk-banner-compact" style={{ borderLeftColor: riskColorMap[prediction.riskLevel] }}>
        <div className="drop-risk-compact-header">
          <IonIcon icon={warningOutline} className="drop-risk-icon" />
          <span className="drop-risk-compact-title">{prediction.title}</span>
          <IonChip
            className="drop-risk-chip"
            style={{
              '--background': riskColorMap[prediction.riskLevel],
              '--color': 'white'
            } as any}
          >
            {riskLabelMap[prediction.riskLevel]}
          </IonChip>
        </div>
      </div>
    );
  }

  return (
    <IonCard className="drop-risk-banner" style={{ borderTop: `4px solid ${riskColorMap[prediction.riskLevel]}` }}>
      <IonCardContent className="drop-risk-content">
        <div className="drop-risk-header">
          <div className="drop-risk-title-section">
            <IonIcon
              icon={warningOutline}
              className="drop-risk-icon-large"
              style={{ color: riskColorMap[prediction.riskLevel] }}
            />
            <div>
              <h3 className="drop-risk-title">{prediction.title}</h3>
              <p className="drop-risk-subtitle">{riskLabelMap[prediction.riskLevel]}</p>
            </div>
          </div>
          <div className="drop-risk-score">
            <span className="drop-risk-percentage" style={{ color: riskColorMap[prediction.riskLevel] }}>
              {prediction.riskScore}%
            </span>
            <span className="drop-risk-label">Riesgo</span>
          </div>
        </div>

        {prediction.predictedDaysUntilAbandonment > 0 && (
          <div className="drop-risk-timeline">
            <span className="drop-risk-timeline-text">
              Predicción: Abandono en ~{prediction.predictedDaysUntilAbandonment} días
            </span>
          </div>
        )}

        {prediction.keyIndicators.length > 0 && (
          <div className="drop-risk-indicators">
            <h4 className="drop-risk-indicators-title">Indicadores:</h4>
            <ul className="drop-risk-indicators-list">
              {prediction.keyIndicators.slice(0, 3).map((indicator, idx) => (
                <li key={idx} className="drop-risk-indicator-item">
                  {indicator}
                </li>
              ))}
            </ul>
          </div>
        )}

        {prediction.recommendations.length > 0 && (
          <div className="drop-risk-recommendations">
            <h4 className="drop-risk-recommendations-title">Recomendaciones:</h4>
            <ul className="drop-risk-recommendations-list">
              {prediction.recommendations.slice(0, 2).map((rec, idx) => (
                <li key={idx} className="drop-risk-recommendation-item">
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="drop-risk-actions">
          <button
            className="drop-risk-action-btn continue-btn"
            onClick={() => handleAction('continue')}
          >
            <IonIcon icon={arrowForwardOutline} />
            Continuar Lectura
          </button>
          <button
            className="drop-risk-action-btn remind-btn"
            onClick={() => handleAction('remind')}
          >
            <IonIcon icon={heartOutline} />
            Recordarme Después
          </button>
        </div>
      </IonCardContent>
    </IonCard>
  );
};

/**
 * DropRiskAlert - Floating alert for critical risk
 */
export const DropRiskAlert: React.FC<{
  prediction: DropPrediction;
  onDismiss: () => void;
  onAction: (action: string) => void;
}> = ({ prediction, onDismiss, onAction }) => {
  return (
    <div className="drop-risk-alert-overlay">
      <div className="drop-risk-alert-container">
        <button className="drop-risk-alert-close" onClick={onDismiss}>✕</button>
        
        <div className="drop-risk-alert-icon">
          <IonIcon icon={warningOutline} className="drop-risk-alert-icon-large" />
        </div>

        <h2 className="drop-risk-alert-title">Estamos de menos a <strong>{prediction.title}</strong></h2>
        <p className="drop-risk-alert-message">
          Hemos notado que no has leído esto hace un tiempo. ¡Creemos que te lo estabas disfrutando!
        </p>

        <div className="drop-risk-alert-buttons">
          <button
            className="drop-risk-alert-primary"
            onClick={() => onAction('continue')}
          >
            Continuar Leyendo
          </button>
          <button
            className="drop-risk-alert-secondary"
            onClick={onDismiss}
          >
            Ahora no
          </button>
        </div>
      </div>
    </div>
  );
};
