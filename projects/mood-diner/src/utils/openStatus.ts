import { Restaurant } from '../types';

export function isRestaurantOpenNow(
  restaurant: Restaurant,
  currentDay: string = 'Tuesday',
  currentHour: number = 13 // 1:00 PM default local test time
): boolean {
  const daySchedule = restaurant.openingHours[currentDay];
  if (!daySchedule) return false;

  const { openHour, closeHour } = daySchedule;

  // Handle late night closing (e.g., 17:00 to 2:00 AM next day)
  if (closeHour < openHour) {
    return currentHour >= openHour || currentHour < closeHour;
  }

  return currentHour >= openHour && currentHour < closeHour;
}

export function formatOpeningHours(restaurant: Restaurant, currentDay: string = 'Tuesday'): string {
  const schedule = restaurant.openingHours[currentDay];
  if (!schedule) return 'Closed today';

  const formatHour = (h: number) => {
    if (h === 0 || h === 24) return '12 AM';
    if (h === 12) return '12 PM';
    return h > 12 ? `${h - 12} PM` : `${h} AM`;
  };

  return `${formatHour(schedule.openHour)} - ${formatHour(schedule.closeHour)}`;
}
