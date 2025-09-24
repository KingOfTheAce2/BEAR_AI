// Mollie Payment Integration Types
// This file contains all TypeScript types for Mollie payment integration

export interface MollieAmount {
    currency: string;
    value: string;
}

export interface MollieAddress {
    streetAndNumber?: string;
    streetAdditional?: string;
    postalCode?: string;
    city?: string;
    region?: string;
    country?: string;
}

export interface MollieCustomer {
    id: string;
    mode: string;
    name: string;
    email: string;
    createdAt: string;
    locale?: string;
    metadata?: Record<string, string>;
    _links?: MollieLinks;
}

export interface MolliePayment {
    id: string;
    mode: string;
    createdAt: string;
    status: MolliePaymentStatus;
    isCancelable?: boolean;
    paidAt?: string;
    canceledAt?: string;
    expiresAt?: string;
    expiredAt?: string;
    failedAt?: string;
    amount: MollieAmount;
    amountRefunded?: MollieAmount;
    amountRemaining?: MollieAmount;
    amountCaptured?: MollieAmount;
    amountChargedBack?: MollieAmount;
    description: string;
    redirectUrl?: string;
    webhookUrl?: string;
    method?: MolliePaymentMethod;
    countryCode?: string;
    locale?: string;
    customerId?: string;
    sequenceType?: MollieSequenceType;
    mandateId?: string;
    subscriptionId?: string;
    orderId?: string;
    applicationFee?: MollieAmount;
    settlementAmount?: MollieAmount;
    settlementId?: string;
    metadata?: Record<string, string>;
    details?: MolliePaymentDetails;
    profileId?: string;
    routing?: MollieRouting[];
    _links?: MollieLinks;
}

export interface MollieSubscription {
    id: string;
    mode: string;
    createdAt: string;
    status: MollieSubscriptionStatus;
    amount: MollieAmount;
    times?: number;
    timesRemaining?: number;
    interval: string;
    startDate: string;
    nextPaymentDate?: string;
    description: string;
    method?: MolliePaymentMethod;
    mandateId: string;
    canceledAt?: string;
    webhookUrl?: string;
    applicationFee?: MollieAmount;
    metadata?: Record<string, string>;
    _links?: MollieLinks;
}

export interface MollieMandate {
    id: string;
    mode: string;
    status: MollieMandateStatus;
    method: MolliePaymentMethod;
    details?: MollieMandateDetails;
    mandateReference?: string;
    signatureDate?: string;
    createdAt: string;
    _links?: MollieLinks;
}

export interface MollieRefund {
    id: string;
    amount: MollieAmount;
    status: MollieRefundStatus;
    createdAt: string;
    description: string;
    paymentId: string;
    orderId?: string;
    lines?: MollieOrderLine[];
    settlementAmount?: MollieAmount;
    settlementId?: string;
    metadata?: Record<string, string>;
    _links?: MollieLinks;
}

export interface MollieChargeback {
    id: string;
    amount: MollieAmount;
    settlementAmount: MollieAmount;
    createdAt: string;
    reversedAt?: string;
    paymentId: string;
    _links?: MollieLinks;
}

export interface MollieOrder {
    id: string;
    profileId: string;
    method?: MolliePaymentMethod;
    mode: string;
    amount: MollieAmount;
    status: MollieOrderStatus;
    isCancelable: boolean;
    metadata?: Record<string, string>;
    createdAt: string;
    expiresAt?: string;
    expiredAt?: string;
    paidAt?: string;
    authorizedAt?: string;
    canceledAt?: string;
    completedAt?: string;
    description: string;
    orderNumber: string;
    locale: string;
    billingAddress?: MollieAddress;
    shippingAddress?: MollieAddress;
    redirectUrl?: string;
    webhookUrl?: string;
    lines: MollieOrderLine[];
    _embedded?: {
        payments?: MolliePayment[];
        refunds?: MollieRefund[];
    };
    _links?: MollieLinks;
}

export interface MollieOrderLine {
    id?: string;
    orderId?: string;
    name: string;
    sku?: string;
    type: MollieOrderLineType;
    status?: MollieOrderLineStatus;
    metadata?: Record<string, string>;
    isCancelable?: boolean;
    quantity: number;
    quantityShipped?: number;
    amountShipped?: MollieAmount;
    quantityRefunded?: number;
    amountRefunded?: MollieAmount;
    quantityCanceled?: number;
    amountCanceled?: MollieAmount;
    shippableQuantity?: number;
    refundableQuantity?: number;
    cancelableQuantity?: number;
    unitPrice: MollieAmount;
    discountAmount?: MollieAmount;
    totalAmount: MollieAmount;
    vatRate: string;
    vatAmount: MollieAmount;
    imageUrl?: string;
    productUrl?: string;
    createdAt?: string;
    _links?: MollieLinks;
}

