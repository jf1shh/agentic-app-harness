export interface Trip {
  id: string;
  destination: string;
  startDate: string;
  endDate: string;
  activities: string[];
}

export interface PackingItem {
  id: string;
  name: string;
  category: string;
  isPacked: boolean;
  quantity: number;
}
