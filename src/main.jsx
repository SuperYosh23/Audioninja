import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { PlayerProvider } from './context/PlayerContext'
import { NavigationProvider } from './context/NavigationContext'
import { loadTheme, applyCurrentTheme } from './utils/colorScheme'

// Initialize theme from saved preferences
try {
  const prefs = JSON.parse(localStorage.getItem('ym_preferences') || '{}');
  document.documentElement.dataset.theme = prefs.theme || 'dark';
} catch {
  document.documentElement.dataset.theme = 'dark';
}

// Apply custom theme if saved
const savedTheme = loadTheme();
if (savedTheme) {
  applyCurrentTheme(savedTheme);
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <NavigationProvider>
      <PlayerProvider>
        <App />
      </PlayerProvider>
    </NavigationProvider>
  </StrictMode>,
)
