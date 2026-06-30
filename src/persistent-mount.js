import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.persistent.jsx';
import './styles.css';

const rootElement = document.querySelector('#root');
createRoot(rootElement).render(React.createElement(React.StrictMode, {}, React.createElement(App)));
