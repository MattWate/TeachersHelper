import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.product.jsx';
import './styles.css';

const root = document.querySelector('#root');
createRoot(root).render(React.createElement(React.StrictMode, {}, React.createElement(App)));
