import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';

import './index.css';

import { runSystemAudit } from './debug/systemAudit';

// 🔍 Auditoria do sistema
runSystemAudit();

ReactDOM.createRoot(
  document.getElementById('root')!
).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);