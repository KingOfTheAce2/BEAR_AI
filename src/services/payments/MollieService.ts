import { invoke } from '@tauri-apps/api/tauri';
import { logger } from '../logger';

// Mollie Types - TypeScript interfaces matching Rust structs
export interface MollieAmount {
    currency: string;
    value: string;
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
    status: string;
    isCancelable?: boolean;
    paidAt?: string;
    canceledAt?: string;
    expiresAt?: string;
    expiredAt?: string;
    failedAt?: string;
    amount: MollieAmount;
    amountRefunded?: MollieAmount;
    amountRemaining?: MollieAmount;
    description: string;
    redirectUrl?: string;
    webhookUrl?: string;
    method?: string;
    countryCode?: string;
    locale?: string;
    customerId?: string;
    sequenceType?: string;
    mandateId?: string;
    subscriptionId?: string;
    metadata?: Record<string, string>;
    details?: any;
    _links?: MollieLinks;
}

export interface MollieSubscription {
    id: string;
    mode: string;
    createdAt: string;
    status: string;
    amount: MollieAmount;
    times?: number;
    timesRemaining?: number;
    interval: string;
    startDate: string;
    nextPaymentDate?: string;
    description: string;
    method?: string;
    mandateId: string;
    canceledAt?: string;
    webhookUrl?: string;
    metadata?: Record<string, string>;
    _links?: MollieLinks;
}

export interface MollieMandate {
    id: string;
    mode: string;
    status: string;
    method: string;
    details?: any;
    mandateReference?: string;
    signatureDate?: string;
    createdAt: string;
    _links?: MollieLinks;
}

export interface MollieRefund {
    id: string;
    amount: MollieAmount;
    status: string;
    createdAt: string;
    description: string;
    paymentId: string;
    settlementAmount?: MollieAmount;
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

export interface MollieLinks {
    self?: MollieLink;
    checkout?: MollieLink;
    dashboard?: MollieLink;
    documentation?: MollieLink;
    customer?: MollieLink;
    mandate?: MollieLink;
    subscription?: MollieLink;
    payment?: MollieLink;
    refund?: MollieLink;
}

export interface MollieLink {
    href: string;
    type: string;
}

// Request interfaces
export interface CreateMollieCustomerRequest {
    name: string;
    email: string;
    locale?: string;
    metadata?: Record<string, string>;
}

export interface CreateMolliePaymentRequest {
    amount: MollieAmount;
    description: string;
    redirectUrl?: string;
    webhookUrl?: string;
    locale?: string;
    method?: string;
    customerId?: string;
    sequenceType?: string;
    mandateId?: string;
    metadata?: Record<string, string>;
}

export interface CreateMollieSubscriptionRequest {
    amount: MollieAmount;
    interval: string;
    description: string;
    webhookUrl?: string;
    times?: number;
    startDate?: string;
    method?: string;
    metadata?: Record<string, string>;
}

export interface UpdateMollieSubscriptionRequest {
    amount?: MollieAmount;
    times?: number;
    startDate?: string;
    webhookUrl?: string;
    metadata?: Record<string, string>;
}

export interface CreateMollieRefundRequest {
    amount?: MollieAmount;
    description?: string;
    metadata?: Record<string, string>;
}

export interface CreateMollieMandateRequest {
    method: string;
    consumerName?: string;
    consumerAccount?: string;
    consumerBic?: string;
    signatureDate?: string;
    mandateReference?: string;
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

// Payment flow configuration
export interface PaymentFlowConfig {
    environment: 'test' | 'live';
    locale: string;
    defaultCurrency: string;
    enabledMethods: string[];
    redirectUrl: string;
    webhookUrl: string;
}

// Error handling
export class MollieError extends Error {
    constructor(
        message: string,
        public code?: string,
        public details?: any
    ) {
        super(message);
        this.name = 'MollieError';
    }
}

// Retry configuration
interface RetryConfig {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffFactor: number;
}

export class MollieService {
    private isInitialized = false;
    private config: PaymentFlowConfig;
    private retryConfig: RetryConfig = {
        maxRetries: 3,
        initialDelay: 1000,
        maxDelay: 10000,
        backoffFactor: 2
    };

