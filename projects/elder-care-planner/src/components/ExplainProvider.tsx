'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { Explanation, ExplanationId, ExplanationSet } from '@/lib/explain/types';

interface ExplainContextValue {
  readonly explanations: ExplanationSet;
  readonly openId: ExplanationId | null;
  readonly open: (id: ExplanationId) => void;
  readonly close: () => void;
  readonly get: (id: ExplanationId) => Explanation | null;
}

const ExplainContext = createContext<ExplainContextValue | null>(null);

/**
 * Holds the derivations for every figure on screen, plus which one is currently
 * open. Kept in one place so a component can put a "?" beside a number without
 * knowing how that number was produced — the explanation is built from engine
 * output, never from the component's own arithmetic (spec §6.10).
 */
export function ExplainProvider({
  explanations,
  children,
}: {
  explanations: ExplanationSet;
  children: ReactNode;
}) {
  const [openId, setOpenId] = useState<ExplanationId | null>(null);

  const open = useCallback((id: ExplanationId) => setOpenId(id), []);
  const close = useCallback(() => setOpenId(null), []);
  const get = useCallback((id: ExplanationId) => explanations[id], [explanations]);

  const value = useMemo<ExplainContextValue>(
    () => ({ explanations, openId, open, close, get }),
    [explanations, openId, open, close, get],
  );

  return <ExplainContext.Provider value={value}>{children}</ExplainContext.Provider>;
}

export function useExplain(): ExplainContextValue {
  const ctx = useContext(ExplainContext);
  if (!ctx) throw new Error('useExplain must be used inside an ExplainProvider');
  return ctx;
}
