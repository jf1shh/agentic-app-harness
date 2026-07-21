/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';

export type PlanTier = 'free' | 'pro';

export interface MonetizationContextType {
  plan: PlanTier;
  creditsRemaining: number;
  isPaywallOpen: boolean;
  openPaywall: () => void;
  closePaywall: () => void;
  useCredit: () => boolean; // returns true if allowed, false if limit reached and opens paywall
  upgradeToPro: () => void;
  downgradeToFree: () => void;
}

const MonetizationContext = createContext<MonetizationContextType | undefined>(undefined);

const DAILY_FREE_CREDITS = 3;
const STORAGE_KEY_PLAN = 'mooddiner_plan_tier';
const STORAGE_KEY_CREDITS = 'mooddiner_daily_credits';
const STORAGE_KEY_DATE = 'mooddiner_credit_date';

export const MonetizationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plan, setPlan] = useState<PlanTier>(() => {
    return (localStorage.getItem(STORAGE_KEY_PLAN) as PlanTier) || 'free';
  });

  const [creditsRemaining, setCreditsRemaining] = useState<number>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const lastDate = localStorage.getItem(STORAGE_KEY_DATE);
    if (lastDate !== today) {
      localStorage.setItem(STORAGE_KEY_DATE, today);
      localStorage.setItem(STORAGE_KEY_CREDITS, DAILY_FREE_CREDITS.toString());
      return DAILY_FREE_CREDITS;
    }
    const saved = localStorage.getItem(STORAGE_KEY_CREDITS);
    return saved !== null ? parseInt(saved, 10) : DAILY_FREE_CREDITS;
  });

  const [isPaywallOpen, setIsPaywallOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PLAN, plan);
  }, [plan]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CREDITS, creditsRemaining.toString());
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

export const useMonetization = (): MonetizationContextType => {
  const ctx = useContext(MonetizationContext);
  if (!ctx) {
    throw new Error('useMonetization must be used within a MonetizationProvider');
  }
  return ctx;
};
