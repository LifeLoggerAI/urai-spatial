
import { useState } from 'react';

export const useTimeline = () => {
  const [time, setTime] = useState(Date.now());
  return { time, setTime };
};