export interface MolliePaymentMethod {
    id: string;
    description: string;
    minimumAmount?: MollieAmount;
    maximumAmount?: MollieAmount;
    image: MollieImage;
    pricing?: MolliePricing[];
    _links?: MollieLinks;
}

export interface MollieImage {
    size1x: string;
    size2x: string;
    svg: string;
}

export interface MolliePricing {
    description: string;
    variable: string;
    fixed: MollieAmount;
}

export interface MollieIssuer {
    id: string;
    name: string;
    method: string;
    image: MollieImage;
    _links?: MollieLinks;
}

export interface MollieProfile {
    id: string;
    mode: string;
    name: string;
    website: string;
    email: string;
    phone: string;
    categoryCode: number;
    status: MollieProfileStatus;
    review: MollieProfileReview;
    createdAt: string;
    _links?: MollieLinks;
}

export interface MollieProfileReview {
    status: MollieProfileReviewStatus;
}

export interface MollieRouting {
    type: string;
    target: string;
    amount: MollieAmount;
}

export interface MollieLinks {
    self?: MollieLink;
    checkout?: MollieLink;
    changePaymentState?: MollieLink;
    refunds?: MollieLink;
    chargebacks?: MollieLink;
    captures?: MollieLink;
    settlement?: MollieLink;
    documentation?: MollieLink;
    mandate?: MollieLink;
    subscription?: MollieLink;
    customer?: MollieLink;
    order?: MollieLink;
    payments?: MollieLink;
    dashboard?: MollieLink;
}

export interface MollieLink {
    href: string;
    type: string;
}

// Payment method specific details
export interface MolliePaymentDetails {
    // Credit card details
    cardHolder?: string;
    cardNumber?: string;
    cardFingerprint?: string;
    cardAudience?: string;
    cardLabel?: string;
    cardCountryCode?: string;
    cardSecurity?: string;
    feeRegion?: string;
    failureReason?: string;
    failureMessage?: string;

    // Bank transfer details
    bankName?: string;
    bankAccount?: string;
    bankBic?: string;
    transferReference?: string;

    // iDEAL details
    consumerName?: string;
    consumerAccount?: string;
    consumerBic?: string;

    // SEPA Direct Debit details
    transferReference?: string;
    creditorIdentifier?: string;
    consumerName?: string;
    consumerAccount?: string;
    consumerBic?: string;
    dueDate?: string;
    signatureDate?: string;
    bankReasonCode?: string;
    bankReason?: string;
    endToEndIdentifier?: string;
    mandateReference?: string;
    batchReference?: string;
    fileReference?: string;

    // PayPal details
    consumerName?: string;
    consumerAccount?: string;
    paypalReference?: string;
    paypalPayerId?: string;
    paypalFee?: MollieAmount;
    sellerProtection?: string;
    sessionId?: string;

    // Gift card details
    voucherNumber?: string;
    remainingAmount?: MollieAmount;

    // KBC/CBC details
    consumerName?: string;
    consumerAccount?: string;
    consumerBic?: string;

    // Belfius details
    consumerName?: string;
    consumerAccount?: string;
    consumerBic?: string;

    // Sofort details
    consumerName?: string;
    consumerAccount?: string;
    consumerBic?: string;

    // Przelewy24 details
    consumerName?: string;
    consumerAccount?: string;
    consumerBic?: string;

    // EPS details
    consumerName?: string;
    consumerAccount?: string;
    consumerBic?: string;

    // Giropay details
    consumerName?: string;
    consumerAccount?: string;
    consumerBic?: string;

    // Bancontact details
    cardNumber?: string;
    cardFingerprint?: string;
    qrCode?: MollieQrCode;

    // Apple Pay details
    applePayDisplayName?: string;
    applePayNetwork?: string;

    // Voucher details
    voucherNumber?: string;
    remainingAmount?: MollieAmount;
}

export interface MollieQrCode {
    height: number;
    width: number;
    src: string;
}

