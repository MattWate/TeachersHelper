import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.onboarding.jsx';
import './styles.css';

createRoot(document.querySelector('#root')).render(React.createElement(React.StrictMode, {}, React.createElement(App)));
