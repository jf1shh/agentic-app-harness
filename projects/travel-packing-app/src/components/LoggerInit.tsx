"use client";

import { useEffect } from 'react';
import { Logger } from '../services/logger';

export default function LoggerInit() {
  useEffect(() => {
    Logger.init();
  }, []);

  return null; // This component doesn't render anything visually
}
