// SPDX-License-Identifier: Apache-2.0
/**
 * TypeScript shapes for the JouwPrivacy app <-> server (BFF) contract.
 * The app never sees partner identifiers - the server strips them.
 */

// --- Errors -----------------------------------------------------------------

export type ApiErrorCode =
  | 'INVALID_CREDENTIALS'
  | 'MFA_REQUIRED'
  | 'MFA_INVALID'
  | 'TOKEN_EXPIRED'
  | 'CONFIRMATION_REQUIRED'
  | 'INVALID_REQUEST'
  | 'NOT_FOUND'
  | 'RATE_LIMITED'
  | 'UPSTREAM_UNAVAILABLE'
  | 'NETWORK';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

// --- Auth -------------------------------------------------------------------

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Session {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Login outcome (discriminated on `mfaRequired`). An account WITH 2FA gets a
 * short-lived `mfaToken` to exchange for a session on the 2FA step; an account
 * WITHOUT 2FA is handed a `session` directly and skips the second screen.
 */
export type LoginResponse =
  { mfaRequired: true; mfaToken: string } | { mfaRequired: false; session: Session };

export interface TwoFactorRequest {
  mfaToken: string;
  totp: string;
}

export interface RefreshResponse {
  accessToken: string;
  expiresIn: number;
}

export interface ConfirmResponse {
  confirmationToken: string;
}

/** Sensitive action a confirmation token authorises; the server requires it. */
export type ConfirmAction = 'payout' | 'account_patch';

/**
 * Re-confirmation request. An account WITH 2FA sends `totp` (a TOTP or recovery
 * code); an account WITHOUT 2FA sends `password`. `action` is always required.
 */
export interface ConfirmRequest {
  action: ConfirmAction;
  totp?: string;
  password?: string;
}

// --- Customer + subscriptions ----------------------------------------------

export interface Me {
  customerId: string;
  displayName: string;
  email: string;
  locale: 'nl' | 'en';
  twoFactorEnabled: boolean;
}

export type SubscriptionStatus = 'awaiting_activation' | 'active' | 'lapsed' | 'expired';

export interface Subscription {
  id: string;
  planName: string;
  status: SubscriptionStatus;
  msisdn: string;
  startDate: string; // YYYY-MM-DD
  endDate: string | null; // YYYY-MM-DD
  unlimited: boolean;
}

export interface UsageMetric {
  used: number;
  limit: number;
  unlimited: boolean;
  fairUse: boolean;
}

export interface Usage {
  lastUpdatedAt: string; // ISO
  data: UsageMetric; // in MB
  voice: UsageMetric; // in minutes
  sms: UsageMetric; // in count
}

// --- Orders -----------------------------------------------------------------

/** What was ordered. `hardware` is the only shippable type (phones, routers). */
export type OrderType = 'hardware' | 'sim' | 'subscription' | 'accessory';

/** Fulfilment status. Shipment-specific states are populated by Sendcloud later. */
export type OrderStatus = 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Order {
  id: string;
  type: OrderType;
  description: string;
  priceCents: number;
  currency: string;
  orderedAt: string; // ISO
  status: OrderStatus;
  invoiceId: string | null;
  deletionDate: string | null; // YYYY-MM-DD from retention matrix; null until EXPOSE_DELETION_DATES is enabled server-side
  retentionCategory: string;

  // Shipment fields - all populated later by Sendcloud, null until then. The UI
  // must null-guard every one and render the degraded "being processed" view
  // when they are absent (no fake tracking stepper, no invented statuses).
  trackingUrl: string | null;
  carrier: string | null;
  estimatedDelivery: string | null; // YYYY-MM-DD
  deliveredAt: string | null; // ISO
}

export interface InvoiceLink {
  url: string;
  expiresIn: number;
}

// --- Referral ---------------------------------------------------------------

export interface Referral {
  code: string;
  shareUrl: string;
  earnedCents: number;
  currency: string;
  payoutPending: boolean;
}

export interface PayoutRequest {
  confirmationToken: string;
  iban: string;
  accountHolder: string;
}

// --- Account ----------------------------------------------------------------

export interface PersonalInfo {
  firstName: string;
  lastName: string;
  email: string;
}

export interface DeliveryInfo {
  street: string;
  postalCode: string;
  city: string;
  country: string;
}

export interface Account {
  personal: PersonalInfo;
  delivery: DeliveryInfo;
  twoFactorEnabled: boolean;
}

export interface AccountPatch {
  confirmationToken: string;
  personal?: Partial<PersonalInfo>;
  delivery?: Partial<DeliveryInfo>;
  password?: { current: string; next: string };
}

// --- Support tickets (Storingen, §10) --------------------------------------

/**
 * Locked type enum (mirrors the server). Every type except `anders` MUST be
 * tied to an owned SIM; `anders` is account-level and SIM-optional.
 */
export type TicketType =
  'geen_bereik' | 'geen_data' | 'kan_niet_bellen' | 'kan_niet_sms' | 'anders';

/** Lifecycle: customer create owns `open`; an admin moves it forward. */
export type TicketStatus = 'open' | 'in_behandeling' | 'opgelost';

export interface Ticket {
  id: string; // opaque tkt_
  type: TicketType;
  status: TicketStatus;
  subscriptionId: string | null; // opaque sub_, never an ICCID/partner id
  description: string;
  adminResponse: string | null;
  startedAt: string | null; // YYYY-MM-DD or null
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface CreateTicketRequest {
  type: TicketType;
  description: string;
  /** Opaque sub_ id. Required for every type except `anders`. */
  subscriptionId?: string | null;
  startedAt?: string | null;
}

// --- Network status (§19) ---------------------------------------------------

/**
 * Our own opaque status vocabulary. The app never sees the network partner's
 * name or the upstream source - only this token (for colour) and the localized
 * `description` below (for the label).
 */
export type NetworkStatusIndicator =
  'operationeel' | 'verstoring' | 'storing' | 'onderhoud' | 'onbeschikbaar';

export interface NetworkStatus {
  indicator: NetworkStatusIndicator;
  description: { nl: string; en: string };
  updatedAt: string | null; // ISO, or null when no fresh status is available
}

// --- Client surface ---------------------------------------------------------

/** The full set of calls the app makes. Implemented by both mock and real clients. */
export interface ApiClient {
  login(req: LoginRequest): Promise<LoginResponse>;
  verifyTwoFactor(req: TwoFactorRequest): Promise<Session>;
  /** Disable 2FA on the current account. `totp` accepts a TOTP or recovery code. */
  disableTwoFactor(req: { totp: string }): Promise<void>;
  refresh(refreshToken: string): Promise<RefreshResponse>;
  logout(): Promise<void>;
  confirm(req: ConfirmRequest): Promise<ConfirmResponse>;

  getMe(): Promise<Me>;
  getSubscriptions(): Promise<Subscription[]>;
  getUsage(subscriptionId: string): Promise<Usage>;

  /**
   * Public operational status of our technical network partner (§19). No auth;
   * the app renders `description[lang]` and colours by `indicator`. Never exposes
   * the partner name or the upstream source.
   */
  getNetworkStatus(): Promise<NetworkStatus>;

  /**
   * The single order the BFF designates as relevant to the Home dashboard
   * (latest non-delivered hardware order; if all delivered, the most recent one
   * delivered within 24h; else none). The selection rule lives server-side; the
   * app just renders whatever is returned, or no order block when null.
   */
  getHomeRelevantOrder(): Promise<Order | null>;

  getOrders(): Promise<Order[]>;
  getInvoiceLink(orderId: string): Promise<InvoiceLink>;

  getReferral(): Promise<Referral>;
  requestPayout(req: PayoutRequest): Promise<{ status: 'pending' }>;

  getAccount(): Promise<Account>;
  updateAccount(patch: AccountPatch): Promise<Account>;

  getTickets(): Promise<Ticket[]>;
  createTicket(req: CreateTicketRequest): Promise<Ticket>;
}
