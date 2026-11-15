import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './app/App';
import { loadApi } from './services/api';
import './styles/global.css';

const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error('The application root element was not found.');
}

const root = createRoot(rootElement);

loadApi()
  .then((api) => {
    root.render(
      <StrictMode>
        <App api={api} />
      </StrictMode>,
    );
  })
  .catch(() => {
    rootElement.textContent = 'WhatsUp could not start. Please reload the page.';
  });