    constructor(config: PaymentFlowConfig) {
        this.config = config;
    }

    // Initialize Mollie client
    async initialize(apiKey: string, webhookSecret: string): Promise<void> {
        try {
            await invoke('mollie_init_client', {
                apiKey,
                webhookSecret,
                environment: this.config.environment
            });
            this.isInitialized = true;
            logger.info('Mollie service initialized successfully', {
                environment: this.config.environment
            });
        } catch (error) {
            logger.error('Failed to initialize Mollie service', { error });
            throw new MollieError('Failed to initialize Mollie service', 'INIT_ERROR', error);
        }
    }

    private ensureInitialized(): void {
        if (!this.isInitialized) {
            throw new MollieError('Mollie service not initialized', 'NOT_INITIALIZED');
        }
    }

    // Retry logic for API calls
    private async withRetry<T>(operation: () => Promise<T>): Promise<T> {
        let lastError: any;
        let delay = this.retryConfig.initialDelay;

        for (let attempt = 0; attempt <= this.retryConfig.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error: any) {
                lastError = error;

                if (attempt === this.retryConfig.maxRetries) {
                    break;
                }

                // Don't retry certain errors
                if (error.includes('Invalid') || error.includes('Not found') || error.includes('Unauthorized')) {
                    throw new MollieError(error, 'NON_RETRYABLE', error);
                }

                logger.warn(`Mollie API call failed, attempt ${attempt + 1}/${this.retryConfig.maxRetries + 1}`, {
                    error,
                    nextRetryIn: delay
                });

                await new Promise(resolve => setTimeout(resolve, delay));
                delay = Math.min(delay * this.retryConfig.backoffFactor, this.retryConfig.maxDelay);
            }
        }

        throw new MollieError('Operation failed after retries', 'RETRY_EXHAUSTED', lastError);
    }

    // Customer Management
    async createCustomer(request: CreateMollieCustomerRequest): Promise<MollieCustomer> {
        this.ensureInitialized();

        try {
            const customer = await this.withRetry(() =>
                invoke<MollieCustomer>('mollie_create_customer', { request })
            );

            logger.info('Mollie customer created', { customerId: customer.id });
            return customer;
        } catch (error) {
            logger.error('Failed to create Mollie customer', { error, request });
            throw new MollieError('Failed to create customer', 'CREATE_CUSTOMER_ERROR', error);
        }
    }

