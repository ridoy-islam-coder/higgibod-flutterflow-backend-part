export interface IPlan {
  name: string;
  price: number;
  currency?: string;
  interval: 'monthly' | 'yearly';
  features: string[];
  isPopular?: boolean;
  isActive?: boolean;
}