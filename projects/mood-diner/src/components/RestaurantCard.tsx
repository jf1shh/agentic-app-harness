import React from 'react';
import { Star, Footprints, Car, CheckCircle2, AlertTriangle, Calendar, ExternalLink, Flame, Award, MessageSquareQuote } from 'lucide-react';
import { Restaurant, WeatherCondition } from '../types';
import { evaluateWeatherSuitability } from '../utils/weatherEngine';
import { isRestaurantOpenNow } from '../utils/openStatus';
import { parseReviewCommentsForMood } from '../utils/reviewVibeParser';

interface RestaurantCardProps {
  restaurant: Restaurant;
  weather: WeatherCondition;
  selectedMood: string;
  onSelect: (restaurant: Restaurant, initialTab?: 'overview' | 'menu' | 'busy' | 'book') => void;
}

export const RestaurantCard: React.FC<RestaurantCardProps> = ({
  restaurant,
  weather,
  selectedMood,
  onSelect,
}) => {
  const weatherResult = evaluateWeatherSuitability(restaurant, weather);
  const vibeResult = parseReviewCommentsForMood(restaurant, selectedMood);
  const isOpen = isRestaurantOpenNow(restaurant);
  const agg = restaurant.aggregateScore;

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', transition: 'var(--transition-smooth)' }}>
      
      {/* Hero Image Container */}
      <div style={{ position: 'relative', height: '180px', width: '100%', overflow: 'hidden' }}>
        <img
          src={restaurant.heroImage}
          alt={restaurant.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, rgba(11, 15, 25, 0.95) 0%, transparent 60%)' }} />
        
        {/* Price & Open Status Badges */}
        <div style={{ position: 'absolute', top: '12px', left: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <span style={{ background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(4px)', color: '#f59e0b', padding: '4px 10px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700 }}>
            {restaurant.priceRange}
          </span>
          <span className={isOpen ? 'badge-open' : 'badge-weather-warn'} style={{ backdropFilter: 'blur(4px)' }}>
            <CheckCircle2 size={12} />
            {isOpen ? 'Website Verified Open' : 'Closed Now'}
          </span>
        </div>

        {/* Distance Info */}
        <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'rgba(11, 15, 25, 0.85)', backdropFilter: 'blur(4px)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem', color: '#cbd5e1', display: 'flex', gap: '8px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Footprints size={12} color="#10b981" /> {restaurant.walkTimeMinutes}m walk ({restaurant.distanceMiles}mi)
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Car size={12} color="#3b82f6" /> {restaurant.driveTimeMinutes}m drive
          </span>
        </div>

        {/* Bottom Banner inside Image: Cuisine & Michelin Tag */}
        <div style={{ position: 'absolute', bottom: '10px', left: '12px', right: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: '0.8rem', color: '#94a3b8', background: 'rgba(0,0,0,0.6)', padding: '2px 8px', borderRadius: '4px' }}>
            {restaurant.cuisine}
          </span>
          
          {agg.michelin?.stars && (
            <span style={{ fontSize: '0.75rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.25)', padding: '2px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px', border: '1px solid rgba(245, 158, 11, 0.5)', fontWeight: 700 }}>
              <Award size={12} /> Michelin {agg.michelin.stars}★
            </span>
          )}
        </div>
      </div>

      {/* Body Content */}
      <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1, gap: '12px' }}>
        
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
            {restaurant.name}
          </h3>
          <p style={{ fontSize: '0.82rem', color: '#94a3b8', lineClamp: 2 }}>
            {restaurant.tagline}
          </p>
        </div>

        {/* Multi-Source Aggregate Score Section */}
        <div style={{ background: 'rgba(255, 255, 255, 0.03)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '0.72rem', textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Unified Multi-Source Score</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Star size={16} fill="#f59e0b" color="#f59e0b" />
              <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f8fafc' }}>
                {agg.compositeScore}
              </span>
              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>/ 5.0</span>
            </div>
          </div>

          {/* Sources Pills Grid */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            <span className="badge badge-google">
              Google {agg.google.rating}★
            </span>
            <span className="badge badge-yelp">
              Yelp {agg.yelp.rating}★
            </span>
            {agg.tripAdvisor && (
              <span className="badge" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)' }}>
                TripAdvisor {agg.tripAdvisor.rating}★
              </span>
            )}
            {agg.openTable && (
              <span className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
                OpenTable {agg.openTable.rating}★
              </span>
            )}
            {agg.infatuationScore && (
              <span className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                Infatuation {agg.infatuationScore}/10
              </span>
            )}
          </div>
        </div>

        {/* Review Comment Vibe Match Badge */}
        {selectedMood !== 'All' && (
          <div style={{ background: 'rgba(139, 92, 246, 0.12)', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '6px 10px', borderRadius: '6px', fontSize: '0.78rem', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <MessageSquareQuote size={14} style={{ flexShrink: 0 }} />
            <span>Review Vibe Match: {vibeResult.vibeMatchScore}% ({vibeResult.summaryText})</span>
          </div>
        )}

        {/* AI Weather Suitability Badge */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          {weatherResult.isWeatherDiscouraged ? (
            <span className="badge badge-weather-warn" style={{ width: '100%', padding: '6px 10px' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0 }} />
              <span>Weather Note: Hot soups/stews discouraged in {weather.temperatureF}°F heat</span>
            </span>
          ) : (
            <span className="badge badge-weather-boost" style={{ width: '100%', padding: '6px 10px' }}>
              <Flame size={14} style={{ flexShrink: 0 }} />
              <span>AI Match ({weatherResult.weatherMatchScore}%): {weatherResult.weatherNote}</span>
            </span>
          )}
        </div>

        {/* Occasion & Mood Tags */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {restaurant.occasions.map((occ) => (
            <span key={occ} style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
              {occ}
            </span>
          ))}
          {restaurant.moods.map((m) => (
            <span key={m} style={{ background: 'rgba(255, 255, 255, 0.06)', color: '#cbd5e1', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px' }}>
              {m}
            </span>
          ))}
        </div>

        {/* Website Link */}
        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
          Website:{' '}
          <a
            href={restaurant.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#60a5fa', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}
          >
            {restaurant.websiteUrl.replace('https://', '')} <ExternalLink size={10} />
          </a>
        </div>

        {/* CTA Buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(140px, 100%), 1fr))', gap: '10px', marginTop: 'auto', paddingTop: '8px' }}>
          <button
            onClick={() => onSelect(restaurant, 'menu')}
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '8px' }}
            id={`btn-menu-${restaurant.id}`}
          >
            Menu & Times
          </button>
          <button
            onClick={() => onSelect(restaurant, 'book')}
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}
            id={`btn-book-${restaurant.id}`}
          >
            <Calendar size={14} />
            Book Table
          </button>
        </div>

      </div>

    </div>
  );
};
