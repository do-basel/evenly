import { useState } from 'react';
import SignIn from './screens/SignIn';
import MyTrips from './screens/MyTrips';
import CreateTrip from './screens/CreateTrip';
import ShareLink from './screens/ShareLink';
import EventHome from './screens/EventHome';
import Join from './screens/Join';
import AddExpense from './screens/AddExpense';
import Settlement from './screens/Settlement';
import { getProfile } from './storage';
import type { Event } from './types';

export type Screen =
  | { name: 'signin' }
  | { name: 'trips' }
  | { name: 'create' }
  | { name: 'sharelink'; inviteCode: string; eventName: string }
  | { name: 'event'; inviteCode: string }
  | { name: 'join'; inviteCode: string }
  | { name: 'addexpense'; inviteCode: string; event: Event }
  | { name: 'settlement'; inviteCode: string; event: Event };

function detectInitialScreen(): Screen {
  const path = window.location.pathname;
  const match = path.match(/^\/j\/([^/]+)/);
  if (match) return { name: 'join', inviteCode: match[1] };
  return getProfile() ? { name: 'trips' } : { name: 'signin' };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>(detectInitialScreen);
  const go = (s: Screen) => setScreen(s);

  switch (screen.name) {
    case 'signin':
      return <SignIn onDone={() => go({ name: 'trips' })} />;
    case 'trips':
      return (
        <MyTrips
          onCreateTrip={() => go({ name: 'create' })}
          onOpenTrip={(code) => go({ name: 'event', inviteCode: code })}
          onSignOut={() => go({ name: 'signin' })}
        />
      );
    case 'create':
      return (
        <CreateTrip
          onBack={() => go({ name: 'trips' })}
          onCreated={(code, name) => go({ name: 'sharelink', inviteCode: code, eventName: name })}
        />
      );
    case 'sharelink':
      return (
        <ShareLink
          inviteCode={screen.inviteCode}
          eventName={screen.eventName}
          onEnter={() => go({ name: 'event', inviteCode: screen.inviteCode })}
        />
      );
    case 'event':
      return (
        <EventHome
          inviteCode={screen.inviteCode}
          onBack={() => go({ name: 'trips' })}
          onAddExpense={(event) => go({ name: 'addexpense', inviteCode: screen.inviteCode, event })}
          onSettlement={(event) => go({ name: 'settlement', inviteCode: screen.inviteCode, event })}
        />
      );
    case 'join':
      return (
        <Join
          inviteCode={screen.inviteCode}
          onJoined={() => go({ name: 'event', inviteCode: screen.inviteCode })}
        />
      );
    case 'addexpense':
      return (
        <AddExpense
          inviteCode={screen.inviteCode}
          event={screen.event}
          onBack={() => go({ name: 'event', inviteCode: screen.inviteCode })}
          onSaved={() => go({ name: 'event', inviteCode: screen.inviteCode })}
        />
      );
    case 'settlement':
      return (
        <Settlement
          inviteCode={screen.inviteCode}
          event={screen.event}
          onBack={() => go({ name: 'event', inviteCode: screen.inviteCode })}
        />
      );
  }
}
