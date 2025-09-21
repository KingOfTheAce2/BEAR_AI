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

// Stripe API client with secure credential management
#[derive(Clone)]
pub struct StripeClient {
    client: Client,
    secret_key: String,
    publishable_key: String,
    webhook_secret: String,
    base_url: String,
}

// Secure credential storage
#[derive(Debug)]
pub struct StripeCredentials {
    secret_key: String,
    publishable_key: String,
    webhook_secret: String,
    environment: String, // 'test' or 'live'
}

// Subscription management state
#[derive(Default)]
pub struct SubscriptionState {
    customers: HashMap<String, Customer>,
    subscriptions: HashMap<String, Subscription>,
    payment_methods: HashMap<String, PaymentMethod>,
}

// Stripe API response types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Customer {
    pub id: String,
    pub email: String,
    pub name: Option<String>,
    pub created: i64,
    pub metadata: HashMap<String, String>,
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
    pub items: SubscriptionItems,
    pub metadata: HashMap<String, String>,
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
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Price {
    pub id: String,
    pub unit_amount: Option<i64>,
    pub currency: String,
    pub recurring: Option<Recurring>,
    pub metadata: HashMap<String, String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Recurring {
    pub interval: String,
    pub interval_count: i32,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PaymentMethod {
    pub id: String,
    pub customer: Option<String>,
    #[serde(rename = "type")]
    pub payment_type: String,
    pub card: Option<Card>,
    pub created: i64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Card {
    pub brand: String,
    pub last4: String,
    pub exp_month: i32,
    pub exp_year: i32,
    pub funding: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct Invoice {
    pub id: String,
    pub customer: String,
    pub subscription: Option<String>,
    pub amount_due: i64,
    pub amount_paid: i64,
    pub currency: String,
    pub status: String,
    pub hosted_invoice_url: Option<String>,
    pub invoice_pdf: Option<String>,
    pub due_date: Option<i64>,
    pub paid_at: Option<i64>,
    pub created: i64,
}

// Webhook event handling
#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: WebhookEventData,
    pub created: i64,
    pub livemode: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct WebhookEventData {
    pub object: Value,
    pub previous_attributes: Option<Value>,
}

// Request/Response types for Tauri commands
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateCustomerRequest {
    pub email: String,
    pub name: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateSubscriptionRequest {
    pub customer_id: String,
    pub price_id: String,
    pub payment_method_id: Option<String>,
    pub trial_period_days: Option<i32>,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateSubscriptionRequest {
    pub subscription_id: String,
    pub price_id: Option<String>,
    pub cancel_at_period_end: Option<bool>,
    pub proration_behavior: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreatePaymentIntentRequest {
    pub amount: i64,
    pub currency: String,
    pub customer_id: Option<String>,
    pub payment_method_id: Option<String>,
    pub confirm: Option<bool>,
    pub metadata: Option<HashMap<String, String>>,
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
}

impl StripeClient {
    pub fn new(credentials: StripeCredentials) -> Result<Self> {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;

        Ok(Self {
            client,
            secret_key: credentials.secret_key,
            publishable_key: credentials.publishable_key,
            webhook_secret: credentials.webhook_secret,
            base_url: "https://api.stripe.com/v1".to_string(),
        })
    }

    // Helper method to create authenticated headers
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

        Ok(headers)
    }

    // Customer management
    pub async fn create_customer(&self, request: CreateCustomerRequest) -> Result<Customer> {
        let headers = self.create_headers()?;
        let mut form_data = vec![("email", request.email.as_str())];

        if let Some(name) = &request.name {
            form_data.push(("name", name.as_str()));
        }

        let url = format!("{}/customers", self.base_url);

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .post(&url)
                .headers(headers)
                .form(&form_data)
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Stripe API error: {}", error_text));
        }

        let customer: Customer = response.json().await
            .map_err(|e| anyhow!("Failed to parse customer response: {}", e))?;

        info!("Created Stripe customer: {}", customer.id);
        Ok(customer)
    }

    pub async fn get_customer(&self, customer_id: &str) -> Result<Customer> {
        let headers = self.create_headers()?;
        let url = format!("{}/customers/{}", self.base_url, customer_id);

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

        let customer: Customer = response.json().await
            .map_err(|e| anyhow!("Failed to parse customer response: {}", e))?;

        Ok(customer)
    }

    // Subscription management
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

        let url = format!("{}/subscriptions", self.base_url);

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .post(&url)
                .headers(headers)
                .form(&form_data)
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Stripe API error: {}", error_text));
        }

        let subscription: Subscription = response.json().await
            .map_err(|e| anyhow!("Failed to parse subscription response: {}", e))?;

        info!("Created Stripe subscription: {}", subscription.id);
        Ok(subscription)
    }

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
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Stripe API error: {}", error_text));
        }

        let subscription: Subscription = response.json().await
            .map_err(|e| anyhow!("Failed to parse subscription response: {}", e))?;

        Ok(subscription)
    }

    pub async fn update_subscription(&self, request: UpdateSubscriptionRequest) -> Result<Subscription> {
        let headers = self.create_headers()?;
        let mut form_data = Vec::new();

        if let Some(price_id) = &request.price_id {
            // Get current subscription to update items
            let current_sub = self.get_subscription(&request.subscription_id).await?;
            if let Some(item) = current_sub.items.data.first() {
                form_data.push(("items[0][id]", item.id.as_str()));
                form_data.push(("items[0][price]", price_id.as_str()));
            }
        }

        if let Some(cancel_at_period_end) = request.cancel_at_period_end {
            form_data.push(("cancel_at_period_end", &cancel_at_period_end.to_string()));
        }

        if let Some(proration_behavior) = &request.proration_behavior {
            form_data.push(("proration_behavior", proration_behavior.as_str()));
        }

        let url = format!("{}/subscriptions/{}", self.base_url, request.subscription_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .post(&url)
                .headers(headers)
                .form(&form_data)
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Stripe API error: {}", error_text));
        }

        let subscription: Subscription = response.json().await
            .map_err(|e| anyhow!("Failed to parse subscription response: {}", e))?;

        info!("Updated Stripe subscription: {}", subscription.id);
        Ok(subscription)
    }

    pub async fn cancel_subscription(&self, subscription_id: &str) -> Result<Subscription> {
        let headers = self.create_headers()?;
        let url = format!("{}/subscriptions/{}", self.base_url, subscription_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.delete(&url).headers(headers)
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Stripe API error: {}", error_text));
        }

        let subscription: Subscription = response.json().await
            .map_err(|e| anyhow!("Failed to parse subscription response: {}", e))?;

        info!("Cancelled Stripe subscription: {}", subscription.id);
        Ok(subscription)
    }

    // Payment method management
    pub async fn create_payment_intent(&self, request: CreatePaymentIntentRequest) -> Result<PaymentIntent> {
        let headers = self.create_headers()?;
        let mut form_data = vec![
            ("amount", request.amount.to_string()),
            ("currency", request.currency),
        ];

        if let Some(customer_id) = &request.customer_id {
            form_data.push(("customer", customer_id.clone()));
        }

        if let Some(payment_method_id) = &request.payment_method_id {
            form_data.push(("payment_method", payment_method_id.clone()));
        }

        if let Some(confirm) = request.confirm {
            form_data.push(("confirm", confirm.to_string()));
        }

        let url = format!("{}/payment_intents", self.base_url);

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .post(&url)
                .headers(headers)
                .form(&form_data)
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Stripe API error: {}", error_text));
        }

        let payment_intent: PaymentIntent = response.json().await
            .map_err(|e| anyhow!("Failed to parse payment intent response: {}", e))?;

        info!("Created Stripe payment intent: {}", payment_intent.id);
        Ok(payment_intent)
    }

    // Invoice management
    pub async fn get_upcoming_invoice(&self, customer_id: &str) -> Result<Invoice> {
        let headers = self.create_headers()?;
        let url = format!("{}/invoices/upcoming?customer={}", self.base_url, customer_id);

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

        let invoice: Invoice = response.json().await
            .map_err(|e| anyhow!("Failed to parse invoice response: {}", e))?;

        Ok(invoice)
    }

    pub async fn list_invoices(&self, customer_id: &str, limit: Option<i32>) -> Result<Vec<Invoice>> {
        let headers = self.create_headers()?;
        let limit_param = limit.unwrap_or(10);
        let url = format!("{}/invoices?customer={}&limit={}", self.base_url, customer_id, limit_param);

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
        }

        let invoice_list: InvoiceList = response.json().await
            .map_err(|e| anyhow!("Failed to parse invoice list response: {}", e))?;

        Ok(invoice_list.data)
    }

    // Webhook verification
    pub fn verify_webhook_signature(&self, payload: &str, signature: &str) -> Result<WebhookEvent> {
        // In a real implementation, you would verify the webhook signature using HMAC
        // This is a simplified version for demonstration
        warn!("Webhook signature verification not fully implemented - use with caution in production");

        let event: WebhookEvent = serde_json::from_str(payload)
            .map_err(|e| anyhow!("Failed to parse webhook event: {}", e))?;

        Ok(event)
    }
}

