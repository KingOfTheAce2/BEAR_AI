// Mollie Payment Integration - Main Export File
// This file provides a clean interface for importing Mollie payment functionality

// Main service class
export { default as MollieService, createMollieService, MollieError, DEFAULT_MOLLIE_CONFIG } from './MollieService';

// All types
export * from './types';

// Re-export commonly used types for convenience
export type {
    MolliePayment,
    MollieCustomer,
    MollieSubscription,
    MollieRefund,
    MollieChargeback,
    MollieMandate,
    MollieAmount,
    CreateMolliePaymentRequest,
    CreateMollieCustomerRequest,
    CreateMollieSubscriptionRequest,
    PaymentFlowConfig,
    MollieServiceConfig,
    MolliePaymentStatus,
    MolliePaymentMethod,
    MollieSequenceType,
    SepaDirectDebitDetails,
    IdealDetails,
    BancontactDetails,
    MollieEventHandler
} from './types';

// Payment method constants
export const MOLLIE_PAYMENT_METHODS = {
    APPLEPAY: 'applepay' as const,
    BANCONTACT: 'bancontact' as const,
    BANK_TRANSFER: 'banktransfer' as const,
    BELFIUS: 'belfius' as const,
    CREDIT_CARD: 'creditcard' as const,
    DIRECT_DEBIT: 'directdebit' as const,
    EPS: 'eps' as const,
    GIFT_CARD: 'giftcard' as const,
    GIROPAY: 'giropay' as const,
    IDEAL: 'ideal' as const,
    KBC: 'kbc' as const,
    KLARNA_PAY_LATER: 'klarnapaylater' as const,
    KLARNA_SLICE_IT: 'klarnasliceit' as const,
    MYBANK: 'mybank' as const,
    PAYPAL: 'paypal' as const,
    PAYSAFECARD: 'paysafecard' as const,
    PRZELEWY24: 'przelewy24' as const,
    SOFORT: 'sofort' as const,
    VOUCHER: 'voucher' as const
};

// Payment status constants
export const MOLLIE_PAYMENT_STATUS = {
    OPEN: 'open' as const,
    CANCELED: 'canceled' as const,
    PENDING: 'pending' as const,
    AUTHORIZED: 'authorized' as const,
    EXPIRED: 'expired' as const,
    FAILED: 'failed' as const,
    PAID: 'paid' as const
};

// Subscription status constants
export const MOLLIE_SUBSCRIPTION_STATUS = {
    PENDING: 'pending' as const,
    ACTIVE: 'active' as const,
    CANCELED: 'canceled' as const,
    SUSPENDED: 'suspended' as const,
    COMPLETED: 'completed' as const
};

// Sequence type constants
export const MOLLIE_SEQUENCE_TYPE = {
    ONEOFF: 'oneoff' as const,
    FIRST: 'first' as const,
    RECURRING: 'recurring' as const
};

// European currencies supported by Mollie
export const MOLLIE_CURRENCIES = {
    EUR: 'EUR' as const,
    USD: 'USD' as const,
    GBP: 'GBP' as const,
    CHF: 'CHF' as const,
    SEK: 'SEK' as const,
    NOK: 'NOK' as const,
    DKK: 'DKK' as const,
    PLN: 'PLN' as const,
    HUF: 'HUF' as const,
    CZK: 'CZK' as const,
    BGN: 'BGN' as const,
    RON: 'RON' as const,
    HRK: 'HRK' as const
};

// Supported locales
export const MOLLIE_LOCALES = {
    EN_US: 'en_US' as const,
    EN_GB: 'en_GB' as const,
    NL_NL: 'nl_NL' as const,
    NL_BE: 'nl_BE' as const,
    FR_FR: 'fr_FR' as const,
    FR_BE: 'fr_BE' as const,
    DE_DE: 'de_DE' as const,
    DE_AT: 'de_AT' as const,
    DE_CH: 'de_CH' as const,
    ES_ES: 'es_ES' as const,
    CA_ES: 'ca_ES' as const,
    PT_PT: 'pt_PT' as const,
    IT_IT: 'it_IT' as const,
    NB_NO: 'nb_NO' as const,
    SV_SE: 'sv_SE' as const,
    FI_FI: 'fi_FI' as const,
    DA_DK: 'da_DK' as const,
    IS_IS: 'is_IS' as const,
    HU_HU: 'hu_HU' as const,
    PL_PL: 'pl_PL' as const,
    LV_LV: 'lv_LV' as const,
    LT_LT: 'lt_LT' as const
};

