'use client';

import { SpatialCamera } from '@/components/spatial/SpatialCameraController';
import { StarField } from '@/components/spatial/StarField';
import { StorytimeProvider } from '@/components/spatial/StorytimeManager';
import { XRManager } from '@/components/spatial/XRManager';
import { ARManager } from '@/components/spatial/ARManager';
import { TimelinePath } from '@/components/spatial/TimelinePath';
import { LifeMapProvider } from '@/components/spatial/LifeMapManager';
import { ChapterView } from '@/components/spatial/ChapterView'; // Import the new ChapterView
import * as THREE from 'three';

const mockTimelineNodes = [
  { id: 'birth', position: new THREE.Vector3(0, 0, 0), title: 'Birth', description: 'The day it all began.' },
  { id: 'childhood', position: new THREE.Vector3(5, 2, -10), title: 'Childhood', description: 'Years of discovery and play.' },
  { id: 'education', position: new THREE.Vector3(-5, -3, -25), title: 'Education', description: 'Learning and growing.' },
  { id: 'career', position: new THREE.Vector3(10, 5, -40), title: 'First Career', description: 'Stepping into the professional world.' },
  { id: 'travel', position: new THREE.Vector3(0, 0, -60), title: 'World Travel', description: 'Exploring new cultures and horizons.' },
  { id: 'present', position: new THREE.Vector3(-10, -5, -75), title: 'Present Day', description: 'Where I am now.' },
];

export default function SpatialWebPage() {
  return (
    <main className="w-full h-screen bg-black">
      <div style={{ position: 'absolute', zIndex: 100, top: '20px', left: '20px', display: 'flex', gap: '10px' }}>
        <ARManager />
      </div>

      <XRManager>
        <SpatialCamera>
          <StorytimeProvider>
            <LifeMapProvider>
              <StarField />
              <TimelinePath nodes={mockTimelineNodes} />
              {/* The ChapterView now renders, consuming state from the LifeMapProvider */}
              <ChapterView />
            </LifeMapProvider>
          </StorytimeProvider>
        </SpatialCamera>
      </XRManager>
    </main>
  );
}
