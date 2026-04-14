import React from 'react';
import {
  IonModal,
  IonButton,
  IonIcon,
  IonCard,
  IonItem,
  IonLabel,
  IonBadge,
  IonRippleEffect,
  useIonToast
} from '@ionic/react';
import { diamondOutline, copyOutline } from 'ionicons/icons';

interface DonationsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DonationsModal: React.FC<DonationsModalProps> = ({ isOpen, onClose }) => {
  const [presentToast] = useIonToast();

  const copyWallet = (wallet: string, network: string) => {
    navigator.clipboard.writeText(wallet);
    presentToast({ message: `Dirección ${network} copiada 📋`, duration: 2000, color: 'success' });
  };

  return (
    <IonModal 
      isOpen={isOpen} 
      onDidDismiss={onClose}
      initialBreakpoint={0.7}
      breakpoints={[0, 0.7, 0.9]}
      className="login-bottom-sheet"
      handleBehavior="cycle"
    >
      <div className="glass-modal-content" style={{ padding: '25px 20px', display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ textAlign: 'center', marginBottom: '25px' }}>
          <div style={{ display: 'inline-block', position: 'relative' }}>
            <IonIcon icon={diamondOutline} style={{ fontSize: '4rem', color: '#FFD700', filter: 'drop-shadow(0 0 15px rgba(255,215,0,0.6))' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '100%', height: '100%', background: 'radial-gradient(circle, rgba(255,215,0,0.4) 0%, transparent 70%)', zIndex: -1, borderRadius: '50%' }}></div>
          </div>
          <h2 style={{ fontWeight: 900, fontSize: '1.5rem', margin: '15px 0 8px', color: '#fff', letterSpacing: '-0.5px' }}>Apoya a LectorHaus</h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem', margin: 0, lineHeight: '1.4' }}>
            ¡Gracias por mantener el servidor vivo! ☕<br/>Toca cualquier red para copiar la dirección.
          </p>
        </div>

        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, overflowY: 'auto', paddingBottom: '20px' }}>
          
          {/* BINANCE SMART CHAIN */}
          <IonCard className="glass-card ion-activatable ripple-parent" onClick={() => copyWallet('0x2740F48565b8371FDcbEB69c59ee6C184aE48467', 'Binance Smart Chain')} style={{ margin: 0, cursor: 'pointer', background: 'rgba(243, 186, 47, 0.08)', border: '1px solid rgba(243, 186, 47, 0.3)', position: 'relative', overflow: 'hidden' }}>
            <IonItem color="transparent" lines="none" style={{ '--padding-start': '15px', '--inner-padding-end': '15px', marginTop: '5px', marginBottom: '5px' }}>
              <div slot="start" style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(243, 186, 47, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#F3BA2F', fontWeight: 900, fontSize: '0.85rem', boxShadow: '0 4px 10px rgba(0,0,0,0.2)' }}>BNB</div>
              <IonLabel>
                <h3 style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem', letterSpacing: '-0.3px', display: 'flex', alignItems: 'center', gap: '6px' }}>Red Binance <IonBadge color="warning" style={{ fontSize: '0.6rem', padding: '3px 6px' }}>RECOMENDADA</IonBadge></h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Comisiones casi nulas (USDT/BNB)</p>
                <p style={{ fontSize: '0.7rem', color: '#F3BA2F', marginTop: '6px', fontFamily: 'monospace', letterSpacing: '0.5px', opacity: 0.9 }}>0x2740...48467</p>
              </IonLabel>
              <IonIcon icon={copyOutline} slot="end" style={{ color: '#F3BA2F', fontSize: '1.2rem' }} />
            </IonItem>
            <IonRippleEffect></IonRippleEffect>
          </IonCard>

          {/* SOLANA */}
          <IonCard className="glass-card ion-activatable ripple-parent" onClick={() => copyWallet('62NNwaoXdKhAn2wJwJn8iD7s4HX5tFmHTYLavUZUEBHR', 'Solana')} style={{ margin: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
            <IonItem color="transparent" lines="none" style={{ '--padding-start': '15px', '--inner-padding-end': '15px', marginTop: '5px', marginBottom: '5px' }}>
              <div slot="start" style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(20, 241, 149, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#14F195', fontWeight: 900, fontSize: '0.85rem' }}>SOL</div>
              <IonLabel>
                <h3 style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem', letterSpacing: '-0.3px' }}>Red Solana</h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>Rápida para USDT, USDC o SOL</p>
                <p style={{ fontSize: '0.7rem', color: '#14F195', marginTop: '6px', fontFamily: 'monospace', letterSpacing: '0.5px', opacity: 0.8 }}>62NN...ZUEBHR</p>
              </IonLabel>
              <IonIcon icon={copyOutline} slot="end" style={{ color: 'var(--ion-color-medium)' }} />
            </IonItem>
            <IonRippleEffect></IonRippleEffect>
          </IonCard>

          {/* TRON */}
          <IonCard className="glass-card ion-activatable ripple-parent" onClick={() => copyWallet('TTwFVRAEBA4V77BjbHnxgFT9YLS6jis6AU', 'Tron TRC20')} style={{ margin: 0, cursor: 'pointer', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', position: 'relative', overflow: 'hidden' }}>
            <IonItem color="transparent" lines="none" style={{ '--padding-start': '15px', '--inner-padding-end': '15px', marginTop: '5px', marginBottom: '5px' }}>
              <div slot="start" style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(255, 0, 19, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FF0013', fontWeight: 900, fontSize: '0.85rem' }}>TRX</div>
              <IonLabel>
                <h3 style={{ fontWeight: 800, color: '#fff', fontSize: '1.05rem', letterSpacing: '-0.3px' }}>Red Tron (TRC20)</h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>La más usada para USDT</p>
                <p style={{ fontSize: '0.7rem', color: '#FF0013', marginTop: '6px', fontFamily: 'monospace', letterSpacing: '0.5px', opacity: 0.8 }}>TTwF...is6AU</p>
              </IonLabel>
              <IonIcon icon={copyOutline} slot="end" style={{ color: 'var(--ion-color-medium)' }} />
            </IonItem>
            <IonRippleEffect></IonRippleEffect>
          </IonCard>

        </div>
        
        <IonButton expand="block" shape="round" className="glass-btn-outline" onClick={onClose} style={{ marginTop: 'auto', '--color': '#fff', '--background': 'rgba(255,255,255,0.1)', height: '50px', fontWeight: 800 }}>
          Cerrar
        </IonButton>
      </div>
    </IonModal>
  );
};

export default DonationsModal;
