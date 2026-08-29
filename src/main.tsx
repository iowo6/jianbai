import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles/global.css'
import './templates/templates.css'

// 渲染前应用主题偏好，避免闪烁
const savedTheme = localStorage.getItem('ui-theme')
if (savedTheme === 'dark') {
  document.documentElement.dataset.theme = 'dark'
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
