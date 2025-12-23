import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// import App from './App'
import LauncherPage from './app/page'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* <App /> */}
    <LauncherPage />
  </StrictMode>
)
