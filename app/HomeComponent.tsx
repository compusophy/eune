'use client';

import dynamic from 'next/dynamic';

const GameScene = dynamic(() => import('./components/GameScene').then(mod => mod.GameScene), {
  ssr: false,
  loading: () => <p>Loading scene...</p>
});

export default function HomeComponent() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center">
      <GameScene />
    </main>
  );
} 