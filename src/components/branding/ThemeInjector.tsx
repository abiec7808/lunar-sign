'use client';

import React, { useEffect } from 'react';
import { Organisation } from '@/types';

interface ThemeInjectorProps {
  organisation?: Organisation | null;
  children: React.ReactNode;
}

export function ThemeInjector({ organisation, children }: ThemeInjectorProps) {
  useEffect(() => {
    if (!organisation) return;

    const root = document.documentElement;
    if (organisation.primary_color) {
      root.style.setProperty('--primary', organisation.primary_color);
    }
    if (organisation.accent_color) {
      root.style.setProperty('--accent', organisation.accent_color);
    }
    if (organisation.text_color) {
      root.style.setProperty('--foreground', organisation.text_color);
    }
  }, [organisation]);

  return <>{children}</>;
}
