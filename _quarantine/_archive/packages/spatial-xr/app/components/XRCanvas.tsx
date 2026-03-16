'''"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  Stars,
  Text,
} from "@react-three/drei";
import { useRef, useState, useEffect, Suspense } from "react";
import * as THREE from "three";
import { getAuth, signInAnonymously, User } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  doc,
  getDoc,
  DocumentData,
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import { XR, VRButton } from "@react-three/xr";
import gsap from "gsap";

// Represents a single star fetched from Firestore
interface StarData {
  id: string;
  position: [number, number, number];
  color: string;
  size: number;
  memoryId: string;
}

// Represents a memory fetched from Firestore
interface MemoryData {
  id: string;
  text: string;
  timestamp: any;
  emotion: string;
}

// Component to render a single star
function Star({
  star,
  setSelectedStar,
}: {
  star: StarData;
  setSelectedStar: (star: StarData | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null!)

  const handleClick = () => {
    setSelectedStar(star);
  };

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const scale = 1 + Math.sin(t * 2 + star.position[0]) * 0.1;
    if (meshRef.current) {
        meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh ref={meshRef} position={star.position} onClick={handleClick}>
      <sphereGeometry args={[star.size, 16, 16]} />
      <meshStandardMaterial
        color={star.color}
        emissive={star.color}
        emissiveIntensity={1.5}
        roughness={0.4}
      />
    </mesh>
  );
}

// Component to render the user's galaxy of stars
function Galaxy({ setSelectedStar }: { setSelectedStar: (star: StarData | null) => void; }) {
  const [stars, setStars] = useState<StarData[]>([]);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const auth = getAuth();
    signInAnonymously(auth)
      .then((userCredential) => {
        setUser(userCredential.user);
      })
      .catch((error) => {
        console.error("Anonymous sign-in failed:", error);
      });
  }, []);

  useEffect(() => {
    if (!user) return;

    const starsCollection = collection(db, "users", user.uid, "stars");
    const q = query(starsCollection);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedStars = snapshot.docs.map((doc) => {
        const data = doc.data() as DocumentData;
        return {
          id: doc.id,
          position: data.position || [0, 0, 0],
          color: data.color || '#ffffff',
          size: data.size || 1,
          memoryId: data.memoryId,
        } as StarData;
      });
      setStars(fetchedStars);
    });

    return () => unsubscribe();
  }, [user]);

  return (
    <>
      {stars.map((star) => (
        <Star key={star.id} star={star} setSelectedStar={setSelectedStar} />
      ))}
    </>
  );
}

// Placeholder for the 3D model for the memory room
function MemoryRoomPlaceholder() {
  // A simple box to represent the room shell
  return (
    <mesh scale={[10, 6, 10]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshBasicMaterial color="#222" side={THREE.BackSide} />
    </mesh>
  );
}


// Component to display a single memory
function MemoryView({ star, setSelectedStar }: { star: StarData; setSelectedStar: (star: StarData | null) => void; }) {
  const [memory, setMemory] = useState<MemoryData | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const { camera, controls } = useThree();

  useEffect(() => {
    const auth = getAuth();
    if (auth.currentUser) {
      setUser(auth.currentUser);
    }
  }, []);

  useEffect(() => {
    if (star && user) {
      const memoryRef = doc(db, "users", user.uid, "memories", star.memoryId);
      getDoc(memoryRef).then((docSnap) => {
        if (docSnap.exists()) {
          setMemory({ id: docSnap.id, ...docSnap.data() } as MemoryData);
        }
      });
    }
  }, [star, user]);

  useEffect(() => {
      // On entering a memory, move camera inside the room
      gsap.to(camera.position, {
        x: 0,
        y: 1.6,
        z: 4,
        duration: 1.5,
        ease: "power2.inOut",
      });
      if(controls) {
        // And point it towards the center of the room
          gsap.to(controls.target, {
            x: 0,
            y: 1.6,
            z: 0,
            duration: 1.5,
            ease: "power2.inOut",
          });
      }
  }, [star, camera, controls]);

  const handleExit = () => {
    // On exit, move camera back to the star's original position in the galaxy
    gsap.to(camera.position, {
        x: star.position[0],
        y: star.position[1],
        z: star.position[2] + 20, // A bit further out
        duration: 1.5,
        ease: "power2.inOut",
        onComplete: () => {
            setSelectedStar(null);
        }
      });
      if(controls) {
        gsap.to(controls.target, {
            x: star.position[0],
            y: star.position[1],
            z: star.position[2],
            duration: 1.5,
            ease: "power2.inOut",
          });
      }
  }

  if (!memory) return null;

  return (
    <group>
        <MemoryRoomPlaceholder />
        <Text
         fontSize={0.25}
         color="white"
         position={[0, 1.6, -2]}
         maxWidth={4}
         textAlign="center"
         anchorX="center"
         anchorY="middle"
        >
            {memory.text}
        </Text>
        {/* Exit button */}
        <mesh onClick={handleExit} position={[0, 0.5, 4.5]}>
            <sphereGeometry args={[0.3, 16, 16]} />
            <meshBasicMaterial color="tomato" />
        </mesh>
        <Text fontSize={0.1} color="white" position={[0, 0.5, 4.5]} anchorX="center" anchorY="middle">
            Exit
        </Text>
    </group>
  )
}

// Main canvas component
export default function XRCanvas() {
  const [selectedStar, setSelectedStar] = useState<StarData | null>(null);

  return (
    <div className="w-screen h-screen bg-black">
      <VRButton />
      <Canvas camera={{ position: [0, 10, 50], fov: 45 }}>
        <XR>
          <ambientLight intensity={0.6} />
          <pointLight position={[0, 5, -5]} intensity={1.5} />
          {!selectedStar ? (
              <>
                <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
                <Galaxy setSelectedStar={setSelectedStar} />
              </>
          ) : (
            <MemoryView star={selectedStar} setSelectedStar={setSelectedStar} />
          )}
          <OrbitControls enableZoom={true} enablePan={true} enableRotate={true} />
        </XR>
      </Canvas>
    </div>
  );
}
'''