import { useState, useEffect } from 'react';
import { Trip, PackingItem } from '../types';

export const useTripState = () => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [items, setItems] = useState<PackingItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const savedTrip = localStorage.getItem('packright_trip');
    const savedItems = localStorage.getItem('packright_items');
    // eslint-disable-next-line
    if (savedTrip) setTrip(JSON.parse(savedTrip));
    // eslint-disable-next-line
    if (savedItems) setItems(JSON.parse(savedItems));
    // eslint-disable-next-line
    setIsLoaded(true);
  }, []);

  const saveTrip = (newTrip: Trip) => {
    setTrip(newTrip);
    localStorage.setItem('packright_trip', JSON.stringify(newTrip));
  };

  const saveItems = (newItems: PackingItem[]) => {
    setItems(newItems);
    localStorage.setItem('packright_items', JSON.stringify(newItems));
  };

  const toggleItem = (id: string) => {
    const newItems = items.map(item => 
      item.id === id ? { ...item, isPacked: !item.isPacked } : item
    );
    saveItems(newItems);
  };

  const clearTrip = () => {
    setTrip(null);
    setItems([]);
    localStorage.removeItem('packright_trip');
    localStorage.removeItem('packright_items');
  };

  return { trip, items, isLoaded, saveTrip, saveItems, toggleItem, clearTrip };
};
