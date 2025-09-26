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
use ring::hmac;
use hex;

// Mollie API client with secure credential management
#[derive(Clone)]
pub struct MollieClient {
    client: Client,
    api_key: String,
    webhook_secret: String,
    base_url: String,
    environment: MollieEnvironment,
}

#[derive(Debug, Clone)]
pub enum MollieEnvironment {
    Test,
    Live,
}

impl MollieEnvironment {
    pub fn base_url(&self) -> &'static str {
        match self {
            MollieEnvironment::Test => "https://api.mollie.com/v2",
            MollieEnvironment::Live => "https://api.mollie.com/v2",
        }
    }

    pub fn from_string(env: &str) -> Self {
        match env.to_lowercase().as_str() {
            "live" | "production" => MollieEnvironment::Live,
            _ => MollieEnvironment::Test,
        }
    }
}

// Secure credential storage
#[derive(Debug)]
pub struct MollieCredentials {
    api_key: String,
    webhook_secret: String,
    environment: String,
}

// Mollie payment state management
#[derive(Default)]
pub struct MolliePaymentState {
    customers: HashMap<String, MollieCustomer>,
    payments: HashMap<String, MolliePayment>,
    subscriptions: HashMap<String, MollieSubscription>,
}

// Mollie API response types
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MollieCustomer {
    pub id: String,
    pub mode: String,
    pub name: String,
    pub email: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub locale: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
    #[serde(rename = "_links")]
    pub links: Option<MollieLinks>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MolliePayment {
    pub id: String,
    pub mode: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub status: String,
    #[serde(rename = "isCancelable")]
    pub is_cancelable: Option<bool>,
    #[serde(rename = "paidAt")]
    pub paid_at: Option<String>,
    #[serde(rename = "canceledAt")]
    pub canceled_at: Option<String>,
    #[serde(rename = "expiresAt")]
    pub expires_at: Option<String>,
    #[serde(rename = "expiredAt")]
    pub expired_at: Option<String>,
    #[serde(rename = "failedAt")]
    pub failed_at: Option<String>,
    pub amount: MollieAmount,
    #[serde(rename = "amountRefunded")]
    pub amount_refunded: Option<MollieAmount>,
    #[serde(rename = "amountRemaining")]
    pub amount_remaining: Option<MollieAmount>,
    pub description: String,
    #[serde(rename = "redirectUrl")]
    pub redirect_url: Option<String>,
    #[serde(rename = "webhookUrl")]
    pub webhook_url: Option<String>,
    pub method: Option<String>,
    #[serde(rename = "countryCode")]
    pub country_code: Option<String>,
    pub locale: Option<String>,
    #[serde(rename = "customerId")]
    pub customer_id: Option<String>,
    #[serde(rename = "sequenceType")]
    pub sequence_type: Option<String>,
    #[serde(rename = "mandateId")]
    pub mandate_id: Option<String>,
    #[serde(rename = "subscriptionId")]
    pub subscription_id: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
    pub details: Option<Value>,
    #[serde(rename = "_links")]
    pub links: Option<MollieLinks>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MollieSubscription {
    pub id: String,
    pub mode: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub status: String,
    pub amount: MollieAmount,
    pub times: Option<i32>,
    #[serde(rename = "timesRemaining")]
    pub times_remaining: Option<i32>,
    pub interval: String,
    #[serde(rename = "startDate")]
    pub start_date: String,
    #[serde(rename = "nextPaymentDate")]
    pub next_payment_date: Option<String>,
    pub description: String,
    pub method: Option<String>,
    #[serde(rename = "mandateId")]
    pub mandate_id: String,
    #[serde(rename = "canceledAt")]
    pub canceled_at: Option<String>,
    #[serde(rename = "webhookUrl")]
    pub webhook_url: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
    #[serde(rename = "_links")]
    pub links: Option<MollieLinks>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MollieAmount {
    pub currency: String,
    pub value: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MollieMandate {
    pub id: String,
    pub mode: String,
    pub status: String,
    pub method: String,
    pub details: Option<Value>,
    #[serde(rename = "mandateReference")]
    pub mandate_reference: Option<String>,
    #[serde(rename = "signatureDate")]
    pub signature_date: Option<String>,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "_links")]
    pub links: Option<MollieLinks>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MollieRefund {
    pub id: String,
    pub amount: MollieAmount,
    pub status: String,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    pub description: String,
    #[serde(rename = "paymentId")]
    pub payment_id: String,
    #[serde(rename = "settlementAmount")]
    pub settlement_amount: Option<MollieAmount>,
    pub metadata: Option<HashMap<String, String>>,
    #[serde(rename = "_links")]
    pub links: Option<MollieLinks>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MollieChargeback {
    pub id: String,
    pub amount: MollieAmount,
    #[serde(rename = "settlementAmount")]
    pub settlement_amount: MollieAmount,
    #[serde(rename = "createdAt")]
    pub created_at: String,
    #[serde(rename = "reversedAt")]
    pub reversed_at: Option<String>,
    #[serde(rename = "paymentId")]
    pub payment_id: String,
    #[serde(rename = "_links")]
    pub links: Option<MollieLinks>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MollieLinks {
    #[serde(rename = "self")]
    pub self_link: Option<MollieLink>,
    pub checkout: Option<MollieLink>,
    pub dashboard: Option<MollieLink>,
    pub documentation: Option<MollieLink>,
    pub customer: Option<MollieLink>,
    pub mandate: Option<MollieLink>,
    pub subscription: Option<MollieLink>,
    pub payment: Option<MollieLink>,
    pub refund: Option<MollieLink>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MollieLink {
    pub href: String,
    #[serde(rename = "type")]
    pub link_type: String,
}

// Webhook event handling
#[derive(Debug, Serialize, Deserialize)]
pub struct MollieWebhookEvent {
    pub id: String,
}

// Request types for API calls
#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMollieCustomerRequest {
    pub name: String,
    pub email: String,
    pub locale: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMolliePaymentRequest {
    pub amount: MollieAmount,
    pub description: String,
    #[serde(rename = "redirectUrl")]
    pub redirect_url: Option<String>,
    #[serde(rename = "webhookUrl")]
    pub webhook_url: Option<String>,
    pub locale: Option<String>,
    pub method: Option<String>,
    #[serde(rename = "customerId")]
    pub customer_id: Option<String>,
    #[serde(rename = "sequenceType")]
    pub sequence_type: Option<String>,
    #[serde(rename = "mandateId")]
    pub mandate_id: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMollieSubscriptionRequest {
    pub amount: MollieAmount,
    pub interval: String,
    pub description: String,
    #[serde(rename = "webhookUrl")]
    pub webhook_url: Option<String>,
    pub times: Option<i32>,
    #[serde(rename = "startDate")]
    pub start_date: Option<String>,
    pub method: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct UpdateMollieSubscriptionRequest {
    pub amount: Option<MollieAmount>,
    pub times: Option<i32>,
    #[serde(rename = "startDate")]
    pub start_date: Option<String>,
    #[serde(rename = "webhookUrl")]
    pub webhook_url: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMollieRefundRequest {
    pub amount: Option<MollieAmount>,
    pub description: Option<String>,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct CreateMollieMandateRequest {
    pub method: String,
    #[serde(rename = "consumerName")]
    pub consumer_name: Option<String>,
    #[serde(rename = "consumerAccount")]
    pub consumer_account: Option<String>,
    #[serde(rename = "consumerBic")]
    pub consumer_bic: Option<String>,
    #[serde(rename = "signatureDate")]
    pub signature_date: Option<String>,
    #[serde(rename = "mandateReference")]
    pub mandate_reference: Option<String>,
}

// European payment method configurations
#[derive(Debug, Serialize, Deserialize)]
pub struct SepaDirectDebitDetails {
    #[serde(rename = "consumerName")]
    pub consumer_name: String,
    #[serde(rename = "consumerAccount")]
    pub consumer_account: String,
    #[serde(rename = "consumerBic")]
    pub consumer_bic: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct IdealDetails {
    pub issuer: Option<String>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct BancontactDetails {
    #[serde(rename = "cardNumber")]
    pub card_number: Option<String>,
}

// Response wrapper for paginated results
#[derive(Debug, Serialize, Deserialize)]
pub struct MollieListResponse<T> {
    pub count: i32,
    #[serde(rename = "_embedded")]
    pub embedded: Option<MollieEmbedded<T>>,
    #[serde(rename = "_links")]
    pub links: Option<MollieListLinks>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MollieEmbedded<T> {
    pub payments: Option<Vec<T>>,
    pub customers: Option<Vec<T>>,
    pub subscriptions: Option<Vec<T>>,
    pub refunds: Option<Vec<T>>,
    pub chargebacks: Option<Vec<T>>,
    pub mandates: Option<Vec<T>>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct MollieListLinks {
    #[serde(rename = "self")]
    pub self_link: MollieLink,
    pub previous: Option<MollieLink>,
    pub next: Option<MollieLink>,
    pub documentation: MollieLink,
}

impl MollieClient {
    pub fn new(credentials: MollieCredentials) -> Result<Self> {
        let environment = MollieEnvironment::from_string(&credentials.environment);
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .build()
            .map_err(|e| anyhow!("Failed to create HTTP client: {}", e))?;

        Ok(Self {
            client,
            api_key: credentials.api_key,
            webhook_secret: credentials.webhook_secret,
            base_url: environment.base_url().to_string(),
            environment,
        })
    }

    // Helper method to create authenticated headers
    fn create_headers(&self) -> Result<HeaderMap> {
        let mut headers = HeaderMap::new();

        let auth_value = format!("Bearer {}", self.api_key);
        headers.insert(
            AUTHORIZATION,
            HeaderValue::from_str(&auth_value)
                .map_err(|e| anyhow!("Invalid authorization header: {}", e))?
        );

        headers.insert(
            CONTENT_TYPE,
            HeaderValue::from_static("application/json")
        );

        Ok(headers)
    }

    // Customer management
    pub async fn create_customer(&self, request: CreateMollieCustomerRequest) -> Result<MollieCustomer> {
        let headers = self.create_headers()?;
        let url = format!("{}/customers", self.base_url);

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .post(&url)
                .headers(headers)
                .json(&request)
                .send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let customer: MollieCustomer = response.json().await
            .map_err(|e| anyhow!("Failed to parse customer response: {}", e))?;

        info!("Created Mollie customer: {}", customer.id);
        Ok(customer)
    }

    pub async fn get_customer(&self, customer_id: &str) -> Result<MollieCustomer> {
        let headers = self.create_headers()?;
        let url = format!("{}/customers/{}", self.base_url, customer_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let customer: MollieCustomer = response.json().await
            .map_err(|e| anyhow!("Failed to parse customer response: {}", e))?;

        Ok(customer)
    }

    pub async fn update_customer(&self, customer_id: &str, request: CreateMollieCustomerRequest) -> Result<MollieCustomer> {
        let headers = self.create_headers()?;
        let url = format!("{}/customers/{}", self.base_url, customer_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .patch(&url)
                .headers(headers)
                .json(&request)
                .send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let customer: MollieCustomer = response.json().await
            .map_err(|e| anyhow!("Failed to parse customer response: {}", e))?;

        info!("Updated Mollie customer: {}", customer.id);
        Ok(customer)
    }

    pub async fn delete_customer(&self, customer_id: &str) -> Result<()> {
        let headers = self.create_headers()?;
        let url = format!("{}/customers/{}", self.base_url, customer_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.delete(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        info!("Deleted Mollie customer: {}", customer_id);
        Ok(())
    }

    // Payment management
    pub async fn create_payment(&self, request: CreateMolliePaymentRequest) -> Result<MolliePayment> {
        let headers = self.create_headers()?;
        let url = format!("{}/payments", self.base_url);

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .post(&url)
                .headers(headers)
                .json(&request)
                .send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let payment: MolliePayment = response.json().await
            .map_err(|e| anyhow!("Failed to parse payment response: {}", e))?;

        info!("Created Mollie payment: {}", payment.id);
        Ok(payment)
    }

    pub async fn get_payment(&self, payment_id: &str) -> Result<MolliePayment> {
        let headers = self.create_headers()?;
        let url = format!("{}/payments/{}", self.base_url, payment_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let payment: MolliePayment = response.json().await
            .map_err(|e| anyhow!("Failed to parse payment response: {}", e))?;

        Ok(payment)
    }

    pub async fn cancel_payment(&self, payment_id: &str) -> Result<MolliePayment> {
        let headers = self.create_headers()?;
        let url = format!("{}/payments/{}", self.base_url, payment_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.delete(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let payment: MolliePayment = response.json().await
            .map_err(|e| anyhow!("Failed to parse payment response: {}", e))?;

        info!("Cancelled Mollie payment: {}", payment.id);
        Ok(payment)
    }

    pub async fn list_payments(&self, customer_id: Option<&str>, limit: Option<i32>) -> Result<Vec<MolliePayment>> {
        let headers = self.create_headers()?;
        let mut url = format!("{}/payments", self.base_url);

        let mut params = Vec::new();
        if let Some(customer_id) = customer_id {
            params.push(format!("customerId={}", customer_id));
        }
        if let Some(limit) = limit {
            params.push(format!("limit={}", limit));
        }

        if !params.is_empty() {
            url.push('?');
            url.push_str(&params.join("&"));
        }

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let payment_list: MollieListResponse<MolliePayment> = response.json().await
            .map_err(|e| anyhow!("Failed to parse payment list response: {}", e))?;

        Ok(payment_list.embedded
            .and_then(|e| e.payments)
            .unwrap_or_default())
    }

    // Subscription management
    pub async fn create_subscription(&self, customer_id: &str, request: CreateMollieSubscriptionRequest) -> Result<MollieSubscription> {
        let headers = self.create_headers()?;
        let url = format!("{}/customers/{}/subscriptions", self.base_url, customer_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .post(&url)
                .headers(headers)
                .json(&request)
                .send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let subscription: MollieSubscription = response.json().await
            .map_err(|e| anyhow!("Failed to parse subscription response: {}", e))?;

        info!("Created Mollie subscription: {}", subscription.id);
        Ok(subscription)
    }

    pub async fn get_subscription(&self, customer_id: &str, subscription_id: &str) -> Result<MollieSubscription> {
        let headers = self.create_headers()?;
        let url = format!("{}/customers/{}/subscriptions/{}", self.base_url, customer_id, subscription_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let subscription: MollieSubscription = response.json().await
            .map_err(|e| anyhow!("Failed to parse subscription response: {}", e))?;

        Ok(subscription)
    }

    pub async fn update_subscription(&self, customer_id: &str, subscription_id: &str, request: UpdateMollieSubscriptionRequest) -> Result<MollieSubscription> {
        let headers = self.create_headers()?;
        let url = format!("{}/customers/{}/subscriptions/{}", self.base_url, customer_id, subscription_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .patch(&url)
                .headers(headers)
                .json(&request)
                .send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let subscription: MollieSubscription = response.json().await
            .map_err(|e| anyhow!("Failed to parse subscription response: {}", e))?;

        info!("Updated Mollie subscription: {}", subscription.id);
        Ok(subscription)
    }

    pub async fn cancel_subscription(&self, customer_id: &str, subscription_id: &str) -> Result<MollieSubscription> {
        let headers = self.create_headers()?;
        let url = format!("{}/customers/{}/subscriptions/{}", self.base_url, customer_id, subscription_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.delete(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let subscription: MollieSubscription = response.json().await
            .map_err(|e| anyhow!("Failed to parse subscription response: {}", e))?;

        info!("Cancelled Mollie subscription: {}", subscription.id);
        Ok(subscription)
    }

    pub async fn list_subscriptions(&self, customer_id: &str, limit: Option<i32>) -> Result<Vec<MollieSubscription>> {
        let headers = self.create_headers()?;
        let mut url = format!("{}/customers/{}/subscriptions", self.base_url, customer_id);

        if let Some(limit) = limit {
            url.push_str(&format!("?limit={}", limit));
        }

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let subscription_list: MollieListResponse<MollieSubscription> = response.json().await
            .map_err(|e| anyhow!("Failed to parse subscription list response: {}", e))?;

        Ok(subscription_list.embedded
            .and_then(|e| e.subscriptions)
            .unwrap_or_default())
    }

    // Mandate management for SEPA Direct Debit
    pub async fn create_mandate(&self, customer_id: &str, request: CreateMollieMandateRequest) -> Result<MollieMandate> {
        let headers = self.create_headers()?;
        let url = format!("{}/customers/{}/mandates", self.base_url, customer_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .post(&url)
                .headers(headers)
                .json(&request)
                .send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let mandate: MollieMandate = response.json().await
            .map_err(|e| anyhow!("Failed to parse mandate response: {}", e))?;

        info!("Created Mollie mandate: {}", mandate.id);
        Ok(mandate)
    }

    pub async fn get_mandate(&self, customer_id: &str, mandate_id: &str) -> Result<MollieMandate> {
        let headers = self.create_headers()?;
        let url = format!("{}/customers/{}/mandates/{}", self.base_url, customer_id, mandate_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let mandate: MollieMandate = response.json().await
            .map_err(|e| anyhow!("Failed to parse mandate response: {}", e))?;

        Ok(mandate)
    }

    pub async fn revoke_mandate(&self, customer_id: &str, mandate_id: &str) -> Result<()> {
        let headers = self.create_headers()?;
        let url = format!("{}/customers/{}/mandates/{}", self.base_url, customer_id, mandate_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.delete(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        info!("Revoked Mollie mandate: {}", mandate_id);
        Ok(())
    }

    pub async fn list_mandates(&self, customer_id: &str, limit: Option<i32>) -> Result<Vec<MollieMandate>> {
        let headers = self.create_headers()?;
        let mut url = format!("{}/customers/{}/mandates", self.base_url, customer_id);

        if let Some(limit) = limit {
            url.push_str(&format!("?limit={}", limit));
        }

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let mandate_list: MollieListResponse<MollieMandate> = response.json().await
            .map_err(|e| anyhow!("Failed to parse mandate list response: {}", e))?;

        Ok(mandate_list.embedded
            .and_then(|e| e.mandates)
            .unwrap_or_default())
    }

    // Refund management
    pub async fn create_refund(&self, payment_id: &str, request: CreateMollieRefundRequest) -> Result<MollieRefund> {
        let headers = self.create_headers()?;
        let url = format!("{}/payments/{}/refunds", self.base_url, payment_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client
                .post(&url)
                .headers(headers)
                .json(&request)
                .send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let refund: MollieRefund = response.json().await
            .map_err(|e| anyhow!("Failed to parse refund response: {}", e))?;

        info!("Created Mollie refund: {}", refund.id);
        Ok(refund)
    }

    pub async fn get_refund(&self, payment_id: &str, refund_id: &str) -> Result<MollieRefund> {
        let headers = self.create_headers()?;
        let url = format!("{}/payments/{}/refunds/{}", self.base_url, payment_id, refund_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let refund: MollieRefund = response.json().await
            .map_err(|e| anyhow!("Failed to parse refund response: {}", e))?;

        Ok(refund)
    }

    pub async fn list_refunds(&self, payment_id: &str, limit: Option<i32>) -> Result<Vec<MollieRefund>> {
        let headers = self.create_headers()?;
        let mut url = format!("{}/payments/{}/refunds", self.base_url, payment_id);

        if let Some(limit) = limit {
            url.push_str(&format!("?limit={}", limit));
        }

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let refund_list: MollieListResponse<MollieRefund> = response.json().await
            .map_err(|e| anyhow!("Failed to parse refund list response: {}", e))?;

        Ok(refund_list.embedded
            .and_then(|e| e.refunds)
            .unwrap_or_default())
    }

    // Chargeback management
    pub async fn get_chargeback(&self, payment_id: &str, chargeback_id: &str) -> Result<MollieChargeback> {
        let headers = self.create_headers()?;
        let url = format!("{}/payments/{}/chargebacks/{}", self.base_url, payment_id, chargeback_id);

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let chargeback: MollieChargeback = response.json().await
            .map_err(|e| anyhow!("Failed to parse chargeback response: {}", e))?;

        Ok(chargeback)
    }

    pub async fn list_chargebacks(&self, payment_id: &str, limit: Option<i32>) -> Result<Vec<MollieChargeback>> {
        let headers = self.create_headers()?;
        let mut url = format!("{}/payments/{}/chargebacks", self.base_url, payment_id);

        if let Some(limit) = limit {
            url.push_str(&format!("?limit={}", limit));
        }

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let chargeback_list: MollieListResponse<MollieChargeback> = response.json().await
            .map_err(|e| anyhow!("Failed to parse chargeback list response: {}", e))?;

        Ok(chargeback_list.embedded
            .and_then(|e| e.chargebacks)
            .unwrap_or_default())
    }

    // Webhook signature verification
    pub fn verify_webhook_signature(&self, payload: &str, signature: &str) -> Result<MollieWebhookEvent> {
        // Verify webhook signature using ring's HMAC-SHA256
        let key = hmac::Key::new(hmac::HMAC_SHA256, self.webhook_secret.as_bytes());
        let computed_signature = hmac::sign(&key, payload.as_bytes());
        let expected_signature = hex::encode(computed_signature.as_ref());

        if signature != expected_signature {
            return Err(anyhow!("Invalid webhook signature"));
        }

        let event: MollieWebhookEvent = serde_json::from_str(payload)
            .map_err(|e| anyhow!("Failed to parse webhook event: {}", e))?;

        Ok(event)
    }

    // Get available payment methods
    pub async fn get_payment_methods(&self, amount: Option<&MollieAmount>, locale: Option<&str>) -> Result<Value> {
        let headers = self.create_headers()?;
        let mut url = format!("{}/methods", self.base_url);

        let mut params = Vec::new();
        if let Some(amount) = amount {
            params.push(format!("amount[currency]={}&amount[value]={}", amount.currency, amount.value));
        }
        if let Some(locale) = locale {
            params.push(format!("locale={}", locale));
        }

        if !params.is_empty() {
            url.push('?');
            url.push_str(&params.join("&"));
        }

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let methods: Value = response.json().await
            .map_err(|e| anyhow!("Failed to parse payment methods response: {}", e))?;

        Ok(methods)
    }

    // Get iDEAL issuers
    pub async fn get_ideal_issuers(&self) -> Result<Value> {
        let headers = self.create_headers()?;
        let url = format!("{}/methods/ideal", self.base_url);

        let response = timeout(
            Duration::from_secs(30),
            self.client.get(&url).headers(headers).send()
        ).await
        .map_err(|_| anyhow!("Request timeout"))?
        .map_err(|e| anyhow!("HTTP request failed: {}", e))?;

        if !response.status().is_success() {
            let error_text = response.text().await.unwrap_or_default();
            return Err(anyhow!("Mollie API error: {}", error_text));
        }

        let issuers: Value = response.json().await
            .map_err(|e| anyhow!("Failed to parse iDEAL issuers response: {}", e))?;

        Ok(issuers)
    }
}

// Tauri command implementations
#[tauri::command]
pub async fn mollie_create_customer(
    request: CreateMollieCustomerRequest,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MollieCustomer, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.create_customer(request).await
        .map_err(|e| format!("Failed to create customer: {}", e))
}

#[tauri::command]
pub async fn mollie_get_customer(
    customer_id: String,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MollieCustomer, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.get_customer(&customer_id).await
        .map_err(|e| format!("Failed to get customer: {}", e))
}

#[tauri::command]
pub async fn mollie_update_customer(
    customer_id: String,
    request: CreateMollieCustomerRequest,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MollieCustomer, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.update_customer(&customer_id, request).await
        .map_err(|e| format!("Failed to update customer: {}", e))
}

#[tauri::command]
pub async fn mollie_delete_customer(
    customer_id: String,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<(), String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.delete_customer(&customer_id).await
        .map_err(|e| format!("Failed to delete customer: {}", e))
}

#[tauri::command]
pub async fn mollie_create_payment(
    request: CreateMolliePaymentRequest,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MolliePayment, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.create_payment(request).await
        .map_err(|e| format!("Failed to create payment: {}", e))
}

#[tauri::command]
pub async fn mollie_get_payment(
    payment_id: String,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MolliePayment, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.get_payment(&payment_id).await
        .map_err(|e| format!("Failed to get payment: {}", e))
}

#[tauri::command]
pub async fn mollie_cancel_payment(
    payment_id: String,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MolliePayment, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.cancel_payment(&payment_id).await
        .map_err(|e| format!("Failed to cancel payment: {}", e))
}

#[tauri::command]
pub async fn mollie_list_payments(
    customer_id: Option<String>,
    limit: Option<i32>,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<Vec<MolliePayment>, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.list_payments(customer_id.as_deref(), limit).await
        .map_err(|e| format!("Failed to list payments: {}", e))
}

#[tauri::command]
pub async fn mollie_create_subscription(
    customer_id: String,
    request: CreateMollieSubscriptionRequest,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MollieSubscription, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.create_subscription(&customer_id, request).await
        .map_err(|e| format!("Failed to create subscription: {}", e))
}

#[tauri::command]
pub async fn mollie_get_subscription(
    customer_id: String,
    subscription_id: String,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MollieSubscription, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.get_subscription(&customer_id, &subscription_id).await
        .map_err(|e| format!("Failed to get subscription: {}", e))
}

#[tauri::command]
pub async fn mollie_update_subscription(
    customer_id: String,
    subscription_id: String,
    request: UpdateMollieSubscriptionRequest,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MollieSubscription, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.update_subscription(&customer_id, &subscription_id, request).await
        .map_err(|e| format!("Failed to update subscription: {}", e))
}

#[tauri::command]
pub async fn mollie_cancel_subscription(
    customer_id: String,
    subscription_id: String,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MollieSubscription, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.cancel_subscription(&customer_id, &subscription_id).await
        .map_err(|e| format!("Failed to cancel subscription: {}", e))
}

#[tauri::command]
pub async fn mollie_list_subscriptions(
    customer_id: String,
    limit: Option<i32>,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<Vec<MollieSubscription>, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.list_subscriptions(&customer_id, limit).await
        .map_err(|e| format!("Failed to list subscriptions: {}", e))
}

#[tauri::command]
pub async fn mollie_create_mandate(
    customer_id: String,
    request: CreateMollieMandateRequest,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MollieMandate, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.create_mandate(&customer_id, request).await
        .map_err(|e| format!("Failed to create mandate: {}", e))
}

#[tauri::command]
pub async fn mollie_get_mandate(
    customer_id: String,
    mandate_id: String,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MollieMandate, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.get_mandate(&customer_id, &mandate_id).await
        .map_err(|e| format!("Failed to get mandate: {}", e))
}

#[tauri::command]
pub async fn mollie_revoke_mandate(
    customer_id: String,
    mandate_id: String,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<(), String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.revoke_mandate(&customer_id, &mandate_id).await
        .map_err(|e| format!("Failed to revoke mandate: {}", e))
}

#[tauri::command]
pub async fn mollie_list_mandates(
    customer_id: String,
    limit: Option<i32>,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<Vec<MollieMandate>, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.list_mandates(&customer_id, limit).await
        .map_err(|e| format!("Failed to list mandates: {}", e))
}

#[tauri::command]
pub async fn mollie_create_refund(
    payment_id: String,
    request: CreateMollieRefundRequest,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MollieRefund, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.create_refund(&payment_id, request).await
        .map_err(|e| format!("Failed to create refund: {}", e))
}

#[tauri::command]
pub async fn mollie_get_refund(
    payment_id: String,
    refund_id: String,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MollieRefund, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.get_refund(&payment_id, &refund_id).await
        .map_err(|e| format!("Failed to get refund: {}", e))
}

#[tauri::command]
pub async fn mollie_list_refunds(
    payment_id: String,
    limit: Option<i32>,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<Vec<MollieRefund>, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.list_refunds(&payment_id, limit).await
        .map_err(|e| format!("Failed to list refunds: {}", e))
}

#[tauri::command]
pub async fn mollie_get_chargeback(
    payment_id: String,
    chargeback_id: String,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<MollieChargeback, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.get_chargeback(&payment_id, &chargeback_id).await
        .map_err(|e| format!("Failed to get chargeback: {}", e))
}

#[tauri::command]
pub async fn mollie_list_chargebacks(
    payment_id: String,
    limit: Option<i32>,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<Vec<MollieChargeback>, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.list_chargebacks(&payment_id, limit).await
        .map_err(|e| format!("Failed to list chargebacks: {}", e))
}

#[tauri::command]
pub async fn mollie_get_payment_methods(
    amount: Option<MollieAmount>,
    locale: Option<String>,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<Value, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.get_payment_methods(amount.as_ref(), locale.as_deref()).await
        .map_err(|e| format!("Failed to get payment methods: {}", e))
}

#[tauri::command]
pub async fn mollie_get_ideal_issuers(
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<Value, String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    client.get_ideal_issuers().await
        .map_err(|e| format!("Failed to get iDEAL issuers: {}", e))
}

#[tauri::command]
pub async fn mollie_init_client(
    api_key: String,
    webhook_secret: String,
    environment: String,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<(), String> {
    let credentials = MollieCredentials {
        api_key,
        webhook_secret,
        environment,
    };

    let client = MollieClient::new(credentials)
        .map_err(|e| format!("Failed to initialize Mollie client: {}", e))?;

    let mut client_guard = mollie_client.lock()
        .map_err(|e| format!("Failed to acquire lock: {}", e))?;
    *client_guard = Some(client);

    info!("Mollie client initialized successfully");
    Ok(())
}

// Webhook handler for payment and subscription updates
#[tauri::command]
pub async fn mollie_handle_webhook(
    payload: String,
    signature: String,
    mollie_client: State<'_, Arc<Mutex<Option<MollieClient>>>>
) -> Result<(), String> {
    let client_guard = mollie_client.lock().map_err(|e| format!("Failed to acquire lock: {}", e))?;
    let client = client_guard.as_ref().ok_or("Mollie client not initialized")?;

    let event = client.verify_webhook_signature(&payload, &signature)
        .map_err(|e| format!("Failed to verify webhook: {}", e))?;

    // Extract the payment/subscription ID from the webhook event
    let resource_id = &event.id;

    // Fetch the updated resource to get the current status
    // Note: Mollie webhooks only contain the ID, so we need to fetch the resource
    if resource_id.starts_with("tr_") {
        // This is a payment
        match client.get_payment(resource_id).await {
            Ok(payment) => {
                info!("Payment status updated: {} - {}", payment.id, payment.status);

                match payment.status.as_str() {
                    "paid" => {
                        info!("Payment successful: {}", payment.id);
                        // Handle successful payment
                    }
                    "failed" | "canceled" | "expired" => {
                        warn!("Payment failed/canceled: {} - {}", payment.id, payment.status);
                        // Handle failed payment
                    }
                    "pending" | "open" => {
                        debug!("Payment pending: {}", payment.id);
                        // Handle pending payment
                    }
                    _ => {
                        debug!("Unhandled payment status: {}", payment.status);
                    }
                }
            }
            Err(e) => {
                error!("Failed to fetch payment for webhook: {}", e);
                return Err(format!("Failed to fetch payment: {}", e));
            }
        }
    } else if resource_id.starts_with("sub_") {
        // This is a subscription
        // Note: We would need customer ID to fetch subscription
        info!("Subscription webhook received for: {}", resource_id);
        // In a real implementation, you would store customer-subscription mappings
        // or use the subscription endpoint that doesn't require customer ID
    }

    Ok(())
}

// Initialize Mollie client manager
pub fn create_mollie_client_manager() -> Arc<Mutex<Option<MollieClient>>> {
    Arc::new(Mutex::new(None))
}