import React from 'react';
import { X, CalendarCheck, Users, Trash2 } from 'lucide-react';
import { Reservation } from '../types';

interface BookingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reservations: Reservation[];
  onCancelReservation: (id: string) => void;
}

export const BookingsModal: React.FC<BookingsModalProps> = ({
  isOpen,
  onClose,
  reservations,
  onCancelReservation,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '650px', padding: '24px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarCheck size={24} color="#f59e0b" />
            <h3 style={{ fontSize: '1.3rem', fontWeight: 800 }}>My Saved Reservations</h3>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
            <X size={20} />
          </button>
        </div>

        {reservations.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94a3b8' }}>
            <p style={{ fontSize: '1rem', marginBottom: '8px' }}>No active bookings yet.</p>
            <p style={{ fontSize: '0.85rem' }}>Find a restaurant and reserve a table to view your bookings here!</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {reservations.map((res) => (
              <div
                key={res.id}
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#f8fafc', marginBottom: '4px' }}>
                    {res.restaurantName}
                  </div>
                  <div style={{ fontSize: '0.85rem', color: '#f59e0b', fontWeight: 600, display: 'flex', gap: '12px' }}>
                    <span>📅 {res.date} at {res.time}</span>
                    <span><Users size={14} style={{ display: 'inline', verticalAlign: 'middle' }} /> {res.partySize} Guests</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '6px', display: 'flex', gap: '8px' }}>
                    <span>Occasion: {res.occasion}</span>
                    <span>•</span>
                    <span>Seating: {res.seatingPreference}</span>
                  </div>
                  {res.specialRequests && (
                    <div style={{ fontSize: '0.75rem', color: '#cbd5e1', fontStyle: 'italic', marginTop: '4px' }}>
                      "{res.specialRequests}"
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                  <span style={{ background: 'rgba(16, 185, 129, 0.2)', color: '#34d399', fontSize: '0.75rem', padding: '4px 8px', borderRadius: '6px', fontWeight: 700 }}>
                    Confirmed
                  </span>
                  <button
                    onClick={() => onCancelReservation(res.id)}
                    style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    id={`cancel-res-${res.id}`}
                  >
                    <Trash2 size={12} /> Cancel
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
};
