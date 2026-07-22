import React, { useState, useEffect } from 'react';
import { X, Star, MapPin, Footprints, Car, CheckCircle2, Clock, Utensils, BarChart3, Calendar, ShieldCheck, AlertTriangle } from 'lucide-react';
import { Restaurant, WeatherCondition, Reservation, MenuItem } from '../types';
import { evaluateWeatherSuitability } from '../utils/weatherEngine';
import { formatOpeningHours } from '../utils/openStatus';

type TabType = 'overview' | 'menu' | 'busy' | 'book';

interface RestaurantModalProps {
  restaurant: Restaurant | null;
  weather: WeatherCondition;
  initialTab?: TabType;
  onClose: () => void;
  onBookReservation: (reservation: Omit<Reservation, 'id' | 'createdAt' | 'status'>) => void;
}

export const RestaurantModal: React.FC<RestaurantModalProps> = ({
  restaurant,
  weather,
  initialTab = 'overview',
  onClose,
  onBookReservation,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(initialTab);
  const [selectedMenuCategory, setSelectedMenuCategory] = useState<string>('All');
  
  // Booking Form State
  const [bookingDate, setBookingDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [bookingTime, setBookingTime] = useState<string>('19:00');
  const [partySize, setPartySize] = useState<number>(2);
  const [occasion, setOccasion] = useState<string>('Anniversary');
  const [seatingPreference, setSeatingPreference] = useState<'Indoor' | 'Outdoor' | 'Window' | 'Booth'>('Outdoor');
  const [specialRequests, setSpecialRequests] = useState<string>('');
  const [bookingSuccess, setBookingSuccess] = useState<boolean>(false);

  useEffect(() => {
    setActiveTab(initialTab);
    setBookingSuccess(false);
    if (restaurant?.occasions?.[0]) {
      setOccasion(restaurant.occasions[0]);
    }
  }, [initialTab, restaurant]);

  if (!restaurant) return null;

  const weatherResult = evaluateWeatherSuitability(restaurant, weather);
  const isSummer = weather.season === 'Summer';
  const agg = restaurant.aggregateScore;

  const menuCategories = ['All', 'Appetizers', 'Mains', 'Desserts', 'Drinks'];
  const filteredMenuItems = selectedMenuCategory === 'All'
    ? restaurant.menu
    : restaurant.menu.filter((item) => item.category === selectedMenuCategory);

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onBookReservation({
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      date: bookingDate,
      time: bookingTime,
      partySize,
      occasion,
      seatingPreference,
      specialRequests,
    });
    setBookingSuccess(true);
  };

  const tabs: { id: TabType; label: string; icon: typeof Star }[] = [
    { id: 'overview', label: 'Multi-Source Scores', icon: Star },
    { id: 'menu', label: 'Website Menu', icon: Utensils },
    { id: 'busy', label: 'Popular Times', icon: BarChart3 },
    { id: 'book', label: 'Reserve Table', icon: Calendar },
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '850px' }}>
        
        {/* Modal Header Banner */}
        <div style={{ position: 'relative', height: '200px', width: '100%' }}>
          <img src={restaurant.heroImage} alt={restaurant.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #111827 0%, transparent 80%)' }} />
          <button
            onClick={onClose}
            style={{ position: 'absolute', top: '16px', right: '16px', background: 'rgba(0,0,0,0.6)', border: 'none', color: '#fff', padding: '8px', borderRadius: '50%', cursor: 'pointer' }}
          >
            <X size={20} />
          </button>
          
          <div style={{ position: 'absolute', bottom: '16px', left: '24px', right: '24px' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc' }}>{restaurant.name}</h2>
            <p style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>{restaurant.tagline}</p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{ display: 'flex', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', padding: '0 24px', gap: '8px', background: '#0b0f19' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setBookingSuccess(false); }}
                style={{
                  background: 'none',
                  border: 'none',
                  borderBottom: isActive ? '2px solid #f59e0b' : '2px solid transparent',
                  color: isActive ? '#f59e0b' : '#94a3b8',
                  padding: '14px 16px',
                  fontWeight: 600,
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
                id={`tab-${tab.id}`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div style={{ padding: '24px' }}>
          
          {/* TAB 1: OVERVIEW & MULTI-SOURCE SCORES */}
          {activeTab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
              {/* Multi-Source Aggregate Panel */}
              <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', padding: '18px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
                      Unified Multi-Source Rating
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px' }}>
                      <Star size={26} fill="#f59e0b" color="#f59e0b" />
                      <span style={{ fontSize: '2rem', fontWeight: 800 }}>{agg.compositeScore}</span>
                      <span style={{ color: '#94a3b8', fontSize: '0.9rem' }}>/ 5.0 Composite</span>
                    </div>
                  </div>

                  {/* Sources Grid */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px' }}>
                    <div className="badge badge-google" style={{ padding: '6px 10px' }}>
                      Google: {agg.google.rating}★ ({agg.google.reviewCount.toLocaleString()})
                    </div>
                    <div className="badge badge-yelp" style={{ padding: '6px 10px' }}>
                      Yelp: {agg.yelp.rating}★ ({agg.yelp.reviewCount.toLocaleString()})
                    </div>
                    {agg.tripAdvisor && (
                      <div className="badge" style={{ background: 'rgba(52, 211, 153, 0.15)', color: '#34d399', border: '1px solid rgba(52, 211, 153, 0.3)', padding: '6px 10px' }}>
                        TripAdvisor: {agg.tripAdvisor.rating}★ ({agg.tripAdvisor.reviewCount.toLocaleString()})
                      </div>
                    )}
                    {agg.openTable && (
                      <div className="badge" style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#fda4af', border: '1px solid rgba(244, 63, 94, 0.3)', padding: '6px 10px' }}>
                        OpenTable: {agg.openTable.rating}★ ({agg.openTable.reviewCount.toLocaleString()})
                      </div>
                    )}
                    {agg.infatuationScore && (
                      <div className="badge" style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', border: '1px solid rgba(139, 92, 246, 0.3)', padding: '6px 10px' }}>
                        Infatuation: {agg.infatuationScore}/10
                      </div>
                    )}
                    {agg.michelin?.stars && (
                      <div className="badge" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.4)', padding: '6px 10px' }}>
                        Michelin {agg.michelin.stars}★
                      </div>
                    )}
                  </div>
                </div>

                <p style={{ fontSize: '0.88rem', color: '#cbd5e1', fontStyle: 'italic', background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '6px' }}>
                  "{agg.sentimentSummary}"
                </p>
              </div>

              {/* Weather Recommendation Note */}
              <div className={weatherResult.isWeatherDiscouraged ? 'badge-weather-warn' : 'badge-weather-boost'} style={{ borderRadius: '10px', padding: '14px', display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                {weatherResult.isWeatherDiscouraged ? <AlertTriangle size={20} style={{ flexShrink: 0 }} /> : <ShieldCheck size={20} style={{ flexShrink: 0 }} />}
                <div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                    AI Weather Suitability: {weatherResult.weatherMatchScore}% Match
                  </div>
                  <p style={{ fontSize: '0.85rem', marginTop: '2px' }}>{weatherResult.weatherNote}</p>
                </div>
              </div>

              {/* Location & Operating Details */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <MapPin size={16} color="#f59e0b" /> Address & Distance Radius
                  </div>
                  <div style={{ fontWeight: 600 }}>{restaurant.address}</div>
                  <div style={{ fontSize: '0.85rem', color: '#cbd5e1', marginTop: '6px', display: 'flex', gap: '12px' }}>
                    <span><Footprints size={14} color="#10b981" /> {restaurant.walkTimeMinutes} mins walk</span>
                    <span><Car size={14} color="#3b82f6" /> {restaurant.driveTimeMinutes} mins drive</span>
                  </div>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                    <Clock size={16} color="#10b981" /> Website Verified Hours
                  </div>
                  <div style={{ fontWeight: 600, color: '#34d399' }}>Today (Tuesday): {formatOpeningHours(restaurant, 'Tuesday')}</div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '4px' }}>
                    Website status verified live via automated scheduler.
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: MENU */}
          {activeTab === 'menu' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                  Extracted live from <a href={restaurant.websiteUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa' }}>{restaurant.websiteUrl}</a>
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {menuCategories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedMenuCategory(cat)}
                      className={`glass-pill ${selectedMenuCategory === cat ? 'active' : ''}`}
                      style={{ padding: '4px 12px', fontSize: '0.8rem' }}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {filteredMenuItems.map((item: MenuItem) => {
                  const isHotDishDiscouraged = isSummer && item.isHotDish;
                  const isColdDishBoosted = isSummer && item.isColdDish;

                  return (
                    <div
                      key={item.id}
                      style={{
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        borderRadius: '10px',
                        padding: '14px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div style={{ flex: 1, paddingRight: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700, fontSize: '1rem', color: '#f8fafc' }}>{item.name}</span>
                          
                          {/* Weather tags for menu item */}
                          {isHotDishDiscouraged && (
                            <span style={{ background: 'rgba(244, 63, 94, 0.2)', color: '#fda4af', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px' }}>
                              ⚠️ Hot Dish (Discouraged in 92°F Summer)
                            </span>
                          )}
                          {isColdDishBoosted && (
                            <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px' }}>
                              🧊 Recommended Summer Refreshment
                            </span>
                          )}

                          {item.dietary?.map((d) => (
                            <span key={d} style={{ background: 'rgba(139, 92, 246, 0.2)', color: '#c084fc', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px' }}>
                              {d}
                            </span>
                          ))}
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '4px' }}>{item.description}</p>
                      </div>

                      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#f59e0b' }}>
                        ${item.price.toFixed(2)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: POPULAR TIMES & BUSY HEATMAP */}
          {activeTab === 'busy' && (
            <div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '6px' }}>Hourly Popularity & Busy Heatmap</h4>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '20px' }}>
                Analyze traffic trends to pick the ideal arrival time for your desired dining vibe.
              </p>

              <div style={{ display: 'flex', alignItems: 'flex-end', height: '180px', gap: '10px', background: 'rgba(0,0,0,0.3)', padding: '20px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                {restaurant.busyHours.map((hourData) => {
                  const isPeak = hourData.occupancyPercent >= 80;
                  const barColor = isPeak ? '#f43f5e' : hourData.occupancyPercent >= 50 ? '#f59e0b' : '#10b981';

                  return (
                    <div key={hourData.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%' }}>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginBottom: '4px' }}>{hourData.occupancyPercent}%</span>
                      <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                        <div
                          style={{
                            width: '80%',
                            height: `${hourData.occupancyPercent}%`,
                            backgroundColor: barColor,
                            borderRadius: '4px 4px 0 0',
                            transition: 'height 0.3s ease',
                          }}
                          title={`${hourData.label}: ${hourData.occupancyPercent}% Occupancy (${hourData.vibe})`}
                        />
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#cbd5e1', marginTop: '6px' }}>{hourData.label}</span>
                    </div>
                  );
                })}
              </div>

              <div style={{ marginTop: '20px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: '#34d399', fontSize: '0.9rem' }}>💡 Best for Quiet & Intimate Conversation</div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '4px' }}>
                    Recommended Visit: <strong>5:00 PM - 6:00 PM</strong> or <strong>9:30 PM</strong> (Under 55% occupancy).
                  </div>
                </div>

                <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '10px', padding: '14px' }}>
                  <div style={{ fontWeight: 700, color: '#fda4af', fontSize: '0.9rem' }}>🔥 Peak Energy & High Atmosphere</div>
                  <div style={{ fontSize: '0.82rem', color: '#cbd5e1', marginTop: '4px' }}>
                    Peak Hours: <strong>7:00 PM - 8:30 PM</strong> (Reserve in advance!).
                  </div>
                </div>
              </div>

            </div>
          )}

          {/* TAB 4: RESERVE TABLE */}
          {activeTab === 'book' && (
            <div>
              {bookingSuccess ? (
                <div style={{ textAlign: 'center', padding: '32px 16px' }}>
                  <div style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto' }}>
                    <CheckCircle2 size={36} />
                  </div>
                  <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#34d399', marginBottom: '8px' }}>
                    Reservation Confirmed!
                  </h3>
                  <p style={{ color: '#cbd5e1', fontSize: '0.95rem', marginBottom: '20px' }}>
                    Table reserved at <strong>{restaurant.name}</strong> for <strong>{partySize} guests</strong> on <strong>{bookingDate}</strong> at <strong>{bookingTime}</strong>.
                  </p>
                  <button onClick={() => setActiveTab('overview')} className="btn-secondary" id="btn-back-overview">
                    View Reservation Summary
                  </button>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Date</label>
                      <input
                        type="date"
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
                        required
                        id="booking-date-input"
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Time Slot</label>
                      <select
                        value={bookingTime}
                        onChange={(e) => setBookingTime(e.target.value)}
                        style={{ width: '100%', padding: '10px', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
                        id="booking-time-select"
                      >
                        <option value="17:00">5:00 PM (Quiet & Intimate)</option>
                        <option value="18:00">6:00 PM (Moderate)</option>
                        <option value="19:00">7:00 PM (Prime Dinner)</option>
                        <option value="20:00">8:00 PM (Prime Dinner)</option>
                        <option value="21:00">9:00 PM (Late Night)</option>
                      </select>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Party Size</label>
                      <select
                        value={partySize}
                        onChange={(e) => setPartySize(Number(e.target.value))}
                        style={{ width: '100%', padding: '10px', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
                        id="booking-party-select"
                      >
                        {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                          <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Occasion</label>
                      <select
                        value={occasion}
                        onChange={(e) => setOccasion(e.target.value)}
                        style={{ width: '100%', padding: '10px', background: '#1f2937', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff' }}
                        id="booking-occasion-select"
                      >
                        {['Anniversary', 'Birthday', 'First Date', 'Business Dinner', 'Casual Dining'].map((o) => (
                          <option key={o} value={o}>{o}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Seating Preference</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      {(['Outdoor', 'Indoor', 'Window', 'Booth'] as const).map((pref) => (
                        <button
                          type="button"
                          key={pref}
                          onClick={() => setSeatingPreference(pref)}
                          className={`glass-pill ${seatingPreference === pref ? 'active' : ''}`}
                          style={{ flex: 1, padding: '8px' }}
                          id={`seating-pref-${pref.toLowerCase()}`}
                        >
                          {pref}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '0.85rem', color: '#94a3b8', marginBottom: '6px' }}>Special Requests / Notes</label>
                    <textarea
                      value={specialRequests}
                      onChange={(e) => setSpecialRequests(e.target.value)}
                      placeholder="e.g. Anniversary candle, window view, allergy notes..."
                      style={{ width: '100%', padding: '10px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '8px', color: '#fff', height: '70px' }}
                      id="booking-notes-input"
                    />
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ padding: '12px', fontSize: '1rem', marginTop: '8px' }}
                    id="submit-reservation-btn"
                  >
                    Confirm Instant Booking
                  </button>

                </form>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
