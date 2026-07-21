'use client';

import { useTripState } from '../hooks/useTripState';
import { generatePackingList } from '../utils/packingRules';
import TripForm from '../components/TripForm';
import PackingList from '../components/PackingList';
import { Trip } from '../types';

export default function Home() {
  const { trip, items, isLoaded, saveTrip, saveItems, toggleItem, clearTrip } = useTripState();

  if (!isLoaded) return null; // Hydration safe

  const handleTripSave = (newTrip: Trip) => {
    saveTrip(newTrip);
    const start = new Date(newTrip.startDate);
    const end = new Date(newTrip.endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include start day
    
    const newItems = generatePackingList(newTrip.destination, days, newTrip.activities);
    saveItems(newItems);
  };

  return (
    <main style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
      <header style={{ textAlign: 'center', marginBottom: '40px' }}>
        <h1 style={{ fontSize: '2.5rem', color: 'var(--primary)', marginBottom: '8px' }}>PackRight</h1>
        <p style={{ color: 'var(--text-muted)' }}>Smart travel packing lists based on your trip.</p>
      </header>

      {!trip ? (
        <TripForm onSave={handleTripSave} />
      ) : (
        <div>
          <div className="glass-panel" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h2 style={{ fontSize: '1.25rem' }}>Trip to {trip.destination}</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                {trip.startDate} to {trip.endDate}
              </p>
            </div>
            <button className="btn-secondary" onClick={clearTrip}>
              Start New Trip
            </button>
          </div>
          
          <PackingList items={items} onToggle={toggleItem} />
        </div>
      )}
    </main>
  );
}
