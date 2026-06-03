import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// In production, silence verbose console logging so runtime values — device
// IDs, user IDs, deep-link URLs — aren't printed to the JS console (readable via
// an attached Web Inspector). warn/error are kept for crash diagnostics.
if (import.meta.env.PROD) {
  const noop = () => {};
  console.log = noop;
  console.debug = noop;
  console.info = noop;
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
