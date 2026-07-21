import React from 'react';
import { Sun, Snowflake, CloudRain, Thermometer, AlertCircle, Sparkles, X } from 'lucide-react';
import { WeatherCondition } from '../types';
import { PRESET_WEATHER } from '../utils/weatherEngine';

interface WeatherWidgetProps {
  weather: WeatherCondition;
  onSelectWeatherPreset: (preset: WeatherCondition) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const WeatherWidgetModal: React.FC<WeatherWidgetProps> = ({
  weather,
  onSelectWeatherPreset,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '550px', padding: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Thermometer size={24} color="#f59e0b" />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700 }}>AI Weather Recommendation Engine</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
          <div style={{ fontWeight: 600, color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
            <Sparkles size={16} /> Active Weather Condition
          </div>
          <div style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '4px' }}>
            {weather.temperatureF}°F - {weather.condition} ({weather.season})
          </div>
          <p style={{ fontSize: '0.85rem', color: '#cbd5e1' }}>{weather.summary}</p>
        </div>

        <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#94a3b8', marginBottom: '12px' }}>
          Switch Weather Preset to Test AI Recommendation Adjustments:
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {PRESET_WEATHER.map((preset) => {
            const isSelected = preset.season === weather.season && preset.condition === weather.condition;
            return (
              <button
                key={preset.season + preset.condition}
                onClick={() => {
                  onSelectWeatherPreset(preset);
                  onClose();
                }}
                className="glass-panel"
                style={{
                  padding: '12px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderColor: isSelected ? '#f59e0b' : 'rgba(255,255,255,0.1)',
                  background: isSelected ? 'rgba(245, 158, 11, 0.15)' : 'rgba(18, 24, 38, 0.75)',
                }}
                id={`weather-preset-${preset.season.toLowerCase()}`}
              >
                {preset.condition === 'Hot' && <Sun size={24} color="#f59e0b" />}
                {preset.condition === 'Cold' && <Snowflake size={24} color="#06b6d4" />}
                {preset.condition === 'Rainy' && <CloudRain size={24} color="#8b5cf6" />}
                {preset.condition === 'Mild' && <Sun size={24} color="#10b981" />}

                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    {preset.temperatureF}°F {preset.condition} ({preset.season})
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '2px' }}>
                    {preset.summary}
                  </div>
                </div>

                {isSelected && <span style={{ color: '#f59e0b', fontWeight: 700, fontSize: '0.8rem' }}>Active</span>}
              </button>
            );
          })}
        </div>

        <div style={{ marginTop: '20px', fontSize: '0.78rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <AlertCircle size={14} />
          <span>Note: In 90°F+ summer, restaurants serving primarily boiling soups/ramen receive lower match scores to prevent summer overheating.</span>
        </div>

      </div>
    </div>
  );
};
