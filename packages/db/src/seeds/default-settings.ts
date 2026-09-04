import type {
  addonRateItems,
  crewRateItems,
  deliverableRateItems,
} from '../schema';

type CrewRateItemInsert = typeof crewRateItems.$inferInsert;
type DeliverableRateItemInsert = typeof deliverableRateItems.$inferInsert;
type AddonRateItemInsert = typeof addonRateItems.$inferInsert;

export const DEFAULT_CREW_RATE_ITEMS = [
  {
    id: '53c33f29-b44d-4b4a-9f88-444986fdbcb2',
    name: 'Director',
    dayRateCents: 70_000,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'be702b2f-6a6b-4e70-9892-3e4c97329fd3',
    name: 'DP',
    dayRateCents: 45_000,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: '08433e07-e26d-4ac1-b063-385d484b84cb',
    name: 'Camera AC',
    dayRateCents: 20_000,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: '0d482428-fc83-4c3f-afe3-cf312622e8f7',
    name: 'Gaffer',
    dayRateCents: 30_000,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: '37e52ded-ca1a-4ae3-9144-544fd9504936',
    name: 'PA',
    dayRateCents: 12_000,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: '72592042-d78e-4863-8ced-ce5b046c2b1c',
    name: 'Sound Engineer',
    dayRateCents: 30_000,
    isActive: true,
    sortOrder: 5,
  },
  {
    id: '151dd523-9ba5-4329-8697-6d87559aebb9',
    name: 'Drone Operator',
    dayRateCents: 35_000,
    isActive: true,
    sortOrder: 6,
  },
  {
    id: 'f0a57c2c-321b-4552-8da6-b39e1ba2a771',
    name: 'Makeup',
    dayRateCents: 25_000,
    isActive: true,
    sortOrder: 7,
  },
  {
    id: 'ab8a71f9-37f8-4e44-84c9-c2e816b358db',
    name: 'Stylist',
    dayRateCents: 25_000,
    isActive: true,
    sortOrder: 8,
  },
] as const satisfies readonly CrewRateItemInsert[];

export const DEFAULT_DELIVERABLE_RATE_ITEMS = [
  {
    id: 'bf151ee6-052f-4005-851d-5ebf1ed65e85',
    name: 'Reels',
    pricingMode: 'per_unit',
    unitPriceCents: 35_000,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'fa1f134d-0fe9-443d-9eca-a5584649b551',
    name: 'Campaign Video',
    pricingMode: 'per_unit',
    unitPriceCents: 200_000,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'e6b28c18-7d17-48aa-b3de-b6527a905e33',
    name: 'Stills (per 30)',
    pricingMode: 'per_30',
    unitPriceCents: 60_000,
    isActive: true,
    sortOrder: 2,
  },
] as const satisfies readonly DeliverableRateItemInsert[];

export const DEFAULT_ADDON_RATE_ITEMS = [
  {
    id: '55b1b80f-8a1e-49d2-93d5-df7bae67680d',
    name: 'Model/Talent',
    pricingMode: 'per_day',
    priceCents: 40_000,
    percentage: null,
    isActive: true,
    sortOrder: 0,
  },
  {
    id: 'ceba5fcb-8c33-467e-843f-c1b4b20e0222',
    name: 'Extra Revision',
    pricingMode: 'flat',
    priceCents: 20_000,
    percentage: null,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: '6db0c3b7-71b3-4bf2-b65b-9f4fb81b7e46',
    name: 'Motion Graphics',
    pricingMode: 'flat',
    priceCents: 60_000,
    percentage: null,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'a1f7603e-0bc1-4509-b9c7-c96a8dc4abba',
    name: 'Rush Delivery',
    pricingMode: 'percentage',
    priceCents: null,
    percentage: 25,
    isActive: true,
    sortOrder: 3,
  },
] as const satisfies readonly AddonRateItemInsert[];
