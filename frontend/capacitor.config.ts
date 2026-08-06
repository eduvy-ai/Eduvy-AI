import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pradip.eai',
  appName: 'eduvy-ai',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: ['eduvyai-api.onrender.com'],
  },
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
    StatusBar: {
      backgroundColor: '#0D0D1F',
      style: 'DARK',
      overlaysWebView: false,
    },
    SplashScreen: {
      launchAutoHide: true,
      androidScaleType: 'CENTER_CROP',
    },
  },
};

export default config;