// Utility functions
export const MollieUtils = {
    /**
     * Format amount for Mollie API (cents to decimal string)
     */
    formatAmount: (amount: number, currency: string = 'EUR') => ({
        currency: currency.toUpperCase(),
        value: (amount / 100).toFixed(2)
    }),

    /**
     * Parse Mollie amount to cents
     */
    parseAmount: (mollieAmount: { value: string; currency: string }) =>
        Math.round(parseFloat(mollieAmount.value) * 100),

    /**
     * Check if payment is successful
     */
    isPaymentSuccessful: (status: string) => status === MOLLIE_PAYMENT_STATUS.PAID,

    /**
     * Check if payment is pending
     */
    isPaymentPending: (status: string) =>
        status === MOLLIE_PAYMENT_STATUS.OPEN || status === MOLLIE_PAYMENT_STATUS.PENDING,

    /**
     * Check if payment has failed
     */
    isPaymentFailed: (status: string) =>
        status === MOLLIE_PAYMENT_STATUS.FAILED ||
        status === MOLLIE_PAYMENT_STATUS.CANCELED ||
        status === MOLLIE_PAYMENT_STATUS.EXPIRED,

    /**
     * Check if subscription is active
     */
    isSubscriptionActive: (status: string) => status === MOLLIE_SUBSCRIPTION_STATUS.ACTIVE,

    /**
     * Generate webhook URL
     */
    generateWebhookUrl: (baseUrl: string, endpoint: string = '/webhooks/mollie') =>
        `${baseUrl.replace(/\/$/, '')}${endpoint}`,

    /**
     * Generate redirect URL
     */
    generateRedirectUrl: (baseUrl: string, endpoint: string = '/payment/return') =>
        `${baseUrl.replace(/\/$/, '')}${endpoint}`,

    /**
     * Validate IBAN for SEPA Direct Debit
     */
    validateIBAN: (iban: string): boolean => {
        // Basic IBAN validation (simplified)
        const cleanIban = iban.replace(/\s/g, '').toUpperCase();
        return /^[A-Z]{2}[0-9]{2}[A-Z0-9]{4}[0-9]{7}([A-Z0-9]?){0,16}$/.test(cleanIban);
    },

    /**
     * Validate BIC for SEPA Direct Debit
     */
    validateBIC: (bic: string): boolean => {
        // Basic BIC validation
        const cleanBic = bic.replace(/\s/g, '').toUpperCase();
        return /^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(cleanBic);
    },

    /**
     * Get payment method display name
     */
    getPaymentMethodDisplayName: (method: string): string => {
        const displayNames: Record<string, string> = {
            [MOLLIE_PAYMENT_METHODS.APPLEPAY]: 'Apple Pay',
            [MOLLIE_PAYMENT_METHODS.BANCONTACT]: 'Bancontact',
            [MOLLIE_PAYMENT_METHODS.BANK_TRANSFER]: 'Bank Transfer',
            [MOLLIE_PAYMENT_METHODS.BELFIUS]: 'Belfius',
            [MOLLIE_PAYMENT_METHODS.CREDIT_CARD]: 'Credit Card',
            [MOLLIE_PAYMENT_METHODS.DIRECT_DEBIT]: 'SEPA Direct Debit',
            [MOLLIE_PAYMENT_METHODS.EPS]: 'EPS',
            [MOLLIE_PAYMENT_METHODS.GIFT_CARD]: 'Gift Card',
            [MOLLIE_PAYMENT_METHODS.GIROPAY]: 'Giropay',
            [MOLLIE_PAYMENT_METHODS.IDEAL]: 'iDEAL',
            [MOLLIE_PAYMENT_METHODS.KBC]: 'KBC/CBC',
            [MOLLIE_PAYMENT_METHODS.KLARNA_PAY_LATER]: 'Klarna Pay Later',
            [MOLLIE_PAYMENT_METHODS.KLARNA_SLICE_IT]: 'Klarna Slice It',
            [MOLLIE_PAYMENT_METHODS.MYBANK]: 'MyBank',
            [MOLLIE_PAYMENT_METHODS.PAYPAL]: 'PayPal',
            [MOLLIE_PAYMENT_METHODS.PAYSAFECARD]: 'paysafecard',
            [MOLLIE_PAYMENT_METHODS.PRZELEWY24]: 'Przelewy24',
            [MOLLIE_PAYMENT_METHODS.SOFORT]: 'SOFORT',
            [MOLLIE_PAYMENT_METHODS.VOUCHER]: 'Voucher'
        };
        return displayNames[method] || method;
    },

    /**
     * Get currency symbol
     */
    getCurrencySymbol: (currency: string): string => {
        const symbols: Record<string, string> = {
            EUR: '€',
            USD: '$',
            GBP: '£',
            CHF: 'CHF',
            SEK: 'kr',
            NOK: 'kr',
            DKK: 'kr',
            PLN: 'zł',
            HUF: 'Ft',
            CZK: 'Kč',
            BGN: 'лв',
            RON: 'lei',
            HRK: 'kn'
        };
        return symbols[currency] || currency;
    },

    /**
     * Format amount with currency symbol
     */
    formatAmountWithSymbol: (amount: { value: string; currency: string }): string => {
        const symbol = MollieUtils.getCurrencySymbol(amount.currency);
        const value = parseFloat(amount.value);

        // Format based on currency
        const formatted = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);

        return `${symbol}${formatted}`;
    },

    /**
     * Get European payment methods
     */
    getEuropeanPaymentMethods: () => [
        MOLLIE_PAYMENT_METHODS.IDEAL,
        MOLLIE_PAYMENT_METHODS.BANCONTACT,
        MOLLIE_PAYMENT_METHODS.DIRECT_DEBIT,
        MOLLIE_PAYMENT_METHODS.BELFIUS,
        MOLLIE_PAYMENT_METHODS.KBC,
        MOLLIE_PAYMENT_METHODS.EPS,
        MOLLIE_PAYMENT_METHODS.GIROPAY,
        MOLLIE_PAYMENT_METHODS.SOFORT,
        MOLLIE_PAYMENT_METHODS.PRZELEWY24,
        MOLLIE_PAYMENT_METHODS.MYBANK
    ],

    /**
     * Get recommended payment methods by country
     */
    getRecommendedPaymentMethodsByCountry: (countryCode: string) => {
        const recommendations: Record<string, string[]> = {
            NL: [MOLLIE_PAYMENT_METHODS.IDEAL, MOLLIE_PAYMENT_METHODS.DIRECT_DEBIT, MOLLIE_PAYMENT_METHODS.CREDIT_CARD],
            BE: [MOLLIE_PAYMENT_METHODS.BANCONTACT, MOLLIE_PAYMENT_METHODS.BELFIUS, MOLLIE_PAYMENT_METHODS.KBC, MOLLIE_PAYMENT_METHODS.DIRECT_DEBIT],
            DE: [MOLLIE_PAYMENT_METHODS.SOFORT, MOLLIE_PAYMENT_METHODS.GIROPAY, MOLLIE_PAYMENT_METHODS.DIRECT_DEBIT, MOLLIE_PAYMENT_METHODS.CREDIT_CARD],
            AT: [MOLLIE_PAYMENT_METHODS.EPS, MOLLIE_PAYMENT_METHODS.SOFORT, MOLLIE_PAYMENT_METHODS.CREDIT_CARD],
            PL: [MOLLIE_PAYMENT_METHODS.PRZELEWY24, MOLLIE_PAYMENT_METHODS.CREDIT_CARD],
            IT: [MOLLIE_PAYMENT_METHODS.MYBANK, MOLLIE_PAYMENT_METHODS.CREDIT_CARD],
            FR: [MOLLIE_PAYMENT_METHODS.CREDIT_CARD, MOLLIE_PAYMENT_METHODS.DIRECT_DEBIT],
            GB: [MOLLIE_PAYMENT_METHODS.CREDIT_CARD, MOLLIE_PAYMENT_METHODS.PAYPAL],
            US: [MOLLIE_PAYMENT_METHODS.CREDIT_CARD, MOLLIE_PAYMENT_METHODS.PAYPAL, MOLLIE_PAYMENT_METHODS.APPLEPAY]
        };

        return recommendations[countryCode.toUpperCase()] || [
            MOLLIE_PAYMENT_METHODS.CREDIT_CARD,
            MOLLIE_PAYMENT_METHODS.PAYPAL
        ];
    }
};

