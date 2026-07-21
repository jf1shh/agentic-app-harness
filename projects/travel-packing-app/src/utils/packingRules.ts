import { PackingItem } from '../types';

export const generatePackingList = (
  destination: string,
  days: number,
  activities: string[]
): PackingItem[] => {
  const items: PackingItem[] = [];
  const addItem = (name: string, category: string, quantity: number = 1) => {
    items.push({ id: crypto.randomUUID(), name, category, isPacked: false, quantity });
  };

  // Base items (per day)
  addItem('Underwear', 'Clothing', days);
  addItem('Socks', 'Clothing', days);
  addItem('T-Shirts / Tops', 'Clothing', days);
  addItem('Pants / Shorts', 'Clothing', Math.max(1, Math.floor(days / 2)));
  addItem('Toothbrush', 'Toiletries', 1);
  addItem('Toothpaste', 'Toiletries', 1);
  addItem('Deodorant', 'Toiletries', 1);
  addItem('Phone Charger', 'Electronics', 1);
  
  if (activities.includes('swimming')) {
    addItem('Swimsuit', 'Activities', 1);
    addItem('Beach Towel', 'Activities', 1);
    addItem('Sunscreen', 'Activities', 1);
  }
  
  if (activities.includes('hiking')) {
    addItem('Hiking Boots', 'Activities', 1);
    addItem('Water Bottle', 'Activities', 1);
    addItem('Trail Mix', 'Activities', 1);
  }

  if (activities.includes('formal')) {
    addItem('Formal Outfit', 'Activities', 1);
    addItem('Dress Shoes', 'Activities', 1);
  }

  return items;
};
