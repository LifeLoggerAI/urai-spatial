"use client";

import LifeMapCanvas from "./LifeMapCanvas";
import { useNarration } from "@/lib/lifemap/useNarration";
import styles from './LifeMap.module.css';

export default function LifeMap() {
  useNarration();

  return (
    <div className={styles.container}>
      <LifeMapCanvas />
    </div>
  );
}
