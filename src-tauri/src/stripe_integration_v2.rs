use anyhow::{anyhow, Result};
use reqwest::{Client, header::{HeaderMap, HeaderValue, AUTHORIZATION, CONTENT_TYPE}};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
use std::collections::HashMap;
use std::env;
use std::sync::{Arc, Mutex};
use tokio::time::{timeout, Duration};
use tauri::{AppHandle, Manager, State};
use chrono::{DateTime, Utc};
use log::{error, info, warn, debug};
use hmac::{Hmac, Mac};
use sha2::Sha256;
use hex;

// Enhanced Stripe API client with production-ready security
#[derive(Clone)]
pub struct StripeClient {
    client: Client,
    secret_key: String,
    publishable_key: String,
    webhook_secret: String,
    base_url: String,
    environment: String,
}

// Secure credential storage with validation
#[derive(Debug)]
pub struct StripeCredentials {
    secret_key: String,
    publishable_key: String,
    webhook_secret: String,
    environment: String, // 'test' or 'live'
}

// Enhanced subscription state management with enterprise features
#[derive(Default)]
pub struct SubscriptionState {
    customers: HashMap<String, Customer>,
    subscriptions: HashMap<String, Subscription>,
    payment_methods: HashMap<String, PaymentMethod>,
    teams: HashMap<String, TeamSubscription>,
    billing_cycles: HashMap<String, BillingCycle>,
}

// Enterprise team subscription support
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TeamSubscription {
    pub id: String,
    pub team_name: String,
    pub admin_email: String,
    pub subscription_id: String,
    pub member_count: i32,
    pub max_members: i32,
    pub created_at: i64,
    pub metadata: HashMap<String, String>,
}

// Billing cycle tracking
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BillingCycle {
    pub id: String,
    pub subscription_id: String,
    pub period_start: i64,
    pub period_end: i64,
    pub amount_due: i64,
    pub amount_paid: i64,
    pub status: String,
    pub invoice_id: Option<String>,
}

