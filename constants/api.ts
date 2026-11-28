import { Capacitor } from '@capacitor/core';

const envApiBaseUrl = (import.meta as any).env?.VITE_API_BASE_URL;
const isNativePlatform = typeof Capacitor?.isNativePlatform === 'function' && Capacitor.isNativePlatform();
const isLocalHost =
  !isNativePlatform &&
  typeof window !== 'undefined' &&
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const API_BASE_URL = envApiBaseUrl
  || (isLocalHost ? 'http://localhost:8081' : 'https://api.karunavillas.com');
export const DEFAULT_HOTEL_ID = 1;
