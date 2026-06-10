// jQuery doit être global AVANT bootstrap et admin-lte
import jQuery from 'jquery'
window.jQuery = jQuery
window.$ = jQuery

// CSS dans l'ordre obligatoire : Bootstrap → FontAwesome → AdminLTE → thème ACERFI
import 'bootstrap/dist/css/bootstrap.min.css'
import '@fortawesome/fontawesome-free/css/all.min.css'
import 'admin-lte/dist/css/adminlte.min.css'
import './index.css'
import './assets/acerfi-theme.css'

// Bootstrap 4 JS (bundle inclut Popper.js)
import 'bootstrap/dist/js/bootstrap.bundle.min.js'

import React from 'react'
import ReactDOM from 'react-dom/client'
import { ThemeProvider } from './context/ThemeContext'
import App from './App.jsx'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
)
