
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { collection, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Scene } from '../types';

export const Dashboard = () => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchScenes = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'scenes'));
        const scenesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Scene));
        setScenes(scenesData);
      } catch (error) {
        console.error("Error fetching scenes: ", error);
      }
      setLoading(false);
    };

    fetchScenes();
  }, []);

  const handleLogout = async () => {
    await auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h2>Scene Dashboard</h2>
      <button onClick={handleLogout}>Logout</button>
      <ul>
        {scenes.map(scene => (
          <li key={scene.id}>
            <Link to={`/scene/${scene.id}`}>{scene.title}</Link>
            <span> - Release: {scene.currentReleaseId || 'N/A'}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};
