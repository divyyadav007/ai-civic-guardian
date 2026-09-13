import { Platform } from 'react-native';

export interface ServerPreset {
  id: string;
  label: string;
  url: string;
  description: string;
}

export const SERVER_PRESETS: ServerPreset[] = [
  {
    id: 'cloud',
    label: '☁️ Live Cloud (Render)',
    url: 'https://ai-civic-guardian.onrender.com/api/v1',
    description: '24/7 public production backend on Render',
  },
  {
    id: 'localhost',
    label: 'Web & Localhost',
    url: 'http://localhost:8000/api/v1',
    description: 'Direct loopback connection for local dev',
  },
  {
    id: 'emulator',
    label: 'Android Emulator',
    url: 'http://10.0.2.2:8000/api/v1',
    description: 'Android emulator special alias to host loopback interface',
  },
  {
    id: 'lan',
    label: 'Physical Phone (Wi-Fi)',
    url: 'http://172.25.68.226:8000/api/v1',
    description: 'Connect via local Wi-Fi LAN IP from Expo Go on your phone',
  },
];

// Default to live cloud backend so phone/web works anywhere
function getDefaultBaseUrl(): string {
  return 'https://ai-civic-guardian.onrender.com/api/v1';
}

let activeBaseUrl = getDefaultBaseUrl();
const listeners: Array<(url: string) => void> = [];

export const config = {
  getBaseUrl(): string {
    return activeBaseUrl;
  },
  setBaseUrl(url: string) {
    activeBaseUrl = url.trim().replace(/\/+$/, '');
    listeners.forEach((cb) => cb(activeBaseUrl));
  },
  onUrlChange(listener: (url: string) => void): () => void {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  },
};