    async getCustomer(customerId: string): Promise<MollieCustomer> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke<MollieCustomer>('mollie_get_customer', { customerId })
            );
        } catch (error) {
            logger.error('Failed to get Mollie customer', { error, customerId });
            throw new MollieError('Failed to get customer', 'GET_CUSTOMER_ERROR', error);
        }
    }

    async updateCustomer(customerId: string, request: CreateMollieCustomerRequest): Promise<MollieCustomer> {
        this.ensureInitialized();

        try {
            const customer = await this.withRetry(() =>
                invoke<MollieCustomer>('mollie_update_customer', { customerId, request })
            );

            logger.info('Mollie customer updated', { customerId });
            return customer;
        } catch (error) {
            logger.error('Failed to update Mollie customer', { error, customerId, request });
            throw new MollieError('Failed to update customer', 'UPDATE_CUSTOMER_ERROR', error);
        }
    }

    async deleteCustomer(customerId: string): Promise<void> {
        this.ensureInitialized();

        try {
            await this.withRetry(() =>
                invoke('mollie_delete_customer', { customerId })
            );

            logger.info('Mollie customer deleted', { customerId });
        } catch (error) {
            logger.error('Failed to delete Mollie customer', { error, customerId });
            throw new MollieError('Failed to delete customer', 'DELETE_CUSTOMER_ERROR', error);
        }
    }

    // Payment Management
    async createPayment(request: CreateMolliePaymentRequest): Promise<MolliePayment> {
        this.ensureInitialized();

        try {
            // Apply default configuration
            const enrichedRequest = {
                ...request,
                redirectUrl: request.redirectUrl || this.config.redirectUrl,
                webhookUrl: request.webhookUrl || this.config.webhookUrl,
                locale: request.locale || this.config.locale
            };

            const payment = await this.withRetry(() =>
                invoke<MolliePayment>('mollie_create_payment', { request: enrichedRequest })
            );

            logger.info('Mollie payment created', {
                paymentId: payment.id,
                amount: payment.amount,
                method: payment.method
            });
            return payment;
        } catch (error) {
            logger.error('Failed to create Mollie payment', { error, request });
            throw new MollieError('Failed to create payment', 'CREATE_PAYMENT_ERROR', error);
        }
    }

    async getPayment(paymentId: string): Promise<MolliePayment> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke<MolliePayment>('mollie_get_payment', { paymentId })
            );
        } catch (error) {
            logger.error('Failed to get Mollie payment', { error, paymentId });
            throw new MollieError('Failed to get payment', 'GET_PAYMENT_ERROR', error);
        }
    }

    async cancelPayment(paymentId: string): Promise<MolliePayment> {
        this.ensureInitialized();

        try {
            const payment = await this.withRetry(() =>
                invoke<MolliePayment>('mollie_cancel_payment', { paymentId })
            );

            logger.info('Mollie payment canceled', { paymentId });
            return payment;
        } catch (error) {
            logger.error('Failed to cancel Mollie payment', { error, paymentId });
            throw new MollieError('Failed to cancel payment', 'CANCEL_PAYMENT_ERROR', error);
        }
    }

    async listPayments(customerId?: string, limit?: number): Promise<MolliePayment[]> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke<MolliePayment[]>('mollie_list_payments', { customerId, limit })
            );
        } catch (error) {
            logger.error('Failed to list Mollie payments', { error, customerId, limit });
            throw new MollieError('Failed to list payments', 'LIST_PAYMENTS_ERROR', error);
        }
    }

    // Subscription Management
    async createSubscription(customerId: string, request: CreateMollieSubscriptionRequest): Promise<MollieSubscription> {
        this.ensureInitialized();

        try {
            // Apply default configuration
            const enrichedRequest = {
                ...request,
                webhookUrl: request.webhookUrl || this.config.webhookUrl
            };

            const subscription = await this.withRetry(() =>
                invoke<MollieSubscription>('mollie_create_subscription', {
                    customerId,
                    request: enrichedRequest
                })
            );

            logger.info('Mollie subscription created', {
                subscriptionId: subscription.id,
                customerId,
                amount: subscription.amount,
                interval: subscription.interval
            });
            return subscription;
        } catch (error) {
            logger.error('Failed to create Mollie subscription', { error, customerId, request });
            throw new MollieError('Failed to create subscription', 'CREATE_SUBSCRIPTION_ERROR', error);
        }
    }

    async getSubscription(customerId: string, subscriptionId: string): Promise<MollieSubscription> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke<MollieSubscription>('mollie_get_subscription', { customerId, subscriptionId })
            );
        } catch (error) {
            logger.error('Failed to get Mollie subscription', { error, customerId, subscriptionId });
            throw new MollieError('Failed to get subscription', 'GET_SUBSCRIPTION_ERROR', error);
        }
    }

    async updateSubscription(
        customerId: string,
        subscriptionId: string,
        request: UpdateMollieSubscriptionRequest
    ): Promise<MollieSubscription> {
        this.ensureInitialized();

        try {
            const subscription = await this.withRetry(() =>
                invoke<MollieSubscription>('mollie_update_subscription', {
                    customerId,
                    subscriptionId,
                    request
                })
            );

            logger.info('Mollie subscription updated', { subscriptionId, customerId });
            return subscription;
        } catch (error) {
            logger.error('Failed to update Mollie subscription', { error, customerId, subscriptionId, request });
            throw new MollieError('Failed to update subscription', 'UPDATE_SUBSCRIPTION_ERROR', error);
        }
    }

    async cancelSubscription(customerId: string, subscriptionId: string): Promise<MollieSubscription> {
        this.ensureInitialized();

        try {
            const subscription = await this.withRetry(() =>
                invoke<MollieSubscription>('mollie_cancel_subscription', { customerId, subscriptionId })
            );

            logger.info('Mollie subscription canceled', { subscriptionId, customerId });
            return subscription;
        } catch (error) {
            logger.error('Failed to cancel Mollie subscription', { error, customerId, subscriptionId });
            throw new MollieError('Failed to cancel subscription', 'CANCEL_SUBSCRIPTION_ERROR', error);
        }
    }

    async listSubscriptions(customerId: string, limit?: number): Promise<MollieSubscription[]> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke<MollieSubscription[]>('mollie_list_subscriptions', { customerId, limit })
            );
        } catch (error) {
            logger.error('Failed to list Mollie subscriptions', { error, customerId, limit });
            throw new MollieError('Failed to list subscriptions', 'LIST_SUBSCRIPTIONS_ERROR', error);
        }
    }

    // Mandate Management (for SEPA Direct Debit)
    async createMandate(customerId: string, request: CreateMollieMandateRequest): Promise<MollieMandate> {
        this.ensureInitialized();

        try {
            const mandate = await this.withRetry(() =>
                invoke<MollieMandate>('mollie_create_mandate', { customerId, request })
            );

            logger.info('Mollie mandate created', {
                mandateId: mandate.id,
                customerId,
                method: mandate.method
            });
            return mandate;
        } catch (error) {
            logger.error('Failed to create Mollie mandate', { error, customerId, request });
            throw new MollieError('Failed to create mandate', 'CREATE_MANDATE_ERROR', error);
        }
    }

    async getMandate(customerId: string, mandateId: string): Promise<MollieMandate> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke<MollieMandate>('mollie_get_mandate', { customerId, mandateId })
            );
        } catch (error) {
            logger.error('Failed to get Mollie mandate', { error, customerId, mandateId });
            throw new MollieError('Failed to get mandate', 'GET_MANDATE_ERROR', error);
        }
    }

    async revokeMandate(customerId: string, mandateId: string): Promise<void> {
        this.ensureInitialized();

        try {
            await this.withRetry(() =>
                invoke('mollie_revoke_mandate', { customerId, mandateId })
            );

            logger.info('Mollie mandate revoked', { mandateId, customerId });
        } catch (error) {
            logger.error('Failed to revoke Mollie mandate', { error, customerId, mandateId });
            throw new MollieError('Failed to revoke mandate', 'REVOKE_MANDATE_ERROR', error);
        }
    }

    async listMandates(customerId: string, limit?: number): Promise<MollieMandate[]> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke<MollieMandate[]>('mollie_list_mandates', { customerId, limit })
            );
        } catch (error) {
            logger.error('Failed to list Mollie mandates', { error, customerId, limit });
            throw new MollieError('Failed to list mandates', 'LIST_MANDATES_ERROR', error);
        }
    }

    // Refund Management
    async createRefund(paymentId: string, request: CreateMollieRefundRequest): Promise<MollieRefund> {
        this.ensureInitialized();

        try {
            const refund = await this.withRetry(() =>
                invoke<MollieRefund>('mollie_create_refund', { paymentId, request })
            );

            logger.info('Mollie refund created', {
                refundId: refund.id,
                paymentId,
                amount: refund.amount
            });
            return refund;
        } catch (error) {
            logger.error('Failed to create Mollie refund', { error, paymentId, request });
            throw new MollieError('Failed to create refund', 'CREATE_REFUND_ERROR', error);
        }
    }

    async getRefund(paymentId: string, refundId: string): Promise<MollieRefund> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke<MollieRefund>('mollie_get_refund', { paymentId, refundId })
            );
        } catch (error) {
            logger.error('Failed to get Mollie refund', { error, paymentId, refundId });
            throw new MollieError('Failed to get refund', 'GET_REFUND_ERROR', error);
        }
    }

    async listRefunds(paymentId: string, limit?: number): Promise<MollieRefund[]> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke<MollieRefund[]>('mollie_list_refunds', { paymentId, limit })
            );
        } catch (error) {
            logger.error('Failed to list Mollie refunds', { error, paymentId, limit });
            throw new MollieError('Failed to list refunds', 'LIST_REFUNDS_ERROR', error);
        }
    }

    // Chargeback Management
    async getChargeback(paymentId: string, chargebackId: string): Promise<MollieChargeback> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke<MollieChargeback>('mollie_get_chargeback', { paymentId, chargebackId })
            );
        } catch (error) {
            logger.error('Failed to get Mollie chargeback', { error, paymentId, chargebackId });
            throw new MollieError('Failed to get chargeback', 'GET_CHARGEBACK_ERROR', error);
        }
    }

    async listChargebacks(paymentId: string, limit?: number): Promise<MollieChargeback[]> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke<MollieChargeback[]>('mollie_list_chargebacks', { paymentId, limit })
            );
        } catch (error) {
            logger.error('Failed to list Mollie chargebacks', { error, paymentId, limit });
            throw new MollieError('Failed to list chargebacks', 'LIST_CHARGEBACKS_ERROR', error);
        }
    }

    // Payment Methods
    async getPaymentMethods(amount?: MollieAmount, locale?: string): Promise<any> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke('mollie_get_payment_methods', {
                    amount,
                    locale: locale || this.config.locale
                })
            );
        } catch (error) {
            logger.error('Failed to get Mollie payment methods', { error, amount, locale });
            throw new MollieError('Failed to get payment methods', 'GET_PAYMENT_METHODS_ERROR', error);
        }
    }

    async getIdealIssuers(): Promise<any> {
        this.ensureInitialized();

        try {
            return await this.withRetry(() =>
                invoke('mollie_get_ideal_issuers')
            );
        } catch (error) {
            logger.error('Failed to get iDEAL issuers', { error });
            throw new MollieError('Failed to get iDEAL issuers', 'GET_IDEAL_ISSUERS_ERROR', error);
        }
    }

    // High-level payment flow methods
    async createSepaDirectDebitPayment(
        customerId: string,
        amount: MollieAmount,
        description: string,
        sepaDetails: SepaDirectDebitDetails
    ): Promise<{ payment: MolliePayment; mandate: MollieMandate }> {
        try {
            // First create a SEPA mandate
            const mandate = await this.createMandate(customerId, {
                method: 'directdebit',
                consumerName: sepaDetails.consumerName,
                consumerAccount: sepaDetails.consumerAccount,
                consumerBic: sepaDetails.consumerBic,
                signatureDate: new Date().toISOString().split('T')[0]
            });

            // Then create the payment with the mandate
            const payment = await this.createPayment({
                amount,
                description,
                customerId,
                sequenceType: 'first',
                mandateId: mandate.id,
                method: 'directdebit'
            });

            return { payment, mandate };
        } catch (error) {
            logger.error('Failed to create SEPA Direct Debit payment', { error, customerId, amount, sepaDetails });
            throw new MollieError('Failed to create SEPA Direct Debit payment', 'CREATE_SEPA_PAYMENT_ERROR', error);
        }
    }

    async createIdealPayment(
        amount: MollieAmount,
        description: string,
        issuer?: string
    ): Promise<MolliePayment> {
        try {
            const paymentRequest: CreateMolliePaymentRequest = {
                amount,
                description,
                method: 'ideal'
            };

            if (issuer) {
                paymentRequest.metadata = { issuer };
            }

            return await this.createPayment(paymentRequest);
        } catch (error) {
            logger.error('Failed to create iDEAL payment', { error, amount, issuer });
            throw new MollieError('Failed to create iDEAL payment', 'CREATE_IDEAL_PAYMENT_ERROR', error);
        }
    }

    async createBancontactPayment(
        amount: MollieAmount,
        description: string
    ): Promise<MolliePayment> {
        try {
            return await this.createPayment({
                amount,
                description,
                method: 'bancontact'
            });
        } catch (error) {
            logger.error('Failed to create Bancontact payment', { error, amount });
            throw new MollieError('Failed to create Bancontact payment', 'CREATE_BANCONTACT_PAYMENT_ERROR', error);
        }
    }

    async createRecurringSubscription(
        customerId: string,
        amount: MollieAmount,
        interval: string,
        description: string,
        mandateId?: string
    ): Promise<MollieSubscription> {
        try {
            const request: CreateMollieSubscriptionRequest = {
                amount,
                interval,
                description,
                method: 'directdebit'
            };

            return await this.createSubscription(customerId, request);
        } catch (error) {
            logger.error('Failed to create recurring subscription', { error, customerId, amount, interval });
            throw new MollieError('Failed to create recurring subscription', 'CREATE_RECURRING_SUBSCRIPTION_ERROR', error);
        }
    }

    // Utility methods
    formatAmount(amount: number, currency: string = 'EUR'): MollieAmount {
        return {
            currency: currency.toUpperCase(),
            value: (amount / 100).toFixed(2) // Convert cents to euros with 2 decimals
        };
    }

    parseAmount(mollieAmount: MollieAmount): number {
        return Math.round(parseFloat(mollieAmount.value) * 100); // Convert to cents
    }

    isPaymentSuccessful(payment: MolliePayment): boolean {
        return payment.status === 'paid';
    }

    isPaymentPending(payment: MolliePayment): boolean {
        return payment.status === 'open' || payment.status === 'pending';
    }

    isPaymentFailed(payment: MolliePayment): boolean {
        return payment.status === 'failed' || payment.status === 'canceled' || payment.status === 'expired';
    }

    isSubscriptionActive(subscription: MollieSubscription): boolean {
        return subscription.status === 'active';
    }

    getCheckoutUrl(payment: MolliePayment): string | null {
        return payment._links?.checkout?.href || null;
    }

    // Webhook handler
    async handleWebhook(payload: string, signature: string): Promise<void> {
        this.ensureInitialized();

        try {
            await invoke('mollie_handle_webhook', { payload, signature });
            logger.info('Mollie webhook processed successfully');
        } catch (error) {
            logger.error('Failed to process Mollie webhook', { error });
            throw new MollieError('Failed to process webhook', 'WEBHOOK_ERROR', error);
        }
    }

    // Configuration helpers
    updateConfig(newConfig: Partial<PaymentFlowConfig>): void {
        this.config = { ...this.config, ...newConfig };
        logger.info('Mollie service configuration updated', { config: this.config });
    }

    getConfig(): PaymentFlowConfig {
        return { ...this.config };
    }

    isTestMode(): boolean {
        return this.config.environment === 'test';
    }

    // Health check
    async healthCheck(): Promise<{ status: 'healthy' | 'unhealthy'; details: any }> {
        try {
            this.ensureInitialized();

            // Try to get available payment methods as a health check
            const methods = await this.getPaymentMethods();

            return {
                status: 'healthy',
                details: {
                    initialized: this.isInitialized,
                    environment: this.config.environment,
                    availableMethods: methods?._embedded?.methods?.length || 0
                }
            };
        } catch (error) {
            return {
                status: 'unhealthy',
                details: {
                    initialized: this.isInitialized,
                    error: error.message
                }
            };
        }
    }
}

// Factory function for creating MollieService instances
export function createMollieService(config: PaymentFlowConfig): MollieService {
    return new MollieService(config);
}

// Default configuration for different environments
export const DEFAULT_MOLLIE_CONFIG: Record<string, PaymentFlowConfig> = {
    test: {
        environment: 'test',
        locale: 'en_US',
        defaultCurrency: 'EUR',
        enabledMethods: ['ideal', 'bancontact', 'directdebit', 'creditcard'],
        redirectUrl: 'http://localhost:3000/payment/return',
        webhookUrl: 'http://localhost:3000/webhooks/mollie'
    },
    production: {
        environment: 'live',
        locale: 'en_US',
        defaultCurrency: 'EUR',
        enabledMethods: ['ideal', 'bancontact', 'directdebit', 'creditcard'],
        redirectUrl: 'https://yourdomain.com/payment/return',
        webhookUrl: 'https://yourdomain.com/webhooks/mollie'
    }
};

export default MollieService;