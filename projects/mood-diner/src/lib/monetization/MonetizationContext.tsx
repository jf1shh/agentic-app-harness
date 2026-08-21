/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  loadPlanTier,
  savePlanTier,
  loadCreditsForToday,
  saveCredits,
  DAILY_FREE_CREDITS,
  type PlanTier,
} from './monetizationStorage';

export type { PlanTier };

export interface MonetizationContextType {
  plan: PlanTier;
  creditsRemaining: number;
  isPaywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
  useCredit: () => boolean;
  upgradeToPro: () => void;
  downgradeToFree: () => void;
}

const MonetizationContext = createContext<MonetizationContextType | undefined>(undefined);

export const MonetizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Every read and write below goes through monetizationStorage, which treats
  // localStorage as the untrusted boundary it is (.agents/AGENTS.md §1). That
  // matters most here: this provider sits at the root of the tree, so an
  // unguarded throw from a browser that denies storage would blank the whole
  // app rather than degrading to the free tier.
  const [plan, setPlan] = useState<PlanTier>(() => loadPlanTier(localStorage));

  const [creditsRemaining, setCreditsRemaining] = useState<number>(() =>
    loadCreditsForToday(localStorage, new Date().toISOString().slice(0, 10)),
  );

  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  useEffect(() => {
    savePlanTier(localStorage, plan);
  }, [plan]);

  useEffect(() => {
    saveCredits(localStorage, creditsRemaining);
  }, [creditsRemaining]);

  const openPaywall = () => setIsPaywallOpen(true);
  const closePaywall = () => setIsPaywallOpen(false);

  const useCredit = (): boolean => {
    if (plan === 'pro') return true;
    if (creditsRemaining > 0) {
      setCreditsRemaining(prev => prev - 1);
      return true;
    }
    setIsPaywallOpen(true);
    return false;
  };

  const upgradeToPro = () => {
    setPlan('pro');
    setIsPaywallOpen(false);
  };

  const downgradeToFree = () => {
    setPlan('free');
    setCreditsRemaining(DAILY_FREE_CREDITS);
  };

  return (
    <MonetizationContext.Provider
      value={{
        plan,
        creditsRemaining,
        isPaywallOpen,
        openPaywall,
        closePaywall,
        useCredit,
        upgradeToPro,
        downgradeToFree,
      }}
    >
      {children}
    </MonetizationContext.Provider>
  );
};

const DEFAULT_FALLBACK_CONTEXT: MonetizationContextType = {
  plan: 'free',
  creditsRemaining: DAILY_FREE_CREDITS,
  isPaywallOpen: false,
  openPaywall: () => {},
  closePaywall: () => {},
  useCredit: () => true,
  upgradeToPro: () => {},
  downgradeToFree: () => {},
};

export const useMonetization = (): MonetizationContextType => {
  const ctx = useContext(MonetizationContext);
  return ctx || DEFAULT_FALLBACK_CONTEXT;
};