// Tauri command implementations
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
pub async fn stripe_get_customer(
    customer_id: String,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<Customer, String> {
    let client_guard = stripe_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Stripe client not initialized")?;

    client.get_customer(&customer_id).await
        .map_err(|e| format!("Failed to get customer: {}", e))
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
pub async fn stripe_update_subscription(
    request: UpdateSubscriptionRequest,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<Subscription, String> {
    let client_guard = stripe_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Stripe client not initialized")?;

    client.update_subscription(request).await
        .map_err(|e| format!("Failed to update subscription: {}", e))
}

#[tauri::command]
pub async fn stripe_cancel_subscription(
    subscription_id: String,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<Subscription, String> {
    let client_guard = stripe_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Stripe client not initialized")?;

    client.cancel_subscription(&subscription_id).await
        .map_err(|e| format!("Failed to cancel subscription: {}", e))
}

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
pub async fn stripe_get_invoices(
    customer_id: String,
    limit: Option<i32>,
    stripe_client: State<'_, Arc<Mutex<Option<StripeClient>>>>
) -> Result<Vec<Invoice>, String> {
    let client_guard = stripe_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Stripe client not initialized")?;

    client.list_invoices(&customer_id, limit).await
        .map_err(|e| format!("Failed to get invoices: {}", e))
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

// Webhook handler for subscription updates
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

    // Handle different webhook event types
    match event.event_type.as_str() {
        "customer.subscription.created" => {
            info!("Subscription created: {}", event.id);
            // Handle subscription creation
        }
        "customer.subscription.updated" => {
            info!("Subscription updated: {}", event.id);
            // Handle subscription updates
        }
        "customer.subscription.deleted" => {
            info!("Subscription deleted: {}", event.id);
            // Handle subscription deletion
        }
        "invoice.payment_succeeded" => {
            info!("Payment succeeded: {}", event.id);
            // Handle successful payment
        }
        "invoice.payment_failed" => {
            warn!("Payment failed: {}", event.id);
            // Handle failed payment
        }
        _ => {
            debug!("Unhandled webhook event type: {}", event.event_type);
        }
    }

    Ok(())
}

// Initialize Stripe client manager
pub fn create_stripe_client_manager() -> Arc<Mutex<Option<StripeClient>>> {
    Arc::new(Mutex::new(None))
}