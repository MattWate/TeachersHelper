import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App.jsx';

const root = document.querySelector('#root');
createRoot(root).render(React.createElement(React.StrictMode, {}, React.createElement(App)));
