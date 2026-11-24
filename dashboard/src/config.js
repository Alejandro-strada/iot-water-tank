export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

export const paths = {
  level: import.meta.env.VITE_LEVEL_PATH || '',
  pumpState: import.meta.env.VITE_PUMP_STATE_PATH || '',
  pumpCommand: import.meta.env.VITE_PUMP_COMMAND_PATH || '',
  updatedAt: import.meta.env.VITE_UPDATED_AT_PATH || '',
  mode: import.meta.env.VITE_MODE_PATH || '',
  controlMin: import.meta.env.VITE_CONTROL_MIN_PATH || '',
  controlMax: import.meta.env.VITE_CONTROL_MAX_PATH || '',
  alertLow: import.meta.env.VITE_ALERT_LOW_PATH || '',
  alertHigh: import.meta.env.VITE_ALERT_HIGH_PATH || '',
  capacity: import.meta.env.VITE_CAPACITY_PATH || '',
  history: import.meta.env.VITE_HISTORY_PATH || '',
  events: import.meta.env.VITE_EVENTS_PATH || '',
};

export const firebaseReady = Object.values(firebaseConfig).every(Boolean) &&
  Boolean(paths.level);
