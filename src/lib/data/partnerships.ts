import type {
  AttributionRules,
  ConnectionRequest,
  DealDirection,
  Message,
  Opportunity,
  Partnership,
  TransactionRules,
} from "../types";

const rules = (over: Partial<TransactionRules> = {}): TransactionRules => ({
  eligibleProducts: [],
  excludedSkus: ["GIFTCARD"],
  customers: "all",
  geoRestrictions: [],
  returnsPeriodDays: 30,
  lockingPeriodDays: 15,
  ...over,
});

const attribution = (over: Partial<AttributionRules> = {}): AttributionRules => ({
  windowDays: 30,
  method: "last_click",
  clickAttribution: true,
  promoCodeAttribution: false,
  ...over,
});

/* ------------------------------------------------------------------ */
/* Partnerships (all involve the demo organization, Lumen Labs)         */
/* ------------------------------------------------------------------ */

const dir = (d: Omit<DealDirection, "currency" | "attribution" | "rules"> & Partial<Pick<DealDirection, "attribution" | "rules">>): DealDirection => ({
  currency: "USD",
  attribution: attribution(),
  rules: rules(),
  ...d,
});

export const PARTNERSHIPS: Partnership[] = [
  {
    id: "p_voyago",
    name: "Lumen Labs × Voyago",
    brandAId: "lumen",
    brandBId: "voyago",
    stage: "Live",
    createdAt: "2026-04-14T14:00:00.000Z",
    updatedAt: "2026-09-18T20:12:00.000Z",
    summary:
      "Lumen glasses as a hands-free travel companion, promoted at Voyago booking confirmation and pre-trip email. Lumen promotes Voyago experiences to its owner base in return.",
    proposalStatus: "Accepted",
    owner: "Maya Okafor",
    nextStep: "Review Q3 performance and renew placement for Q4",
    directions: [
      dir({
        id: "d_voyago_to_lumen",
        promoterId: "voyago",
        payerId: "lumen",
        channelIds: ["ch_voyago_booking", "ch_voyago_email"],
        compensation: { model: "Hybrid", flatFeeCents: 1_000_000, flatFeeLabel: "launch fee", commissionBps: 1200 },
        paymentTerms: "net30",
      }),
      dir({
        id: "d_lumen_to_voyago",
        promoterId: "lumen",
        payerId: "voyago",
        channelIds: ["ch_lumen_email", "ch_lumen_app"],
        compensation: { model: "Commission", commissionBps: 600 },
        rules: rules({ customers: "new_only" }),
        paymentTerms: "net30",
      }),
    ],
  },
  {
    id: "p_pulse",
    name: "Lumen Labs × Pulse Fitness",
    brandAId: "lumen",
    brandBId: "pulse",
    stage: "Integration",
    createdAt: "2026-07-02T16:30:00.000Z",
    updatedAt: "2026-09-17T13:45:00.000Z",
    summary: "Pulse members get a workout-tracking bundle through the member app; Lumen owners receive a Pulse trial offer.",
    proposalStatus: "Accepted",
    owner: "Maya Okafor",
    nextStep: "Pulse engineering to install the conversion API by Sep 26",
    directions: [
      dir({
        id: "d_pulse_to_lumen",
        promoterId: "pulse",
        payerId: "lumen",
        channelIds: ["ch_pulse_app", "ch_pulse_email"],
        compensation: { model: "Commission", commissionBps: 1000 },
        paymentTerms: "net30",
      }),
      dir({
        id: "d_lumen_to_pulse",
        promoterId: "lumen",
        payerId: "pulse",
        channelIds: ["ch_lumen_post"],
        compensation: { model: "CPA", cpaCents: 2_500 },
        rules: rules({ customers: "new_only", returnsPeriodDays: 14 }),
        paymentTerms: "net30",
      }),
    ],
  },
  {
    id: "p_stage",
    name: "Lumen Labs × Stagecraft Live",
    brandAId: "lumen",
    brandBId: "stagecraft",
    stage: "Terms",
    createdAt: "2026-08-20T17:00:00.000Z",
    updatedAt: "2026-09-19T11:30:00.000Z",
    summary:
      "Hands-free concert capture and enhanced event experiences. Stagecraft places Lumen at ticket confirmation, pre-event email and venue activations.",
    proposalStatus: "Countered",
    owner: "Devon Reyes",
    nextStep: "Respond to Stagecraft's counter on the launch fee",
    directions: [
      dir({
        id: "d_stage_to_lumen",
        promoterId: "stagecraft",
        payerId: "lumen",
        channelIds: ["ch_stage_ticket", "ch_stage_preevent", "ch_stage_venue"],
        compensation: { model: "Hybrid", flatFeeCents: 5_000_000, flatFeeLabel: "campaign fee", commissionBps: 1000 },
        paymentTerms: "net45",
      }),
    ],
  },
  {
    id: "p_carry",
    name: "Lumen Labs × Carryon Co.",
    brandAId: "lumen",
    brandBId: "carryon",
    stage: "Proposal",
    createdAt: "2026-09-02T12:00:00.000Z",
    updatedAt: "2026-09-16T18:20:00.000Z",
    summary: "Cross-promotion: Carryon inserts Lumen in luggage orders; Lumen recommends Carryon on its post-purchase page.",
    proposalStatus: "Sent",
    owner: "Devon Reyes",
    nextStep: "Waiting on Carryon to review the proposal",
    directions: [
      dir({
        id: "d_carry_to_lumen",
        promoterId: "carryon",
        payerId: "lumen",
        channelIds: ["ch_carry_pack"],
        compensation: { model: "CPA", cpaCents: 3_000 },
        paymentTerms: "net30",
      }),
      dir({
        id: "d_lumen_to_carry",
        promoterId: "lumen",
        payerId: "carryon",
        channelIds: ["ch_lumen_post"],
        compensation: { model: "Commission", commissionBps: 1000 },
        paymentTerms: "net30",
      }),
    ],
  },
  {
    id: "p_halc",
    name: "Lumen Labs × Halcyon Stays",
    brandAId: "lumen",
    brandBId: "halcyon",
    stage: "Discussion",
    createdAt: "2026-09-15T15:00:00.000Z",
    updatedAt: "2026-09-18T09:05:00.000Z",
    summary: "Exploring in-room translation glasses for guests and a loyalty tier benefit.",
    proposalStatus: "None",
    owner: "Devon Reyes",
    nextStep: "Intro call Sep 24",
    directions: [],
  },
];

