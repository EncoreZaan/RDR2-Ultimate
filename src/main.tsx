import '@fontsource/cinzel/latin-600.css';
import '@fontsource/cinzel/latin-700.css';
import './styles/fonts.css';
import './styles/app.css';
import { render } from 'preact';
import { App } from './app/App.tsx';

const root = document.getElementById('app');
if (root) render(<App />, root);
