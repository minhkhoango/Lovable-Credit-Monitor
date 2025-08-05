// src/main.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import Popup from './popup/Popup.tsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
)