
import { useAuth } from './AuthProvider';
import { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return <div>Loading...</div>; // Or a spinner
  }

  if (!user || !isAdmin) {
    // Redirect them to the /login page, but save the current location they were
    // trying to go to. This allows us to send them along to that page after a 
    // successful login.
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
