import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
// Self-hosted Biblical-Hebrew webfont (covers niqqud + cantillation), so the
// app renders consistently offline without relying on the OS having a Hebrew
// font. Swap for Ezra SIL / SBL Hebrew by dropping a woff2 + @font-face.
import '@fontsource/noto-serif-hebrew/hebrew-400.css'
import '@fontsource/noto-serif-hebrew/hebrew-700.css'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
