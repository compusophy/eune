import { Metadata } from 'next';
import HomeComponent from './HomeComponent';

const frame = {
    version: "next",
    imageUrl: "https://dependable-miracle-production.up.railway.app/og-image.png",
    button: {
      title: "🚩 Start",
      action: {
        type: "launch_frame" as const,
        url: "https://dependable-miracle-production.up.railway.app/",
        name:"ThreeJS MMO",
        splashImageUrl: "https://dependable-miracle-production.up.railway.app/splash.png",
        splashBackgroundColor:"#f5f0ec"
      }
    }
  }

export const metadata: Metadata = {
    other: {
        'fc:frame': JSON.stringify(frame),
    }
};

export default function Home() {
  return (
    <HomeComponent />
  );
} 