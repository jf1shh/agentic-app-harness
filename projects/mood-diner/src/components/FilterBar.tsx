import React from 'react';
import { Heart, Gift, Sparkles, Briefcase, Coffee, Moon, Footprints, Car, Clock } from 'lucide-react';
import { TransportMode } from '../types';

interface FilterBarProps {
  selectedOccasion: string;
  onSelectOccasion: (occasion: string) => void;
  selectedMood: string;
  onSelectMood: (mood: string) => void;
  transportMode: TransportMode;
  onSelectTransportMode: (mode: TransportMode) => void;
  onlyOpenNow: boolean;
  onToggleOnlyOpenNow: (open: boolean) => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  selectedOccasion,
  onSelectOccasion,
  selectedMood,
  onSelectMood,
  transportMode,
  onSelectTransportMode,
  onlyOpenNow,
  onToggleOnlyOpenNow,
}) => {
  const occasions = [
    { name: 'All', icon: Sparkles },
    { name: 'Anniversary', icon: Heart },
    { name: 'Birthday', icon: Gift },
    { name: 'First Date', icon: Sparkles },
    { name: 'Business Dinner', icon: Briefcase },
    { name: 'Casual', icon: Coffee },
    { name: 'Late Night', icon: Moon },
  ];

  const moods = ['All', 'Romantic', 'High Energy', 'Cozy', 'Upscale', 'Outdoor Patio'];

  return (
    <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Occasion Section */}
      <div>
        <div style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '10px', fontWeight: 600 }}>
          Select Occasion
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {occasions.map((occ) => {
            const Icon = occ.icon;
            const isActive = selectedOccasion === occ.name;
            return (
              <button
                key={occ.name}
                onClick={() => onSelectOccasion(occ.name)}
                className={`glass-pill ${isActive ? 'active' : ''}`}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                id={`occasion-filter-${occ.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon size={14} color={isActive ? '#f59e0b' : '#94a3b8'} />
                <span>{occ.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '16px' }}>
        
        {/* Mood Section */}
        <div>
          <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginRight: '10px', fontWeight: 600 }}>Mood:</span>
          <div style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '6px' }}>
            {moods.map((m) => (
              <button
                key={m}
                onClick={() => onSelectMood(m)}
                className={`glass-pill ${selectedMood === m ? 'active' : ''}`}
                style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                id={`mood-filter-${m.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        {/* Transport & Open Now Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          
          {/* Walking vs Driving Distance Radius Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255, 255, 255, 0.06)', borderRadius: '999px', padding: '3px' }}>
            <button
              onClick={() => onSelectTransportMode('All')}
              style={{
                background: transportMode === 'All' ? '#f59e0b' : 'transparent',
                color: transportMode === 'All' ? '#0b0f19' : '#94a3b8',
                border: 'none',
                borderRadius: '999px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              id="transport-all"
            >
              All Radius
            </button>
            <button
              onClick={() => onSelectTransportMode('Walking')}
              style={{
                background: transportMode === 'Walking' ? '#f59e0b' : 'transparent',
                color: transportMode === 'Walking' ? '#0b0f19' : '#94a3b8',
                border: 'none',
                borderRadius: '999px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              id="transport-walking"
            >
              <Footprints size={12} />
              Walking (&lt;15 min)
            </button>
            <button
              onClick={() => onSelectTransportMode('Driving')}
              style={{
                background: transportMode === 'Driving' ? '#f59e0b' : 'transparent',
                color: transportMode === 'Driving' ? '#0b0f19' : '#94a3b8',
                border: 'none',
                borderRadius: '999px',
                padding: '4px 10px',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
              id="transport-driving"
            >
              <Car size={12} />
              Driving
            </button>
          </div>

          {/* Website Open Status Check Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#f8fafc' }}>
            <input
              type="checkbox"
              checked={onlyOpenNow}
              onChange={(e) => onToggleOnlyOpenNow(e.target.checked)}
              style={{ accentColor: '#10b981', width: '16px', height: '16px' }}
              id="open-now-checkbox"
            />
            <Clock size={14} color="#10b981" />
            <span>Website Verified Open Only</span>
          </label>

        </div>

      </div>

    </div>
  );
};
