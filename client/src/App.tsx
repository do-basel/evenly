import { useState } from 'react';
import AuthScreen from './screens/AuthScreen';
import MyTrips from './screens/MyTrips';
import CreateTrip from './screens/CreateTrip';
import ShareLink from './screens/ShareLink';
import EventHome from './screens/EventHome';
import Join from './screens/Join';
import AddExpense from './screens/AddExpense';
import Settlement from './screens/Settlement';
import Settings from './screens/Settings';
import TripSettings from './screens/TripSettings';
import { getAuth, clearAuth } from './storage';
import { t } from './i18n';
import type { Lang } from './i18n';
import type { Event } from './types';

export type Screen =
  | { name: 'auth'; pendingInvite?: string }
  | { name: 'trips' }
  | { name: 'create' }
  | { name: 'sharelink'; inviteCode: string; eventName: string }
  | { name: 'event'; inviteCode: string }
  | { name: 'join'; inviteCode: string }
  | { name: 'addexpense'; inviteCode: string; event: Event }
  | { name: 'settlement'; inviteCode: string; event: Event }
  | { name: 'settings' }
  | { name: 'tripsettings'; inviteCode: string; event: import('./types').Event };

function detectInitialScreen(): Screen {
  const path = window.location.pathname;
  const match = path.match(/^\/j\/([^/]+)/);
  if (match) {
    if (getAuth()) return { name: 'join', inviteCode: match[1] };
    return { name: 'auth', pendingInvite: match[1] };
  }
  return getAuth() ? { name: 'trips' } : { name: 'auth' };
}

function getInitialLang(): Lang {
  const auth = getAuth();
  if (auth?.user.language === 'en') return 'en';
  return 'ar';
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(detectInitialScreen);
  const [lang, setLang] = useState<Lang>(getInitialLang);
  const go = (s: Screen) => setScreen(s);
  const s = t(lang);
  const dir = lang === 'ar' ? 'rtl' : 'ltr';

  const handleSignOut = () => {
    clearAuth();
    go({ name: 'auth' });
  };

  switch (screen.name) {
    case 'auth':
      return <AuthScreen
        lang={lang} s={s}
        onDone={() => screen.pendingInvite
          ? go({ name: 'join', inviteCode: screen.pendingInvite })
          : go({ name: 'trips' })}
      />;

    case 'trips':
      return (
        <MyTrips
          lang={lang} s={s} dir={dir}
          onCreateTrip={() => go({ name: 'create' })}
          onOpenTrip={(code) => go({ name: 'event', inviteCode: code })}
          onSettings={() => go({ name: 'settings' })}
        />
      );

    case 'create':
      return (
        <CreateTrip
          lang={lang} s={s} dir={dir}
          onBack={() => go({ name: 'trips' })}
          onCreated={(code, name) => go({ name: 'sharelink', inviteCode: code, eventName: name })}
        />
      );

    case 'sharelink':
      return (
        <ShareLink
          lang={lang} s={s} dir={dir}
          inviteCode={screen.inviteCode}
          eventName={screen.eventName}
          onEnter={() => go({ name: 'event', inviteCode: screen.inviteCode })}
        />
      );

    case 'event':
      return (
        <EventHome
          lang={lang} s={s} dir={dir}
          inviteCode={screen.inviteCode}
          onBack={() => go({ name: 'trips' })}
          onAddExpense={(event) => go({ name: 'addexpense', inviteCode: screen.inviteCode, event })}
          onSettlement={(event) => go({ name: 'settlement', inviteCode: screen.inviteCode, event })}
          onTripSettings={(event) => go({ name: 'tripsettings', inviteCode: screen.inviteCode, event })}
        />
      );

    case 'tripsettings':
      return (
        <TripSettings
          s={s} dir={dir}
          inviteCode={screen.inviteCode}
          event={screen.event}
          onBack={() => go({ name: 'event', inviteCode: screen.inviteCode })}
          onRenamed={() => go({ name: 'event', inviteCode: screen.inviteCode })}
          onLeft={() => go({ name: 'trips' })}
        />
      );

    case 'join':
      return (
        <Join
          lang={lang} s={s} dir={dir}
          inviteCode={screen.inviteCode}
          onJoined={() => go({ name: 'event', inviteCode: screen.inviteCode })}
        />
      );

    case 'addexpense':
      return (
        <AddExpense
          lang={lang} s={s} dir={dir}
          inviteCode={screen.inviteCode}
          event={screen.event}
          onBack={() => go({ name: 'event', inviteCode: screen.inviteCode })}
          onSaved={() => go({ name: 'event', inviteCode: screen.inviteCode })}
        />
      );

    case 'settlement':
      return (
        <Settlement
          lang={lang} s={s} dir={dir}
          inviteCode={screen.inviteCode}
          event={screen.event}
          onBack={() => go({ name: 'event', inviteCode: screen.inviteCode })}
        />
      );

    case 'settings':
      return (
        <Settings
          lang={lang} s={s}
          onBack={() => go({ name: 'trips' })}
          onLanguageChange={(l) => setLang(l)}
          onSignOut={handleSignOut}
        />
      );
  }
}
