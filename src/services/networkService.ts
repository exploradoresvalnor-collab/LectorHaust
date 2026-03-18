import { Network, ConnectionStatus } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';

export type NetworkStatusCallback = (status: ConnectionStatus) => void;

class NetworkService {
  private listeners: NetworkStatusCallback[] = [];

  constructor() {
    this.init();
  }

  private async init() {
    // Only add listeners once per app lifecycle
    Network.addListener('networkStatusChange', status => {
      console.log('Network status changed:', status);
      this.notifyListeners(status);
    });
  }

  public async getStatus(): Promise<ConnectionStatus> {
    try {
      return await Network.getStatus();
    } catch (e) {
      // Fallback for some web environments if needed
      return {
        connected: navigator.onLine,
        connectionType: 'unknown'
      };
    }
  }

  public subscribe(callback: NetworkStatusCallback): () => void {
    this.listeners.push(callback);
    
    // Immediately return current status to the subscriber
    this.getStatus().then(callback);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private notifyListeners(status: ConnectionStatus) {
    this.listeners.forEach(callback => callback(status));
  }
}

export const networkService = new NetworkService();
