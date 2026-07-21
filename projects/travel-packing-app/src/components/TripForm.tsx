'use client';
import { useState } from 'react';
import { Trip } from '../types';

interface TripFormProps {
  onSave: (trip: Trip) => void;
}

export default function TripForm({ onSave }: TripFormProps) {
  const [destination, setDestination] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [activities, setActivities] = useState<string[]>([]);

  const availableActivities = [
    { id: 'swimming', label: 'Swimming' },
    { id: 'hiking', label: 'Hiking' },
    { id: 'formal', label: 'Formal Event' }
  ];

  const handleActivityToggle = (id: string) => {
    setActivities(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (new Date(endDate) < new Date(startDate)) {
      alert('End date must be after start date');
      return;
    }
    onSave({
      id: crypto.randomUUID(),
      destination,
      startDate,
      endDate,
      activities
    });
  };

  return (
    <form onSubmit={handleSubmit} className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h2>Plan Your Trip</h2>
      
      <div>
        <label htmlFor="destination" className="label">Destination</label>
        <input 
          id="destination"
          type="text" 
          required 
          className="input-field" 
          value={destination} 
          onChange={(e) => setDestination(e.target.value)} 
          placeholder="e.g. Hawaii"
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        <div>
          <label htmlFor="startDate" className="label">Start Date</label>
          <input 
            id="startDate"
            type="date" 
            required 
            className="input-field" 
            value={startDate} 
            onChange={(e) => setStartDate(e.target.value)} 
          />
        </div>
        <div>
          <label htmlFor="endDate" className="label">End Date</label>
          <input 
            id="endDate"
            type="date" 
            required 
            className="input-field" 
            value={endDate} 
            onChange={(e) => setEndDate(e.target.value)} 
            min={startDate}
          />
        </div>
      </div>

      <div>
        <label className="label">Planned Activities</label>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {availableActivities.map(act => (
            <button
              type="button"
              key={act.id}
              onClick={() => handleActivityToggle(act.id)}
              className={activities.includes(act.id) ? 'btn-primary' : 'btn-secondary'}
            >
              {act.label}
            </button>
          ))}
        </div>
      </div>

      <button type="submit" className="btn-primary" style={{ marginTop: '16px' }}>
        Generate Packing List
      </button>
    </form>
  );
}