export const getPartnership = (id: string) => PARTNERSHIPS.find((p) => p.id === id);

/* ------------------------------------------------------------------ */
/* Opportunities                                                        */
/* ------------------------------------------------------------------ */

export const OPPORTUNITIES: Opportunity[] = [
  {
    id: "opp_lumen_travel",
    brandId: "lumen",
    title: "Travel Partner Program",
    summary: "Turn Lumen glasses into a hands-free travel assistant, translator and content-capture device.",
    concept:
      "Use AI glasses as a hands-free travel assistant, translator, tour guide and content-capture device — introduced at the moment a trip is booked.",
    lookingFor: ["Airlines", "Travel booking platforms", "Hotels", "Tours", "Experiences"],
    offering: ["Affiliate commission", "Product samples", "Co-marketing", "Social promotion", "Landing pages"],
    channelsWanted: ["Booking confirmation", "Email", "Loyalty", "App exposure"],
    models: ["Commission", "Hybrid", "Flat fee"],
    postedAt: "2026-08-28T14:00:00.000Z",
    applicants: 11,
    status: "Open",
  },
  {
    id: "opp_stage_sponsor",
    brandId: "stagecraft",
    title: "Fan Tech Showcase — Fall Tour",
    summary: "Featured activation across 20 venues and ticket confirmation for consumer-tech brands.",
    concept:
      "Give fans a reason to try a product at the show: on-site demo zones, ticket-confirmation placement and pre-event email features.",
    lookingFor: ["Wearables", "Audio & consumer tech", "Beverage", "Ride-hailing"],
    offering: ["Venue activation space", "Ticket confirmation placement", "Pre-event email", "Fan app push"],
    channelsWanted: ["Product samples", "Event staff", "Promo code"],
    models: ["Flat fee", "Hybrid"],
    postedAt: "2026-09-05T10:00:00.000Z",
    closesAt: "2026-10-15T00:00:00.000Z",
    applicants: 7,
    status: "Open",
  },
  {
    id: "opp_voyago_trip",
    brandId: "voyago",
    title: "Complete-the-Trip Marketplace",
    summary: "Booking-confirmation placements for luggage, connectivity, insurance and gear.",
    concept:
      "Travelers on the confirmation page are minutes from buying. We're curating a small set of brands that help them travel better.",
    lookingFor: ["Luggage", "Travel insurance", "Connectivity", "Wearables", "Experiences"],
    offering: ["Booking confirmation placement", "Pre-trip email", "Loyalty offers"],
    channelsWanted: ["Affiliate links", "Exclusive offers"],
    models: ["CPA", "Hybrid", "Revenue share"],
    postedAt: "2026-09-08T09:00:00.000Z",
    applicants: 23,
    status: "Open",
  },
  {
    id: "opp_pulse_recovery",
    brandId: "pulse",
    title: "Recovery & Wearables Bundle",
    summary: "Studio and app placements for wearables, sleep and recovery brands.",
    concept: "Members already track their workouts. Help them recover and measure it with the right products.",
    lookingFor: ["Wearables", "Sleep & recovery", "Nutrition"],
    offering: ["Member app placement", "Post-class email", "In-studio display", "Member pricing"],
    channelsWanted: ["Exclusive member offer", "Co-branded content"],
    models: ["Commission", "Hybrid"],
    postedAt: "2026-09-10T16:00:00.000Z",
    applicants: 5,
    status: "Open",
  },
  {
    id: "opp_halc_amenity",
    brandId: "halcyon",
    title: "In-Room Amenity Program",
    summary: "Curated wellness, beauty and tech products placed in rooms and offered to loyalty members.",
    concept: "Guests try a product in the room and buy through a QR code or member offer.",
    lookingFor: ["Wellness", "Beauty", "Wearables", "Home fragrance"],
    offering: ["In-room placement", "Lobby display", "Loyalty offer", "Pre-arrival email"],
    channelsWanted: ["Product samples", "Staff training"],
    models: ["Flat fee", "Revenue share"],
    postedAt: "2026-09-12T11:00:00.000Z",
    applicants: 9,
    status: "In review",
  },
  {
    id: "opp_north_roadtrip",
    brandId: "northbound",
    title: "Road-Trip Ecosystem",
    summary: "In-car and app placements for travel, lodging, outdoor and connectivity brands.",
    concept: "When an owner plans a trip in the vehicle app, surface the best places to stay, gear to bring and connectivity to stay online.",
    lookingFor: ["Hotels", "Outdoor gear", "Connectivity", "Insurance"],
    offering: ["In-car offer", "Vehicle app tile", "Service-center displays"],
    channelsWanted: ["Deep links", "API integration"],
    models: ["Flat fee", "CPL", "Hybrid"],
    postedAt: "2026-09-01T13:00:00.000Z",
    applicants: 14,
    status: "Open",
  },
];

