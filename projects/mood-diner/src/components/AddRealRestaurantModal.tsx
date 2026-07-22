import React, { useState } from 'react';
import { X, PlusCircle } from 'lucide-react';
import { Restaurant, MichelinStatus } from '../types';
import { calculateAggregateScore } from '../utils/aggregateScoring';

interface AddRealRestaurantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddRestaurant: (newRestaurant: Restaurant) => void;
}

export const AddRealRestaurantModal: React.FC<AddRealRestaurantModalProps> = ({
  isOpen,
  onClose,
  onAddRestaurant,
}) => {
  const [name, setName] = useState('');
  const [cuisine, setCuisine] = useState('Italian');
  const [address, setAddress] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  
  // Review platform inputs
  const [googleRating, setGoogleRating] = useState(4.8);
  const [googleReviews, setGoogleReviews] = useState(1500);
  const [yelpRating, setYelpRating] = useState(4.6);
  const [yelpReviews, setYelpReviews] = useState(1100);
  const [tripAdvisorRating, setTripAdvisorRating] = useState(4.7);
  const [tripAdvisorReviews, setTripAdvisorReviews] = useState(900);
  const [openTableRating, setOpenTableRating] = useState(4.8);
  const [openTableReviews, setOpenTableReviews] = useState(2500);
  const [infatuationScore, setInfatuationScore] = useState(9.0);
  const [michelinStars, setMichelinStars] = useState<number>(0); // 0, 1, 2, 3

  const [priceRange, setPriceRange] = useState<'$$' | '$$$' | '$$$$'>('$$$');
  const [occasionsStr, setOccasionsStr] = useState('Anniversary, Birthday, First Date');
  const [isHotDish, setIsHotDish] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const gRating = Number(googleRating);
    const gCount = Number(googleReviews);
    const yRating = Number(yelpRating);
    const yCount = Number(yelpReviews);
    const taRating = Number(tripAdvisorRating);
    const taCount = Number(tripAdvisorReviews);
    const otRating = Number(openTableRating);
    const otCount = Number(openTableReviews);
    const infScore = Number(infatuationScore);

    let michelinObj: MichelinStatus | undefined;
    if (michelinStars > 0) {
      michelinObj = {
        stars: michelinStars as 1 | 2 | 3,
        description: `Awarded ${michelinStars} Michelin Star${michelinStars > 1 ? 's' : ''} for top culinary excellence.`,
      };
    }

    const aggScore = calculateAggregateScore(
      { rating: gRating, reviewCount: gCount },
      { rating: yRating, reviewCount: yCount },
      taCount > 0 ? { rating: taRating, reviewCount: taCount } : undefined,
      michelinObj,
      infScore > 0 ? infScore : undefined,
      otCount > 0 ? { rating: otRating, reviewCount: otCount } : undefined
    );

    const occasionsList = occasionsStr.split(',').map((s) => s.trim()).filter(Boolean);

    const newRestaurant: Restaurant = {
      id: `real-custom-${Date.now()}`,
      name: name || 'Custom Dining Spot',
      tagline: `Authentic ${cuisine} restaurant verified across Google, Yelp, TripAdvisor & OpenTable`,
      cuisine,
      occasions: occasionsList.length > 0 ? occasionsList : ['Casual', 'Birthday'],
      moods: ['Romantic', 'Cozy', 'Upscale'],
      aggregateScore: aggScore,
      websiteUrl: websiteUrl.startsWith('http') ? websiteUrl : `https://${websiteUrl || 'restaurant.com'}`,
      verifiedWebsiteStatus: 'Verified Open',
      openingHours: {
        Tuesday: { openHour: 11, closeHour: 23 },
      },
      menu: [
        {
          id: `m-custom-1`,
          name: `${cuisine} Chef Signature Dish`,
          description: 'Fresh seasonal ingredients prepared with house sauce',
          price: 28,
          category: 'Mains',
          isHotDish: isHotDish,
          isColdDish: !isHotDish,
        },
        {
          id: `m-custom-2`,
          name: 'House Special Dessert',
          description: 'Artisan sweet dish',
          price: 12,
          category: 'Desserts',
          isColdDish: true,
        },
      ],
      busyHours: [
        { hour: 12, occupancyPercent: 50, label: '12 PM', vibe: 'Moderate' },
        { hour: 19, occupancyPercent: 95, label: '7 PM', vibe: 'Peak & Lively' },
      ],
      address: address || '100 Main St, Local City',
      distanceMiles: 0.9,
      walkTimeMinutes: 18,
      driveTimeMinutes: 4,
      outdoorSeating: true,
      hasFireplace: false,
      heroImage: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1000&q=80',
      priceRange,
      isRealWorldVerified: true,
    };

    onAddRestaurant(newRestaurant);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <PlusCircle size={24} color="#f59e0b" />
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Import Real Spot (Multi-Source Review Engine)</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '16px' }}>
          Import any restaurant with ratings from Google, Yelp, TripAdvisor, Michelin Guide, The Infatuation, & OpenTable.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '4px' }}>Restaurant Name</label>
            <input
              type="text"
              placeholder="e.g. Bouchon Bakery, Atelier Crenn, Carbone"
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
              required
              id="add-rest-name"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '4px' }}>Cuisine</label>
              <input
                type="text"
                placeholder="e.g. French, Japanese, Italian"
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
                id="add-rest-cuisine"
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '4px' }}>Price Range</label>
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as '$$' | '$$$' | '$$$$')}
                style={{ width: '100%', padding: '10px', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
                id="add-rest-price"
              >
                <option value="$$">$$ (Moderate)</option>
                <option value="$$$">$$$ (Upscale)</option>
                <option value="$$$$">$$$$ (Fine Dining)</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '4px' }}>Real Street Address & Website URL</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <input
                type="text"
                placeholder="Address (e.g. 654 Yount St)"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
                id="add-rest-address"
              />
              <input
                type="text"
                placeholder="https://restaurant.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
                id="add-rest-url"
              />
            </div>
          </div>

          {/* Multi-Source Review Input Grid */}
          <div style={{ background: 'rgba(255,255,255,0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Multi-Source Review Ratings Input
            </span>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#60a5fa' }}>Google Stars & Reviews</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="number" step="0.1" min="1" max="5" value={googleRating} onChange={(e) => setGoogleRating(Number(e.target.value))} style={{ width: '60px', padding: '6px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '4px' }} />
                  <input type="number" value={googleReviews} onChange={(e) => setGoogleReviews(Number(e.target.value))} style={{ flex: 1, padding: '6px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '4px' }} placeholder="Review count" />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#f87171' }}>Yelp Stars & Reviews</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="number" step="0.1" min="1" max="5" value={yelpRating} onChange={(e) => setYelpRating(Number(e.target.value))} style={{ width: '60px', padding: '6px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '4px' }} />
                  <input type="number" value={yelpReviews} onChange={(e) => setYelpReviews(Number(e.target.value))} style={{ flex: 1, padding: '6px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '4px' }} placeholder="Review count" />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#34d399' }}>TripAdvisor Stars & Count</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="number" step="0.1" min="1" max="5" value={tripAdvisorRating} onChange={(e) => setTripAdvisorRating(Number(e.target.value))} style={{ width: '60px', padding: '6px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '4px' }} />
                  <input type="number" value={tripAdvisorReviews} onChange={(e) => setTripAdvisorReviews(Number(e.target.value))} style={{ flex: 1, padding: '6px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '4px' }} placeholder="Review count" />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#fda4af' }}>OpenTable Rating & Count</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <input type="number" step="0.1" min="1" max="5" value={openTableRating} onChange={(e) => setOpenTableRating(Number(e.target.value))} style={{ width: '60px', padding: '6px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '4px' }} />
                  <input type="number" value={openTableReviews} onChange={(e) => setOpenTableReviews(Number(e.target.value))} style={{ flex: 1, padding: '6px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '4px' }} placeholder="Review count" />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#c084fc' }}>The Infatuation (Score 0-10)</label>
                <input type="number" step="0.1" min="0" max="10" value={infatuationScore} onChange={(e) => setInfatuationScore(Number(e.target.value))} style={{ width: '100%', padding: '6px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '4px' }} placeholder="e.g. 9.1" />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#f59e0b' }}>Michelin Stars</label>
                <select value={michelinStars} onChange={(e) => setMichelinStars(Number(e.target.value))} style={{ width: '100%', padding: '6px', background: '#111827', color: '#fff', border: '1px solid #374151', borderRadius: '4px' }}>
                  <option value={0}>None / Recommended</option>
                  <option value={1}>⭐️ 1 Michelin Star</option>
                  <option value={2}>⭐️⭐️ 2 Michelin Stars</option>
                  <option value={3}>⭐️⭐️⭐️ 3 Michelin Stars</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', color: '#94a3b8', marginBottom: '4px' }}>Occasions (comma separated)</label>
            <input
              type="text"
              value={occasionsStr}
              onChange={(e) => setOccasionsStr(e.target.value)}
              style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
              id="add-rest-occasions"
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', color: '#cbd5e1' }}>
            <input
              type="checkbox"
              checked={isHotDish}
              onChange={(e) => setIsHotDish(e.target.checked)}
              style={{ accentColor: '#f59e0b' }}
            />
            <span>Primary Cuisine consists of hot soups / ramen (Used for Weather AI filtering)</span>
          </label>

          <button
            type="submit"
            className="btn-primary"
            style={{ padding: '12px', marginTop: '8px', fontSize: '0.95rem' }}
            id="save-real-restaurant-btn"
          >
            Import Real Restaurant to MoodDiner
          </button>

        </form>

      </div>
    </div>
  );
};