export interface MollieMandateDetails {
    consumerName?: string;
    consumerAccount?: string;
    consumerBic?: string;
    cardHolder?: string;
    cardNumber?: string;
    cardLabel?: string;
    cardFingerprint?: string;
    cardExpiryDate?: string;
}

// Enums
export type MolliePaymentStatus =
    | 'open'
    | 'canceled'
    | 'pending'
    | 'authorized'
    | 'expired'
    | 'failed'
    | 'paid';

export type MolliePaymentMethod =
    | 'applepay'
    | 'bancontact'
    | 'banktransfer'
    | 'belfius'
    | 'creditcard'
    | 'directdebit'
    | 'eps'
    | 'giftcard'
    | 'giropay'
    | 'ideal'
    | 'kbc'
    | 'klarnapaylater'
    | 'klarnasliceit'
    | 'mybank'
    | 'paypal'
    | 'paysafecard'
    | 'przelewy24'
    | 'sofort'
    | 'voucher';

export type MollieSequenceType = 'oneoff' | 'first' | 'recurring';

export type MollieSubscriptionStatus =
    | 'pending'
    | 'active'
    | 'canceled'
    | 'suspended'
    | 'completed';

export type MollieMandateStatus = 'valid' | 'invalid' | 'pending';

export type MollieRefundStatus = 'queued' | 'pending' | 'processing' | 'refunded' | 'failed';

export type MollieOrderStatus =
    | 'created'
    | 'paid'
    | 'authorized'
    | 'canceled'
    | 'shipping'
    | 'completed'
    | 'expired';

export type MollieOrderLineType =
    | 'physical'
    | 'discount'
    | 'digital'
    | 'shipping_fee'
    | 'store_credit'
    | 'gift_card'
    | 'surcharge';

export type MollieOrderLineStatus =
    | 'created'
    | 'authorized'
    | 'paid'
    | 'shipping'
    | 'canceled'
    | 'completed';

export type MollieProfileStatus = 'unverified' | 'verified' | 'blocked';

export type MollieProfileReviewStatus = 'pending' | 'rejected';

// Request interfaces
export interface CreateMollieCustomerRequest {
    name: string;
    email: string;
    locale?: string;
    metadata?: Record<string, string>;
}

export interface UpdateMollieCustomerRequest {
    name?: string;
    email?: string;
    locale?: string;
    metadata?: Record<string, string>;
}

export interface CreateMolliePaymentRequest {
    amount: MollieAmount;
    description: string;
    redirectUrl?: string;
    webhookUrl?: string;
    locale?: string;
    method?: MolliePaymentMethod | MolliePaymentMethod[];
    restrictPaymentMethodsToCountry?: string;
    metadata?: Record<string, string>;
    sequenceType?: MollieSequenceType;
    customerId?: string;
    mandateId?: string;
    subscriptionId?: string;
    captureMode?: 'automatic' | 'manual';
    captureDelay?: string;
    applicationFee?: MollieAmount;
    routing?: MollieRouting[];
}

export interface CreateMollieSubscriptionRequest {
    amount: MollieAmount;
    interval: string;
    description: string;
    webhookUrl?: string;
    times?: number;
    startDate?: string;
    method?: MolliePaymentMethod;
    mandateId?: string;
    applicationFee?: MollieAmount;
    metadata?: Record<string, string>;
}

export interface UpdateMollieSubscriptionRequest {
    amount?: MollieAmount;
    times?: number;
    startDate?: string;
    description?: string;
    webhookUrl?: string;
    metadata?: Record<string, string>;
}

export interface CreateMollieMandateRequest {
    method: MolliePaymentMethod;
    consumerName?: string;
    consumerAccount?: string;
    consumerBic?: string;
    signatureDate?: string;
    mandateReference?: string;
}

export interface CreateMollieRefundRequest {
    amount?: MollieAmount;
    description?: string;
    metadata?: Record<string, string>;
}

export interface CreateMollieOrderRequest {
    amount: MollieAmount;
    orderNumber: string;
    lines: MollieOrderLine[];
    billingAddress?: MollieAddress;
    shippingAddress?: MollieAddress;
    consumerDateOfBirth?: string;
    redirectUrl?: string;
    webhookUrl?: string;
    locale?: string;
    method?: MolliePaymentMethod | MolliePaymentMethod[];
    payment?: Partial<CreateMolliePaymentRequest>;
    metadata?: Record<string, string>;
    expiresAt?: string;
}