export const getOpportunity = (id: string) => OPPORTUNITIES.find((o) => o.id === id);

/* ------------------------------------------------------------------ */
/* Connection requests                                                  */
/* ------------------------------------------------------------------ */

export const CONNECTION_REQUESTS: ConnectionRequest[] = [
  {
    id: "cr_1",
    fromBrandId: "roamly",
    toBrandId: "lumen",
    intro: "Hi Lumen team — Roamly is the eSIM leader for international travelers.",
    idea: "Bundle a Roamly data plan into Lumen's travel edition so glasses work everywhere on day one.",
    channelsOfInterest: ["ch_lumen_post", "ch_lumen_email"],
    structure: "CPA",
    createdAt: "2026-09-18T13:20:00.000Z",
    status: "Pending",
  },
  {
    id: "cr_2",
    fromBrandId: "trailhead",
    toBrandId: "lumen",
    intro: "Trailhead Outfitters here. We'd love to feature Lumen in our stores.",
    idea: "Hands-free trail capture displays in 60 stores, with a Trailhead-exclusive Lumen bundle.",
    channelsOfInterest: ["ch_lumen_app"],
    structure: "Hybrid",
    createdAt: "2026-09-17T10:05:00.000Z",
    status: "Pending",
  },
  {
    id: "cr_3",
    fromBrandId: "atlas",
    toBrandId: "lumen",
    intro: "Atlas Insure — embedded device protection.",
    idea: "Offer device protection on the Lumen checkout and post-purchase page.",
    channelsOfInterest: ["ch_lumen_post"],
    structure: "Revenue share",
    createdAt: "2026-09-14T09:40:00.000Z",
    status: "Question",
  },
  {
    id: "cr_4",
    fromBrandId: "lumen",
    toBrandId: "northbound",
    intro: "Lumen Labs — we'd love to be part of the Northbound road-trip experience.",
    idea: "A road-trip capture kit for Northbound owners with an in-car offer.",
    channelsOfInterest: ["ch_north_app"],
    structure: "Flat fee",
    createdAt: "2026-09-16T15:00:00.000Z",
    status: "Pending",
  },
];

