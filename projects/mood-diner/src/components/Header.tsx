import React from 'react';
import { UtensilsCrossed, CalendarCheck, Sun, Snowflake, PlusCircle, CheckCircle2, Crown } from 'lucide-react';
import { WeatherCondition } from '../types';
import { useMonetization } from '../lib/monetization/MonetizationContext';

const HeaderProBadge: React.FC = () => {
  const { plan, creditsRemaining, openPaywall } = useMonetization();

  if (plan === 'pro') {
    return (
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '999px',
          background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
          color: '#0f172a',
          fontSize: '0.8rem',
          fontWeight: 700,
          boxShadow: '0 0 12px rgba(251, 191, 36, 0.4)'
        }}
      >
        <Crown size={14} /> PRO ACTIVE
      </span>
    );
  }

  return (
    <button
      onClick={openPaywall}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '6px 12px',
        borderRadius: '999px',
        border: '1px solid rgba(251, 191, 36, 0.4)',
        background: 'rgba(251, 191, 36, 0.1)',
        color: '#fbbf24',
        fontSize: '0.8rem',
        fontWeight: 600,
        cursor: 'pointer'
      }}
      id="upgrade-pro-btn"
    >
      <Crown size={14} />
      <span>Upgrade Pro ({creditsRemaining} left)</span>
    </button>
  );
};

interface HeaderProps {
  weather: WeatherCondition;
  reservationsCount: number;
  onOpenBookings: () => void;
  onToggleWeatherModal: () => void;
  onOpenAddRealModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  weather,
  reservationsCount,
  onOpenBookings,
  onToggleWeatherModal,
  onOpenAddRealModal,
}) => {
  const isSummer = weather.season === 'Summer';

  return (
    <header className="glass-panel" style={{ borderRadius: 0, borderTop: 'none', borderLeft: 'none', borderRight: 'none' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ background: 'linear-gradient(135deg, #f59e0b, #f43f5e)', padding: '10px', borderRadius: '12px', display: 'flex' }}>
            <UtensilsCrossed size={28} color="#0b0f19" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, background: 'linear-gradient(90deg, #f59e0b, #f8fafc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                MoodDiner
              </h1>
              <span className="badge badge-open" style={{ fontSize: '0.7rem', padding: '2px 8px' }}>
                <CheckCircle2 size={10} /> Real-World Dining Verified
              </span>
            </div>
            <p style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Smart Occasion, Review Aggregate & Weather AI Recommender</p>
          </div>
        </div>

        {/* Action Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          
          {/* Weather Trigger Badge */}
          <button
            onClick={onToggleWeatherModal}
            className="glass-pill"
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 14px' }}
            title="Click to switch live weather simulation"
            id="weather-toggle-btn"
          >
            {isSummer ? <Sun size={18} color="#f59e0b" /> : <Snowflake size={18} color="#06b6d4" />}
            <span>{weather.temperatureF}°F {weather.condition}</span>
            <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>({weather.season})</span>
          </button>

          {/* Import Real Restaurant Button */}
          <button
            onClick={onOpenAddRealModal}
            className="btn-secondary"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', fontSize: '0.85rem' }}
            id="import-real-rest-btn"
          >
            <PlusCircle size={16} color="#f59e0b" />
            <span>+ Import Real Spot</span>
          </button>

          {/* Pro Upgrade / Tier Badge */}
          <HeaderProBadge />

          {/* Bookings Button */}
          <button
            onClick={onOpenBookings}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
            id="my-bookings-btn"
          >
            <CalendarCheck size={18} />
            <span>My Bookings</span>
            {reservationsCount > 0 && (
              <span style={{ background: '#0b0f19', color: '#f59e0b', padding: '2px 8px', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700 }}>
                {reservationsCount}
              </span>
            )}
          </button>

        </div>

      </div>
    </header>
  );
};
