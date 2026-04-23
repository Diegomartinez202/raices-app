import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'co.edu.unad.raices',
  appName: 'RAÍCES',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  android: {
    allowMixedContent: false, // Seguridad: no permitir HTTP
    captureInput: true,
    webContentsDebuggingEnabled: false, // Desactivar en release para seguridad
  },
  ios: {
    contentInset: 'automatic',
    scrollEnabled: true,
  },
  plugins: {
    CapacitorHttp: {
      enabled: false, // RAÍCES no usa red. Bloqueamos HTTP por defecto.
    },
    Filesystem: {
      androidRequestLegacyExternalStorage: false,
    },
    SecureStorage: {
      // Keychain/Keystore se usa para la clave de SQLCipher
    }
  },
};

export default config;