/* ------------------------------------------------------------------ */
/* Deal Room messages                                                   */
/* ------------------------------------------------------------------ */

export const MESSAGES: Message[] = [
  { id: "m1", partnershipId: "p_stage", authorName: "Priya Shah", authorBrandId: "stagecraft", body: "Thanks for the proposal. Overall we love it. On the campaign fee: $50k is tough given the production costs on venue activations.", createdAt: "2026-09-18T16:40:00.000Z" },
  { id: "m2", partnershipId: "p_stage", authorName: "Devon Reyes", authorBrandId: "lumen", body: "Understood. What if we cover activation production directly and keep the fee at $50k, with commission up to 12% on ticket-confirmation sales?", createdAt: "2026-09-18T17:15:00.000Z" },
  { id: "m3", partnershipId: "p_stage", authorName: "Priya Shah", authorBrandId: "stagecraft", body: "That could work. I've sent a counter with the updated structure — can you review the attribution window? We'd like 45 days to cover on-sale to show date.", createdAt: "2026-09-19T11:30:00.000Z", attachments: [{ name: "Fall-tour-venues.pdf", size: "2.4 MB" }] },
  { id: "m3n", partnershipId: "p_stage", authorName: "Devon Reyes", authorBrandId: "lumen", body: "Internal: get finance sign-off on net45 before we accept.", createdAt: "2026-09-19T11:50:00.000Z", kind: "note" },
  { id: "m4", partnershipId: "p_voyago", authorName: "Sam Whitfield", authorBrandId: "voyago", body: "Q3 is tracking 18% above plan on the booking-confirmation card. The eSIM + glasses bundle creative is converting best.", createdAt: "2026-09-18T20:12:00.000Z" },
  { id: "m5", partnershipId: "p_voyago", authorName: "Maya Okafor", authorBrandId: "lumen", body: "Great news. Let's plan the Q4 refresh — can we test a holiday-travel variant in November?", createdAt: "2026-09-18T21:02:00.000Z" },
  { id: "m6", partnershipId: "p_pulse", authorName: "Jordan Lee", authorBrandId: "pulse", body: "Conversion API keys are in. Engineering will finish the server-side integration next week.", createdAt: "2026-09-17T13:45:00.000Z" },
  { id: "m7", partnershipId: "p_pulse", authorName: "System", authorBrandId: "lumen", body: "Tracking link created: Pulse member app — Home banner", createdAt: "2026-09-16T10:00:00.000Z", kind: "system" },
  { id: "m8", partnershipId: "p_carry", authorName: "Devon Reyes", authorBrandId: "lumen", body: "Proposal sent: CPA $30 for Carryon inserts; 10% commission for Lumen post-purchase referrals.", createdAt: "2026-09-16T18:20:00.000Z", kind: "system" },
  { id: "m9", partnershipId: "p_halc", authorName: "Devon Reyes", authorBrandId: "lumen", body: "Hi Halcyon team — excited to explore in-room translation glasses. Does Sep 24 at 2pm ET work for an intro call?", createdAt: "2026-09-18T09:05:00.000Z" },
];

export const messagesFor = (partnershipId: string) =>
  MESSAGES.filter((m) => m.partnershipId === partnershipId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