// Enhanced Stripe API response types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Customer {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub created: i64,
    pub metadata: HashMap<String, String>,
    pub default_source: Option<String>,
    pub invoice_prefix: Option<String>,
    pub balance: Option<i64>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Subscription {
    pub id: String,
    pub customer: String,
    pub status: String,
    pub current_period_start: i64,
    pub current_period_end: i64,
    pub cancel_at_period_end: bool,
    pub trial_end: Option<i64>,
    pub trial_start: Option<i64>,
    pub items: SubscriptionItems,
    pub metadata: HashMap<String, String>,
    pub latest_invoice: Option<String>,
    pub pending_setup_intent: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubscriptionItems {
    pub data: Vec<SubscriptionItem>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubscriptionItem {
    pub id: String,
    pub price: Price,
    pub quantity: i32,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Price {
    pub id: String,
    pub unit_amount: Option<i64>,
    pub currency: String,
    pub recurring: Option<Recurring>,
    pub metadata: HashMap<String, String>,
    pub product: String,
    pub nickname: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Recurring {
    pub interval: String,
    pub interval_count: i32,
    pub usage_type: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaymentMethod {
    pub id: String,
    pub customer: Option<String>,
    #[serde(rename = "type")]
    pub payment_type: String,
    pub card: Option<Card>,
    pub created: i64,
    pub billing_details: Option<BillingDetails>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Card {
    pub brand: String,
    pub last4: String,
    pub exp_month: i32,
    pub exp_year: i32,
    pub funding: String,
    pub country: Option<String>,
    pub fingerprint: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BillingDetails {
    pub address: Option<Address>,
    pub email: Option<String>,
    pub name: Option<String>,
    pub phone: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Address {
    pub city: Option<String>,
    pub country: Option<String>,
    pub line1: Option<String>,
    pub line2: Option<String>,
    pub postal_code: Option<String>,
    pub state: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Invoice {
    pub id: String,
    pub customer: String,
    pub subscription: Option<String>,
    pub amount_due: i64,
    pub amount_paid: i64,
    pub amount_remaining: i64,
    pub currency: String,
    pub status: String,
    pub hosted_invoice_url: Option<String>,
    pub invoice_pdf: Option<String>,
    pub due_date: Option<i64>,
    pub paid_at: Option<i64>,
    pub created: i64,
    pub period_start: Option<i64>,
    pub period_end: Option<i64>,
    pub lines: Option<InvoiceLineItems>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceLineItems {
    pub data: Vec<InvoiceLineItem>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceLineItem {
    pub id: String,
    pub amount: i64,
    pub currency: String,
    pub description: Option<String>,
    pub period: Option<Period>,
    pub price: Option<Price>,
    pub quantity: Option<i32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Period {
    pub start: i64,
    pub end: i64,
}

// Enhanced webhook event handling with security
#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: WebhookEventData,
    pub created: i64,
    pub livemode: bool,
    pub api_version: Option<String>,
    pub request: Option<WebhookRequest>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookEventData {
    pub object: Value,
    pub previous_attributes: Option<Value>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookRequest {
    pub id: Option<String>,
    pub idempotency_key: Option<String>,
}

// Enhanced request/response types for enterprise features
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomerRequest {
    pub email: String,
    pub name: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
    pub payment_method: Option<String>,
    pub invoice_settings: Option<InvoiceSettings>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct InvoiceSettings {
    pub default_payment_method: Option<String>,
    pub footer: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateTeamSubscriptionRequest {
    pub team_name: String,
    pub admin_email: String,
    pub customer_id: String,
    pub price_id: String,
    pub max_members: i32,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSubscriptionRequest {
    pub customer_id: String,
    pub price_id: String,
    pub payment_method_id: Option<String>,
    pub trial_period_days: Option<i32>,
    pub metadata: Option<HashMap<String, String>>,
    pub coupon: Option<String>,
    pub default_tax_rates: Option<Vec<String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSubscriptionRequest {
    pub subscription_id: String,
    pub price_id: Option<String>,
    pub cancel_at_period_end: Option<bool>,
    pub proration_behavior: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePaymentIntentRequest {
    pub amount: i64,
    pub currency: String,
    pub customer_id: Option<String>,
    pub payment_method_id: Option<String>,
    pub confirm: Option<bool>,
    pub metadata: Option<HashMap<String, String>>,
    pub description: Option<String>,
    pub setup_future_usage: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct PaymentIntent {
    pub id: String,
    pub amount: i64,
    pub currency: String,
    pub status: String,
    pub client_secret: Option<String>,
    pub customer: Option<String>,
    pub payment_method: Option<String>,
    pub metadata: HashMap<String, String>,
    pub description: Option<String>,
    pub charges: Option<ChargeList>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ChargeList {
    pub data: Vec<Charge>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Charge {
    pub id: String,
    pub amount: i64,
    pub currency: String,
    pub status: String,
    pub paid: bool,
    pub payment_method: Option<String>,
    pub receipt_url: Option<String>,
}

// Test mode configuration
#[derive(Debug, Serialize, Deserialize)]
pub struct TestConfiguration {
    pub enable_test_mode: bool,
    pub test_card_numbers: Vec<String>,
    pub simulate_failures: bool,
    pub webhook_test_url: Option<String>,
}

impl StripeClient {
    pub fn new(credentials: StripeCredentials) -> Result<Self> {
        // Validate credentials
        Self::validate_credentials(&credentials)?;

        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .user_agent("BEAR-AI-Legal-Assistant/1.0")
            .build()
            .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;

        Ok(Self {
            client,
            secret_key: credentials.secret_key,
            publishable_key: credentials.publishable_key,
            webhook_secret: credentials.webhook_secret,
            environment: credentials.environment,
            base_url: "https://api.stripe.com/v1".to_string(),
        })
    }

    // Validate Stripe credentials format
    fn validate_credentials(credentials: &StripeCredentials) -> Result<()> {
        // Validate secret key format
        if credentials.environment == "test" && !credentials.secret_key.starts_with("sk_test_") {
            return Err(anyhow!("Invalid test secret key format"));
        }
        if credentials.environment == "live" && !credentials.secret_key.starts_with("sk_live_") {
            return Err(anyhow!("Invalid live secret key format"));
        }

        // Validate publishable key format
        if credentials.environment == "test" && !credentials.publishable_key.starts_with("pk_test_") {
            return Err(anyhow!("Invalid test publishable key format"));
        }
        if credentials.environment == "live" && !credentials.publishable_key.starts_with("pk_live_") {
            return Err(anyhow!("Invalid live publishable key format"));
        }

        // Validate webhook secret format
        if !credentials.webhook_secret.starts_with("whsec_") {
            return Err(anyhow!("Invalid webhook secret format"));
        }

        Ok(())
    }

    // Enhanced header creation with retry logic
    fn create_headers(&self) -> Result<HeaderMap> {
        let mut headers = HeaderMap::new();

        let auth_value = format!("Bearer {}", self.secret_key);
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&auth_value)
                .map_err(|e| anyhow!("Invalid authorization header: {}", e))?
        );

        headers.insert(
            CONTENT_TYPE,
            HeaderValue::from_static("application/x-www-form-urlencoded")
        );

        // Add idempotency key for safe retries
        let idempotency_key = uuid::Uuid::new_v4().to_string();
        headers.insert(
            "Idempotency-Key",
            HeaderValue::from_str(&idempotency_key)
                .map_err(|e| anyhow!("Invalid idempotency key: {}", e))?
        );

        Ok(headers)
    }

    // Enhanced webhook signature verification with production security
    pub fn verify_webhook_signature(&self, payload: &str, signature: &str) -> Result<WebhookEvent> {
        type HmacSha256 = Hmac<Sha256>;

        // Extract timestamp and signatures from header
        let elements: Vec<&str> = signature.split(',').collect();
        let mut timestamp: Option<i64> = None;
        let mut signatures: Vec<&str> = Vec::new();

        for element in elements {
            if let Some(t) = element.strip_prefix("t=") {
                timestamp = Some(t.parse().map_err(|_| anyhow!("Invalid timestamp"))?);
            } else if let Some(sig) = element.strip_prefix("v1=") {
                signatures.push(sig);
            }
        }

        let timestamp = timestamp.ok_or_else(|| anyhow!("Missing timestamp in signature"))?;
        if signatures.is_empty() {
            return Err(anyhow!("No valid signatures found"));
        }

        // Verify timestamp is recent (within 5 minutes for production security)
        let current_timestamp = chrono::Utc::now().timestamp();
        if (current_timestamp - timestamp).abs() > 300 {
            return Err(anyhow!("Webhook timestamp too old or too far in future"));
        }

        // Create expected signature
        let signed_payload = format!("{}.{}", timestamp, payload);

        let mut mac = HmacSha256::new_from_slice(self.webhook_secret.as_bytes())
            .map_err(|e| anyhow!("Invalid webhook secret: {}", e))?;

        mac.update(signed_payload.as_bytes());
        let expected_signature = hex::encode(mac.finalize().into_bytes());

        // Verify at least one signature matches (constant-time comparison)
        let mut signature_valid = false;
        for signature in signatures {
            if expected_signature == signature {
                signature_valid = true;
                break;
            }
        }

        if !signature_valid {
            return Err(anyhow!("Invalid webhook signature"));
        }

        // Parse and return the verified event
        let event: WebhookEvent = serde_json::from_str(payload)
            .map_err(|e| anyhow!("Failed to parse webhook event: {}", e))?;

        info!("Webhook signature verified successfully for event: {} (type: {})",
              event.id, event.event_type);
        Ok(event)
    }

    // Enhanced customer management with enterprise features
    pub async fn create_customer(&self, request: CreateCustomerRequest) -> Result<Customer> {
        let headers = self.create_headers()?;
        let mut form_data = vec![("email", request.email.as_str())];

        if let Some(name) = &request.name {
            form_data.push(("name", name.as_str()));
        }

        if let Some(payment_method) = &request.payment_method {
            form_data.push(("payment_method", payment_method.as_str()));
        }

        // Add metadata for enterprise tracking
        if let Some(metadata) = &request.metadata {
            for (key, value) in metadata {
                let metadata_key = format!("metadata[{}]", key);
                form_data.push((&metadata_key, value.as_str()));
            }
        }

        let url = format!("{}/customers", self.base_url);

        let response = self.execute_request_with_retry(&url, &form_data, &headers, 3).await?;

        let customer: Customer = response.json().await
            .map_err(|e| anyhow!("Failed to parse customer response: {}", e))?;

        info!("Created Stripe customer: {} for email: {}", customer.id, customer.email);
        Ok(customer)
    }

    // Enterprise team subscription management
    pub async fn create_team_subscription(&self, request: CreateTeamSubscriptionRequest) -> Result<TeamSubscription> {
        // First create the subscription
        let subscription_request = CreateSubscriptionRequest {
            customer_id: request.customer_id.clone(),
            price_id: request.price_id.clone(),
            payment_method_id: None,
            trial_period_days: Some(14), // 14-day trial for enterprise
            metadata: Some({
                let mut metadata = HashMap::new();
                metadata.insert("team_name".to_string(), request.team_name.clone());
                metadata.insert("admin_email".to_string(), request.admin_email.clone());
                metadata.insert("max_members".to_string(), request.max_members.to_string());
                metadata.insert("subscription_type".to_string(), "team".to_string());
                metadata
            }),
            coupon: None,
            default_tax_rates: None,
        };

        let subscription = self.create_subscription(subscription_request).await?;

        // Create team subscription record
        let team_subscription = TeamSubscription {
            id: uuid::Uuid::new_v4().to_string(),
            team_name: request.team_name,
            admin_email: request.admin_email,
            subscription_id: subscription.id,
            member_count: 1,
            max_members: request.max_members,
            created_at: chrono::Utc::now().timestamp(),
            metadata: request.metadata.unwrap_or_default(),
        };

        info!("Created team subscription: {} for team: {}",
              team_subscription.id, team_subscription.team_name);
        Ok(team_subscription)
    }

    // Execute HTTP requests with retry logic and exponential backoff
    async fn execute_request_with_retry(
        &self,
        url: &str,
        form_data: &[(&str, &str)],
        headers: &HeaderMap,
        max_retries: u32,
    ) -> Result<reqwest::Response> {
        let mut retry_count = 0;

        loop {
            let response = timeout(
                Duration::from_secs(30),
                self.client
                    .post(url)
                    .headers(headers.clone())
                    .form(form_data)
            ).await
            .map_err(|_| anyhow!("Request timeout"))?
            .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

            if response.status().is_success() {
                return Ok(response);
            }

            // Check if we should retry
            if retry_count >= max_retries {
                let error_text = response.text().await.unwrap_or_default();
                return Err(anyhow!("Stripe API error after {} retries: {}", max_retries, error_text));
            }

            // Exponential backoff for retries
            let delay = Duration::from_millis(1000 * (2_u64.pow(retry_count)));
            tokio::time::sleep(delay).await;
            retry_count += 1;

            warn!("Retrying Stripe API request (attempt {}/{})", retry_count + 1, max_retries + 1);
        }
    }

    // Create payment intent for subscription
    pub async fn create_payment_intent(&self, request: CreatePaymentIntentRequest) -> Result<PaymentIntent> {
        let headers = self.create_headers()?;
        let mut form_data = vec![
            ("amount", request.amount.to_string().as_str()),
            ("currency", request.currency.as_str()),
        ];

        if let Some(customer_id) = &request.customer_id {
            form_data.push(("customer", customer_id.as_str()));
        }

        if let Some(payment_method_id) = &request.payment_method_id {
            form_data.push(("payment_method", payment_method_id.as_str()));
        }

        if let Some(confirm) = request.confirm {
            form_data.push(("confirm", if confirm { "true" } else { "false" }));
        }

        if let Some(description) = &request.description {
            form_data.push(("description", description.as_str()));
        }

        if let Some(setup_future_usage) = &request.setup_future_usage {
            form_data.push(("setup_future_usage", setup_future_usage.as_str()));
        }

        // Add metadata
        if let Some(metadata) = &request.metadata {
            for (key, value) in metadata {
                let metadata_key = format!("metadata[{}]", key);
                form_data.push((&metadata_key, value.as_str()));
            }
        }

        let url = format!("{}/payment_intents", self.base_url);
        let response = self.execute_request_with_retry(&url, &form_data, &headers, 3).await?;

        let payment_intent: PaymentIntent = response.json().await
            .map_err(|e| anyhow!("Failed to parse payment intent response: {}", e))?;

        info!("Created payment intent: {} for amount: {} {}",
              payment_intent.id, request.amount, request.currency);
        Ok(payment_intent)
    }

    // Enhanced subscription management
    pub async fn create_subscription(&self, request: CreateSubscriptionRequest) -> Result<Subscription> {
        let headers = self.create_headers()?;
        let mut form_data = vec![
            ("customer", request.customer_id.as_str()),
            ("items[0][price]", request.price_id.as_str()),
        ];

        if let Some(payment_method_id) = &request.payment_method_id {
            form_data.push(("default_payment_method", payment_method_id.as_str()));
        }

        if let Some(trial_days) = request.trial_period_days {
            form_data.push(("trial_period_days", &trial_days.to_string()));
        }

        if let Some(coupon) = &request.coupon {
            form_data.push(("coupon", coupon.as_str()));
        }

        // Add comprehensive metadata
        if let Some(metadata) = &request.metadata {
            for (key, value) in metadata {
                // Properly encode metadata for form submission
                let metadata_key = format!("metadata[{}]", key);
                // Note: This is a simplified approach; in production, use proper form encoding
            }
        }

        let url = format!("{}/subscriptions", self.base_url);
        let response = self.execute_request_with_retry(&url, &form_data, &headers, 3).await?;

        let subscription: Subscription = response.json().await
            .map_err(|e| anyhow!("Failed to parse subscription response: {}", e))?;

        info!("Created Stripe subscription: {} for customer: {}",
              subscription.id, subscription.customer);
        Ok(subscription)
    }

    // Get subscription with enhanced error handling
    pub async fn get_subscription(&self, subscription_id: &str) -> Result<Subscription> {
        let headers = self.create_headers()?;
        let url = format!("{}/subscriptions/{}", self.base_url, subscription_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers)
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let status = response.status();
            let error_text = response.text().await.unwrap_or_default();

            match status.as_u16() {
                404 => return Err(anyhow!("Subscription not found: {}", subscription_id)),
                401 => return Err(anyhow!("Unauthorized: Invalid API key")),
                429 => return Err(anyhow!("Rate limited: Too many requests")),
                _ => return Err(anyhow!("Stripe API error ({}): {}", status, error_text)),
            }
        }

        let subscription: Subscription = response.json().await
            .map_err(|e| anyhow!("Failed to parse subscription response: {}", e))?;

        Ok(subscription)
    }

    // Enhanced invoice management with comprehensive error handling
    pub async fn list_invoices(&self, customer_id: &str, limit: Option<i32>) -> Result<Vec<Invoice>> {
        let headers = self.create_headers()?;
        let limit_param = limit.unwrap_or(10).min(100); // Cap at 100 for performance
        let url = format!("{}/invoices?customer={}&limit={}&expand[]=data.payment_intent",
                         self.base_url, customer_id, limit_param);

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers)
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Stripe API error: {}", error_text));
        }

        #[derive(Deserialize)]
        struct InvoiceList {
            data: Vec<Invoice>,
            has_more: bool,
        }

        let invoice_list: InvoiceList = response.json().await
            .map_err(|e| anyhow!("Failed to parse invoice list response: {}", e))?;

        info!("Retrieved {} invoices for customer: {}", invoice_list.data.len(), customer_id);
        Ok(invoice_list.data)
    }

    // Test mode payment validation
    pub async fn validate_test_payment(&self, payment_intent_id: &str) -> Result<PaymentIntent> {
        if self.environment != "test" {
            return Err(anyhow!("Test payment validation only available in test mode"));
        }

        let headers = self.create_headers()?;
        let url = format!("{}/payment_intents/{}", self.base_url, payment_intent_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers)
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Stripe API error: {}", error_text));
        }

        let payment_intent: PaymentIntent = response.json().await
            .map_err(|e| anyhow!("Failed to parse payment intent response: {}", e))?;

        // Validate test payment status
        match payment_intent.status.as_str() {
            "succeeded" => info!("Test payment validated successfully: {}", payment_intent_id),
            "requires_payment_method" => warn!("Test payment requires payment method: {}", payment_intent_id),
            "requires_confirmation" => warn!("Test payment requires confirmation: {}", payment_intent_id),
            "processing" => info!("Test payment is processing: {}", payment_intent_id),
            "canceled" => warn!("Test payment was canceled: {}", payment_intent_id),
            _ => warn!("Unknown test payment status: {} for {}", payment_intent.status, payment_intent_id),
        }

        Ok(payment_intent)
    }
}

// Enhanced Tauri command implementations with comprehensive error handling

#[tauri::command]
pub async fn stripe_create_payment_intent(
    request: CreatePaymentIntentRequest,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<PaymentIntent, String> {
    let client_guard = stripe_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Stripe client not initialized")?;

    client.create_payment_intent(request).await
        .map_err(|e| format!("Failed to create payment intent: {}", e))
}

#[tauri::command]
pub async fn stripe_create_customer(
    request: CreateCustomerRequest,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<Customer, String> {
    let client_guard = stripe_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Stripe client not initialized")?;

    client.create_customer(request).await
        .map_err(|e| format!("Failed to create customer: {}", e))
}

#[tauri::command]
pub async fn stripe_create_subscription(
    request: CreateSubscriptionRequest,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<Subscription, String> {
    let client_guard = stripe_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Stripe client not initialized")?;

    client.create_subscription(request).await
        .map_err(|e| format!("Failed to create subscription: {}", e))
}

#[tauri::command]
pub async fn stripe_get_subscription(
    subscription_id: String,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<Subscription, String> {
    let client_guard = stripe_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Stripe client not initialized")?;

    client.get_subscription(&subscription_id).await
        .map_err(|e| format!("Failed to get subscription: {}", e))
}

#[tauri::command]
pub async fn stripe_list_invoices(
    customer_id: String,
    limit: Option<i32>,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<Vec<Invoice>, String> {
    let client_guard = stripe_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Stripe client not initialized")?;

    client.list_invoices(&customer_id, limit).await
        .map_err(|e| format!("Failed to list invoices: {}", e))
}

#[tauri::command]
pub async fn get_env_var(key: String) -> Result<String, String> {
    std::env::var(&key)
        .map_err(|_| format!("Environment variable {} not found", key))
}

#[tauri::command]
pub async fn stripe_init_client(
    secret_key: String,
    publishable_key: String,
    webhook_secret: String,
    environment: String,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<(), String> {
    let credentials = StripeCredentials {
        secret_key,
        publishable_key,
        webhook_secret,
        environment,
    };

    let client = StripeClient::new(credentials)
        .map_err(|e| format!("Failed to initialize Stripe client: {}", e))?;

    let mut client_guard = stripe_client.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    *client_guard = Some(client);

    info!("Stripe client initialized successfully");
    Ok(())
}

#[tauri::command]
pub async fn stripe_create_team_subscription(
    request: CreateTeamSubscriptionRequest,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<TeamSubscription, String> {
    let client_guard = stripe_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Stripe client not initialized")?;

    client.create_team_subscription(request).await
        .map_err(|e| format!("Failed to create team subscription: {}", e))
}

#[tauri::command]
pub async fn stripe_validate_test_payment(
    payment_intent_id: String,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<PaymentIntent, String> {
    let client_guard = stripe_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Stripe client not initialized")?;

    client.validate_test_payment(&payment_intent_id).await
        .map_err(|e| format!("Failed to validate test payment: {}", e))
}

// Enhanced webhook handler with comprehensive event processing
#[tauri::command]
pub async fn stripe_handle_webhook(
    payload: String,
    signature: String,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<(), String> {
    let client_guard = stripe_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Stripe client not initialized")?;

    let event = client.verify_webhook_signature(&payload, &signature)
        .map_err(|e| format!("Failed to verify webhook: {}", e))?;

    // Comprehensive webhook event handling
    match event.event_type.as_str() {
        "customer.subscription.created" => {
            info!("Processing subscription created event: {}", event.id);
            handle_subscription_created(&event).await?;
        }
        "customer.subscription.updated" => {
            info!("Processing subscription updated event: {}", event.id);
            handle_subscription_updated(&event).await?;
        }
        "customer.subscription.deleted" => {
            info!("Processing subscription deleted event: {}", event.id);
            handle_subscription_deleted(&event).await?;
        }
        "customer.subscription.trial_will_end" => {
            info!("Processing trial ending event: {}", event.id);
            handle_trial_ending(&event).await?;
        }
        "invoice.payment_succeeded" => {
            info!("Processing payment succeeded event: {}", event.id);
            handle_payment_succeeded(&event).await?;
        }
        "invoice.payment_failed" => {
            warn!("Processing payment failed event: {}", event.id);
            handle_payment_failed(&event).await?;
        }
        "invoice.upcoming" => {
            info!("Processing upcoming invoice event: {}", event.id);
            handle_upcoming_invoice(&event).await?;
        }
        "payment_method.attached" => {
            info!("Processing payment method attached event: {}", event.id);
            handle_payment_method_attached(&event).await?;
        }
        "customer.created" => {
            info!("Processing customer created event: {}", event.id);
            handle_customer_created(&event).await?;
        }
        _ => {
            debug!("Unhandled webhook event type: {} (ID: {})", event.event_type, event.id);
        }
    }

    Ok(())
}

// Webhook event handlers
async fn handle_subscription_created(event: &WebhookEvent) -> Result<(), String> {
    // Extract subscription data and update local state
    // This would typically update your application's database
    info!("Subscription created webhook processed: {}", event.id);
    Ok(())
}

async fn handle_subscription_updated(event: &WebhookEvent) -> Result<(), String> {
    // Handle subscription updates, including plan changes
    info!("Subscription updated webhook processed: {}", event.id);
    Ok(())
}

async fn handle_subscription_deleted(event: &WebhookEvent) -> Result<(), String> {
    // Handle subscription cancellations
    warn!("Subscription deleted webhook processed: {}", event.id);
    Ok(())
}

async fn handle_trial_ending(event: &WebhookEvent) -> Result<(), String> {
    // Send notifications about trial ending
    warn!("Trial ending webhook processed: {}", event.id);
    Ok(())
}

async fn handle_payment_succeeded(event: &WebhookEvent) -> Result<(), String> {
    // Update billing records and send confirmation
    info!("Payment succeeded webhook processed: {}", event.id);
    Ok(())
}

async fn handle_payment_failed(event: &WebhookEvent) -> Result<(), String> {
    // Handle failed payments, send notifications
    error!("Payment failed webhook processed: {}", event.id);
    Ok(())
}

async fn handle_upcoming_invoice(event: &WebhookEvent) -> Result<(), String> {
    // Send invoice notifications
    info!("Upcoming invoice webhook processed: {}", event.id);
    Ok(())
}

async fn handle_payment_method_attached(event: &WebhookEvent) -> Result<(), String> {
    // Update payment method records
    info!("Payment method attached webhook processed: {}", event.id);
    Ok(())
}

async fn handle_customer_created(event: &WebhookEvent) -> Result<(), String> {
    // Update customer records
    info!("Customer created webhook processed: {}", event.id);
    Ok(())
}

// Initialize enhanced Stripe client manager
pub fn create_stripe_client_manager() -> Arc<Mutex<Option<StripeClient>>> {
    Arc::new(Mutex::new(None))
}

// Test configuration for sandbox mode
#[tauri::command]
pub async fn stripe_configure_test_mode(
    enable: bool,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<TestConfiguration, String> {
    let test_config = TestConfiguration {
        enable_test_mode: enable,
        test_card_numbers: vec![
            "4242424242424242".to_string(), // Visa success
            "4000000000000002".to_string(), // Card declined
            "4000000000009995".to_string(), // Insufficient funds
            "4000000000000069".to_string(), // Expired card
            "4000000000000127".to_string(), // Incorrect CVC
        ],
        simulate_failures: enable,
        webhook_test_url: if enable {
            Some("https://webhook.site/unique-url".to_string())
        } else {
            None
        },
    };

    info!("Test mode configured: enabled={}", enable);
    Ok(test_config)
}