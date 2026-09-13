import { LocaleProvider } from './LocaleProvider';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { UserDataProvider } from './UserDataProvider';
import { UserDataStore } from './userDataStore';
import { browserLock, loadUserData } from './storage';
import { detectLocale } from './i18n';
import './styles.css';
import './theme.css';
import './locale.css';
import './home.css';

async function start() {
  const locale = detectLocale(navigator.languages);
  // Access through methods so browsers denying localStorage can still open.
  const storage = {
    getItem: (key: string) => localStorage.getItem(key),
    setItem: (key: string, value: string) => localStorage.setItem(key, value),
  };
  const loaded = await loadUserData(storage, locale);
  const store = new UserDataStore(storage, browserLock, locale, loaded);
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <UserDataProvider store={store}>
        <LocaleProvider>
          <App />
        </LocaleProvider>
      </UserDataProvider>
    </React.StrictMode>,
  );
}
void start();
