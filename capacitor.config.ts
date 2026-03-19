import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.lectorhaus.app',
  appName: 'LectorHaus',
  webDir: 'dist',
  plugins: {
    Keyboard: {
      resize: 'ionic'
    }
  }
};

export default config;
