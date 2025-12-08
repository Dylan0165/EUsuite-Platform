import { create } from 'zustand';
import { plansAPI } from '../api/client';

export interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string;
  price_monthly_cents: number;
  price_yearly_cents: number;
  max_users: number;
  max_storage_gb: number;
  features: string[];
  is_active: boolean;
  is_popular: boolean;
  sort_order: number;
}

interface PlansState {
  plans: Plan[];
  selectedPlan: Plan | null;
  billingCycle: 'monthly' | 'yearly';
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchPlans: () => Promise<void>;
  selectPlan: (plan: Plan) => void;
  setBillingCycle: (cycle: 'monthly' | 'yearly') => void;
  clearSelection: () => void;
}

export const usePlansStore = create<PlansState>((set) => ({
  plans: [],
  selectedPlan: null,
  billingCycle: 'monthly',
  isLoading: false,
  error: null,

  fetchPlans: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await plansAPI.getAll();
      set({ plans: response.data, isLoading: false });
    } catch (error: any) {
      set({
        error: error.response?.data?.detail || 'Failed to fetch plans',
        isLoading: false,
      });
    }
  },

  selectPlan: (plan) => {
    set({ selectedPlan: plan });
  },

  setBillingCycle: (cycle) => {
    set({ billingCycle: cycle });
  },

  clearSelection: () => {
    set({ selectedPlan: null });
  },
}));

// Helper to format price
export const formatPrice = (cents: number): string => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
};

// Get price for billing cycle
export const getPlanPrice = (plan: Plan, cycle: 'monthly' | 'yearly'): number => {
  return cycle === 'yearly' ? plan.price_yearly_cents : plan.price_monthly_cents;
};

// Calculate monthly equivalent for yearly
export const getMonthlyEquivalent = (plan: Plan): number => {
  return Math.round(plan.price_yearly_cents / 12);
};

// Calculate savings percentage for yearly
export const getYearlySavings = (plan: Plan): number => {
  const monthlyTotal = plan.price_monthly_cents * 12;
  const yearlyTotal = plan.price_yearly_cents;
  return Math.round(((monthlyTotal - yearlyTotal) / monthlyTotal) * 100);
};