export interface UpdateMollieOrderRequest {
    orderNumber?: string;
    billingAddress?: MollieAddress;
    shippingAddress?: MollieAddress;
    redirectUrl?: string;
    webhookUrl?: string;
    metadata?: Record<string, string>;
}

// European payment method specific interfaces
export interface SepaDirectDebitDetails {
    consumerName: string;
    consumerAccount: string;
    consumerBic: string;
}

export interface IdealDetails {
    issuer?: string;
}

export interface BancontactDetails {
    cardNumber?: string;
}

export interface CreditCardDetails {
    cardToken?: string;
    cardNumber?: string;
    cardHolder?: string;
    cardExpiryDate?: string;
    cardCvv?: string;
}

// Webhook event types
export interface MollieWebhookEvent {
    id: string;
}

// Error types
export interface MollieError {
    status: number;
    title: string;
    detail: string;
    field?: string;
    _links?: MollieLinks;
}

// List response wrapper
export interface MollieListResponse<T> {
    count: number;
    _embedded: Record<string, T[]>;
    _links: MollieListLinks;
}

export interface MollieListLinks {
    self: MollieLink;
    previous?: MollieLink;
    next?: MollieLink;
    documentation: MollieLink;
}

// Payment flow configuration
export interface PaymentFlowConfig {
    environment: 'test' | 'live';
    locale: string;
    defaultCurrency: string;
    enabledMethods: MolliePaymentMethod[];
    redirectUrl: string;
    webhookUrl: string;
    profileId?: string;
    applicationFee?: MollieAmount;
}

// Service configuration
export interface MollieServiceConfig extends PaymentFlowConfig {
    apiKey: string;
    webhookSecret: string;
    retryConfig?: {
        maxRetries: number;
        initialDelay: number;
        maxDelay: number;
        backoffFactor: number;
    };
}

// Health check response
export interface MollieHealthCheckResponse {
    status: 'healthy' | 'unhealthy';
    details: {
        initialized: boolean;
        environment: string;
        availableMethods?: number;
        error?: string;
    };
}

// Analytics and reporting interfaces
export interface MolliePaymentAnalytics {
    totalPayments: number;
    successfulPayments: number;
    failedPayments: number;
    totalAmount: MollieAmount;
    averageAmount: MollieAmount;
    paymentMethods: Record<MolliePaymentMethod, number>;
    period: {
        start: string;
        end: string;
    };
}

export interface MollieSubscriptionAnalytics {
    totalSubscriptions: number;
    activeSubscriptions: number;
    canceledSubscriptions: number;
    totalRecurringRevenue: MollieAmount;
    churnRate: number;
    period: {
        start: string;
        end: string;
    };
}

// Utility types
export type MollieResourceId = string;
export type MollieTimestamp = string;
export type MollieCurrency = 'EUR' | 'USD' | 'GBP' | 'CHF' | 'SEK' | 'NOK' | 'DKK' | 'PLN' | 'HUF' | 'CZK' | 'BGN' | 'RON' | 'HRK';
export type MollieLocale = 'en_US' | 'en_GB' | 'nl_NL' | 'nl_BE' | 'fr_FR' | 'fr_BE' | 'de_DE' | 'de_AT' | 'de_CH' | 'es_ES' | 'ca_ES' | 'pt_PT' | 'it_IT' | 'nb_NO' | 'sv_SE' | 'fi_FI' | 'da_DK' | 'is_IS' | 'hu_HU' | 'pl_PL' | 'lv_LV' | 'lt_LT';

// Event handling
export interface MollieEventHandler {
    onPaymentCreated?(payment: MolliePayment): void | Promise<void>;
    onPaymentPaid?(payment: MolliePayment): void | Promise<void>;
    onPaymentFailed?(payment: MolliePayment): void | Promise<void>;
    onPaymentCanceled?(payment: MolliePayment): void | Promise<void>;
    onPaymentExpired?(payment: MolliePayment): void | Promise<void>;
    onSubscriptionCreated?(subscription: MollieSubscription): void | Promise<void>;
    onSubscriptionActivated?(subscription: MollieSubscription): void | Promise<void>;
    onSubscriptionCanceled?(subscription: MollieSubscription): void | Promise<void>;
    onSubscriptionSuspended?(subscription: MollieSubscription): void | Promise<void>;
    onRefundCreated?(refund: MollieRefund): void | Promise<void>;
    onChargebackCreated?(chargeback: MollieChargeback): void | Promise<void>;
}

export default {
    // Export all types as a namespace
};