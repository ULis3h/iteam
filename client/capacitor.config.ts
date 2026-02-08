import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
    appId: 'com.iteam.manager',
    appName: 'iTeam Manager',
    webDir: 'dist',
    server: {
        // In development, point to the Vite dev server
        // Comment this out for production builds
        // url: 'http://YOUR_LOCAL_IP:5173',
        // cleartext: true,
        androidScheme: 'https',
    },
    ios: {
        contentInset: 'automatic',
        preferredContentMode: 'mobile',
        scheme: 'iTeam Manager',
    },
    plugins: {
        SplashScreen: {
            launchAutoHide: true,
            launchShowDuration: 1500,
            backgroundColor: '#0f0a1a',
            showSpinner: false,
        },
        StatusBar: {
            style: 'DARK',
            backgroundColor: '#0f0a1a',
        },
    },
};

export default config;
