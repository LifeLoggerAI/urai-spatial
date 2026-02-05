import { getAuth } from 'firebase/auth';
import { app } from './firebaseClient';

export const auth = getAuth(app);
