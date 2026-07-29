import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pradip.eai',
  appName: 'eduvy-ai',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    allowNavigation: ['eduvyai-api.onrender.com'],
  },
};

export default config;
