import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { FilterBar } from './components/FilterBar';
import { RestaurantCard } from './components/RestaurantCard';
import { RestaurantModal } from './components/RestaurantModal';
import { BookingsModal } from './components/BookingsModal';
import { WeatherWidgetModal } from './components/WeatherWidget';
import { AddRealRestaurantModal } from './components/AddRealRestaurantModal';
import { PRESET_WEATHER } from './utils/weatherEngine';
import { INITIAL_RESTAURANTS } from './data/restaurantsData';
import { Restaurant, WeatherCondition, Reservation, TransportMode } from './types';
import { evaluateWeatherSuitability } from './utils/weatherEngine';
import { isRestaurantOpenNow } from './utils/openStatus';
import { Sun, AlertCircle } from 'lucide-react';
import { MonetizationProvider } from './lib/monetization/MonetizationContext';
import { ProPaywallModal } from './components/ProPaywallModal';

export const AppContent: React.FC = () => {
  // State
  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    try {
      const customSaved = localStorage.getItem('mood_diner_custom_restaurants');
      if (customSaved) {
        const parsed = JSON.parse(customSaved);
        return [...parsed, ...INITIAL_RESTAURANTS];
      }
    } catch {
      // fallback
    }
    return INITIAL_RESTAURANTS;
  });

  const [weather, setWeather] = useState<WeatherCondition>(PRESET_WEATHER[0]); // Default Hot Summer 92°F
  const [selectedOccasion, setSelectedOccasion] = useState<string>('All');
  const [selectedMood, setSelectedMood] = useState<string>('All');
  const [transportMode, setTransportMode] = useState<TransportMode>('All');
  const [onlyOpenNow, setOnlyOpenNow] = useState<boolean>(false);

  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [modalInitialTab, setModalInitialTab] = useState<'overview' | 'menu' | 'busy' | 'book'>('overview');
  const [isWeatherModalOpen, setIsWeatherModalOpen] = useState<boolean>(false);
  const [isBookingsModalOpen, setIsBookingsModalOpen] = useState<boolean>(false);
  const [isAddRealModalOpen, setIsAddRealModalOpen] = useState<boolean>(false);

  const [reservations, setReservations] = useState<Reservation[]>(() => {
    try {
      const saved = localStorage.getItem('mood_diner_reservations');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mood_diner_reservations', JSON.stringify(reservations));
    } catch (e) {
      console.error(e);
    }
  }, [reservations]);

  const handleAddCustomRestaurant = (newRestaurant: Restaurant) => {
    setRestaurants((prev) => [newRestaurant, ...prev]);
    try {
      const existingCustom = JSON.parse(localStorage.getItem('mood_diner_custom_restaurants') || '[]');
      localStorage.setItem('mood_diner_custom_restaurants', JSON.stringify([newRestaurant, ...existingCustom]));
    } catch (e) {
      console.error(e);
    }
  };

  // Filter & Weather Ranking Logic
  const filteredRestaurants = restaurants
    .filter((r) => {
      if (selectedOccasion !== 'All' && !r.occasions.includes(selectedOccasion)) return false;
      if (selectedMood !== 'All' && !r.moods.includes(selectedMood)) return false;
      if (transportMode === 'Walking' && r.walkTimeMinutes > 15) return false;
      if (transportMode === 'Driving' && r.driveTimeMinutes > 10) return false;
      if (onlyOpenNow && !isRestaurantOpenNow(r)) return false;
      return true;
    })
    .sort((a, b) => {
      const scoreA = evaluateWeatherSuitability(a, weather).weatherMatchScore;
      const scoreB = evaluateWeatherSuitability(b, weather).weatherMatchScore;
      return scoreB - scoreA; // Higher weather match score first
    });

  const handleBookReservation = (resData: Omit<Reservation, 'id' | 'createdAt' | 'status'>) => {
    const newRes: Reservation = {
      ...resData,
      id: `res-${Date.now()}`,
      status: 'Confirmed',
      createdAt: new Date().toISOString(),
    };
    setReservations((prev) => [newRes, ...prev]);
  };

  const handleCancelReservation = (id: string) => {
    setReservations((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className={`app-container ${weather.season === 'Summer' ? 'weather-summer-bg' : weather.season === 'Winter' ? 'weather-winter-bg' : ''}`}>
      
      {/* Header Bar */}
      <Header
        weather={weather}
        reservationsCount={reservations.length}
        onOpenBookings={() => setIsBookingsModalOpen(true)}
        onToggleWeatherModal={() => setIsWeatherModalOpen(true)}
        onOpenAddRealModal={() => setIsAddRealModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="main-content">
        
        {/* Weather Intelligence Banner */}
        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.25)', borderRadius: '12px', padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Sun size={24} color="#f59e0b" />
            <div>
              <span style={{ fontWeight: 700, color: '#f59e0b', fontSize: '0.95rem' }}>
                AI Weather Guard Active ({weather.temperatureF}°F - {weather.condition} {weather.season}):
              </span>
              <span style={{ fontSize: '0.88rem', color: '#cbd5e1', marginLeft: '6px' }}>
                {weather.summary}
              </span>
            </div>
          </div>
          <button
            onClick={() => setIsWeatherModalOpen(true)}
            className="glass-pill"
            style={{ fontSize: '0.8rem', padding: '4px 12px' }}
            id="change-weather-btn"
          >
            Change Weather Preset
          </button>
        </div>

        {/* Filter Controls */}
        <FilterBar
          selectedOccasion={selectedOccasion}
          onSelectOccasion={setSelectedOccasion}
          selectedMood={selectedMood}
          onSelectMood={setSelectedMood}
          transportMode={transportMode}
          onSelectTransportMode={setTransportMode}
          onlyOpenNow={onlyOpenNow}
          onToggleOnlyOpenNow={setOnlyOpenNow}
        />

        {/* Results Counter & Active Filters Summary */}
        <div style={{ marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
            Showing <strong style={{ color: '#f8fafc' }}>{filteredRestaurants.length}</strong> real-world dining spots for occasion:{' '}
            <strong style={{ color: '#f59e0b' }}>{selectedOccasion}</strong>
          </div>
          {transportMode !== 'All' && (
            <span style={{ fontSize: '0.8rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.1)', padding: '2px 8px', borderRadius: '4px' }}>
              Radius Filter: {transportMode} Distance Only
            </span>
          )}
        </div>

        {/* Restaurants Card Grid */}
        {filteredRestaurants.length === 0 ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '60px 20px', marginTop: '24px' }}>
            <AlertCircle size={40} color="#f59e0b" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '6px' }}>No Restaurants Match Current Criteria</h3>
            <p style={{ fontSize: '0.9rem', color: '#94a3b8', marginBottom: '16px' }}>
              Try broadening your mood filter or transport radius to view more options.
            </p>
            <button
              onClick={() => { setSelectedOccasion('All'); setSelectedMood('All'); setTransportMode('All'); setOnlyOpenNow(false); }}
              className="btn-secondary"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          <div className="restaurant-grid">
            {filteredRestaurants.map((restaurant) => (
              <RestaurantCard
                key={restaurant.id}
                restaurant={restaurant}
                weather={weather}
                onSelect={(rest, tab) => {
                  setSelectedRestaurant(rest);
                  setModalInitialTab(tab || 'overview');
                }}
              />
            ))}
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', padding: '20px 24px', textAlign: 'center', fontSize: '0.8rem', color: '#64748b', marginTop: 'auto' }}>
        MoodDiner AI — Real-World Iconic Dining • Aggregating Yelp & Google Reviews • Real Website Verification & Weather Intelligence
      </footer>

      {/* Modals */}
      <RestaurantModal
        key={(selectedRestaurant?.id || 'none') + modalInitialTab}
        restaurant={selectedRestaurant}
        weather={weather}
        initialTab={modalInitialTab}
        onClose={() => setSelectedRestaurant(null)}
        onBookReservation={handleBookReservation}
      />

      <BookingsModal
        isOpen={isBookingsModalOpen}
        onClose={() => setIsBookingsModalOpen(false)}
        reservations={reservations}
        onCancelReservation={handleCancelReservation}
      />

      <WeatherWidgetModal
        weather={weather}
        onSelectWeatherPreset={setWeather}
        isOpen={isWeatherModalOpen}
        onClose={() => setIsWeatherModalOpen(false)}
      />

      <AddRealRestaurantModal
        isOpen={isAddRealModalOpen}
        onClose={() => setIsAddRealModalOpen(false)}
        onAddRestaurant={handleAddCustomRestaurant}
      />

      <ProPaywallModal />

    </div>
  );
};

export const App: React.FC = () => (
  <MonetizationProvider>
    <AppContent />
  </MonetizationProvider>
);
