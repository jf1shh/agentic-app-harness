import React, { useState } from 'react';
import { Crown, Check, Sparkles, X, ShieldCheck } from 'lucide-react';
import { useMonetization } from '../lib/monetization/MonetizationContext';

export const ProPaywallModal: React.FC = () => {
  const { isPaywallOpen, closePaywall, upgradeToPro } = useMonetization();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  if (!isPaywallOpen) return null;

  const handleSubscribe = () => {
    upgradeToPro();
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.85)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: '1rem'
    }}>
      <div className="modal-content" style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        border: '1px solid rgba(99, 102, 241, 0.4)',
        borderRadius: '1.25rem',
        maxWidth: '480px',
        width: '100%',
        padding: '2rem',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(99, 102, 241, 0.2)',
        color: '#f8fafc',
        position: 'relative'
      }}>
        <button
          onClick={closePaywall}
          aria-label="Close paywall"
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            color: '#94a3b8',
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <X size={18} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{
            display: 'inline-flex',
            padding: '0.75rem',
            borderRadius: '1rem',
            background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
            boxShadow: '0 0 20px rgba(251, 191, 36, 0.4)',
            marginBottom: '1rem'
          }}>
            <Crown size={32} color="#0f172a" />
          </div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0, color: '#ffffff' }}>
            MoodDiner <span style={{ color: '#fbbf24' }}>Pro</span>
          </h2>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.5rem' }}>
            Unlock unlimited AI weather matching, live spot imports & VIP reservations.
          </p>
        </div>

        {/* Billing Selector */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.6)',
          borderRadius: '0.75rem',
          padding: '4px',
          marginBottom: '1.5rem',
          border: '1px solid rgba(255,255,255,0.1)'
        }}>
          <button
            onClick={() => setBillingCycle('annual')}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: billingCycle === 'annual' ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' : 'transparent',
              color: billingCycle === 'annual' ? '#ffffff' : '#94a3b8',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Annual ($3.33/mo) <span style={{ color: '#10b981', fontSize: '0.75rem', marginLeft: '4px' }}>Save 33%</span>
          </button>
          <button
            onClick={() => setBillingCycle('monthly')}
            style={{
              flex: 1,
              padding: '0.6rem',
              borderRadius: '0.5rem',
              border: 'none',
              background: billingCycle === 'monthly' ? 'linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)' : 'transparent',
              color: billingCycle === 'monthly' ? '#ffffff' : '#94a3b8',
              fontWeight: 600,
              cursor: 'pointer',
              fontSize: '0.85rem'
            }}
          >
            Monthly ($4.99/mo)
          </button>
        </div>

        {/* Feature List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.75rem' }}>
          {[
            'Unlimited AI Weather-Aware Cuisine Guards',
            'Instant Live Spot Importer (Google + Yelp scoring)',
            'Dish-Level Signature Recommendations',
            'Priority Table Reservations & Cancellation Alerts',
            'Ad-Free Premium Interface'
          ].map((feat, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.9rem', color: '#e2e8f0' }}>
              <div style={{
                background: 'rgba(16, 185, 129, 0.15)',
                borderRadius: '50%',
                padding: '4px',
                display: 'flex'
              }}>
                <Check size={16} color="#10b981" />
              </div>
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* Action Button */}
        <button
          onClick={handleSubscribe}
          style={{
            width: '100%',
            padding: '0.85rem',
            borderRadius: '0.75rem',
            border: 'none',
            background: 'linear-gradient(135deg, #fbbf24 0%, #d97706 100%)',
            color: '#0f172a',
            fontSize: '1rem',
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 10px 25px -5px rgba(251, 191, 36, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem'
          }}
        >
          <Sparkles size={18} />
          {billingCycle === 'annual' ? 'Start 7-Day Free Trial ($39.99/yr)' : 'Start 7-Day Free Trial ($4.99/mo)'}
        </button>

        <p style={{ textAlign: 'center', fontSize: '0.75rem', color: '#64748b', marginTop: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
          <ShieldCheck size={14} color="#10b981" /> Cancel anytime with 1-click in Google Play / Web Settings
        </p>
      </div>
    </div>
  );
};
