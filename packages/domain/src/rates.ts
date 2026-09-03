export const DELIVERABLE_PRICING_MODES = ['per_unit', 'per_30'] as const;

export type DeliverablePricingMode = (typeof DELIVERABLE_PRICING_MODES)[number];

export const ADDON_PRICING_MODES = ['flat', 'per_day', 'percentage'] as const;

export type AddonPricingMode = (typeof ADDON_PRICING_MODES)[number];