// Configuration helpers
export const MollieConfig = {
    /**
     * Create test environment configuration
     */
    createTestConfig: (overrides: Partial<PaymentFlowConfig> = {}) => ({
        environment: 'test' as const,
        locale: MOLLIE_LOCALES.EN_US,
        defaultCurrency: MOLLIE_CURRENCIES.EUR,
        enabledMethods: MollieUtils.getEuropeanPaymentMethods(),
        redirectUrl: process.env.PAYMENT_REDIRECT_URL || (process.env.NODE_ENV === 'production' ? 'https://bear-ai.app/payment/return' : 'http://localhost:3000/payment/return'),
        webhookUrl: process.env.PAYMENT_WEBHOOK_URL || (process.env.NODE_ENV === 'production' ? 'https://bear-ai.app/webhooks/mollie' : 'http://localhost:3000/webhooks/mollie'),
        ...overrides
    }),

    /**
     * Create production environment configuration
     */
    createProductionConfig: (overrides: Partial<PaymentFlowConfig> = {}) => ({
        environment: 'live' as const,
        locale: MOLLIE_LOCALES.EN_US,
        defaultCurrency: MOLLIE_CURRENCIES.EUR,
        enabledMethods: MollieUtils.getEuropeanPaymentMethods(),
        redirectUrl: 'https://yourdomain.com/payment/return',
        webhookUrl: 'https://yourdomain.com/webhooks/mollie',
        ...overrides
    }),

    /**
     * Create configuration for specific country
     */
    createCountryConfig: (countryCode: string, environment: 'test' | 'live' = 'test') => {
        const baseConfig = environment === 'test'
            ? MollieConfig.createTestConfig()
            : MollieConfig.createProductionConfig();

        return {
            ...baseConfig,
            enabledMethods: MollieUtils.getRecommendedPaymentMethodsByCountry(countryCode)
        };
    }
};

// Export default object with all utilities
export default {
    MollieService,
    createMollieService,
    MollieError,
    DEFAULT_MOLLIE_CONFIG,
    MOLLIE_PAYMENT_METHODS,
    MOLLIE_PAYMENT_STATUS,
    MOLLIE_SUBSCRIPTION_STATUS,
    MOLLIE_SEQUENCE_TYPE,
    MOLLIE_CURRENCIES,
    MOLLIE_LOCALES,
    MollieUtils,
    MollieConfig
};