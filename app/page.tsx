'use client';

import Link from 'next/link';

const Tile = ({ href, title }: { href: string; title: string }) => (
  <Link href={href}>
    <div className="border-2 border-gray-700 rounded-lg p-8 hover:bg-gray-800 transition-colors">
      <h2 className="text-2xl font-bold">{title}</h2>
    </div>
  </Link>
);

export default function HomePage() {
  return (
    <div className="bg-black text-white min-h-screen flex items-center justify-center">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <Tile href="/life-map" title="Life-Map VR" />
        <Tile href="/ritual-ar" title="Ritual AR" />
        <Tile href="/dream-planetarium" title="Dream Planetarium" />
      </div>
    </div>
  );
}
