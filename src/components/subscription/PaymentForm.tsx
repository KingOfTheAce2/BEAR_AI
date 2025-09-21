import React, { useState, useEffect } from 'react';
import { loadStripe, Stripe, StripeElements } from '@stripe/stripe-js';
import {
  Elements,
  CardElement,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';
import { invoke } from '@tauri-apps/api/tauri';
import {
  CreditCard,
  Lock,
  AlertCircle,
  CheckCircle,
  Loader2,
  Shield,
  DollarSign,
} from 'lucide-react';

// Types for payment processing
interface PaymentFormProps {
  customerId?: string;
  priceId: string;
  planName: string;
  amount: number;
  currency: string;
  onSuccess: (subscription: any) => void;
  onError: (error: string) => void;
  isTeamSubscription?: boolean;
  teamDetails?: {
    teamName: string;
    adminEmail: string;
    maxMembers: number;
  };
}

interface PaymentIntent {
  id: string;
  client_secret: string;
  status: string;
}

interface StripeConfig {
  publishableKey: string;
  environment: 'test' | 'live';
}

// Stripe configuration hook
const useStripeConfig = () => {
  const [config, setConfig] = useState<StripeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Get Stripe configuration from environment
        const publishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY ||
                              await invoke('get_env_var', { key: 'STRIPE_PUBLISHABLE_KEY' });
        const environment = import.meta.env.VITE_STRIPE_ENVIRONMENT ||
                           await invoke('get_env_var', { key: 'STRIPE_ENVIRONMENT' }) || 'test';

        if (!publishableKey) {
          throw new Error('Stripe publishable key not configured');
        }

        setConfig({
          publishableKey,
          environment: environment as 'test' | 'live',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load Stripe configuration');
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, []);

  return { config, loading, error };
};

// Payment form component with Stripe Elements
const PaymentFormInner: React.FC<PaymentFormProps> = ({
  customerId,
  priceId,
  planName,
  amount,
  currency,
  onSuccess,
  onError,
  isTeamSubscription = false,
  teamDetails,
}) => {
  const stripe = useStripe();
  const elements = useElements();

  const [processing, setProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Form state for customer details
  const [customerDetails, setCustomerDetails] = useState({
    email: '',
    name: '',
    address: {
      line1: '',
      city: '',
      state: '',
      postal_code: '',
      country: 'US',
    },
  });

  // Initialize payment intent
  useEffect(() => {
    const initializePayment = async () => {
      try {
        const paymentIntent: PaymentIntent = await invoke('stripe_create_payment_intent', {
          request: {
            amount: amount * 100, // Convert to cents
            currency: currency.toLowerCase(),
            customer_id: customerId,
            metadata: {
              plan_name: planName,
              price_id: priceId,
              ...(isTeamSubscription && teamDetails ? {
                team_name: teamDetails.teamName,
                admin_email: teamDetails.adminEmail,
                max_members: teamDetails.maxMembers.toString(),
              } : {}),
            },
          },
        });

        setClientSecret(paymentIntent.client_secret);
      } catch (error) {
        console.error('Failed to initialize payment:', error);
        onError('Failed to initialize payment. Please try again.');
      }
    };

    if (amount > 0) {
      initializePayment();
    }
  }, [amount, currency, customerId, priceId, planName, isTeamSubscription, teamDetails, onError]);

  // Validate form fields
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!customerDetails.email) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerDetails.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!customerDetails.name.trim()) {
      errors.name = 'Name is required';
    }

    if (isTeamSubscription && teamDetails) {
      if (!teamDetails.teamName.trim()) {
        errors.teamName = 'Team name is required';
      }
      if (!teamDetails.adminEmail.trim()) {
        errors.adminEmail = 'Admin email is required';
      }
      if (teamDetails.maxMembers < 1) {
        errors.maxMembers = 'Team must have at least 1 member';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle payment submission
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements || !clientSecret) {
      onError('Payment system not ready. Please try again.');
      return;
    }

    if (!validateForm()) {
      return;
    }

    setProcessing(true);
    setPaymentError(null);

    try {
      // Create customer if not provided
      let finalCustomerId = customerId;
      if (!finalCustomerId) {
        const customer = await invoke('stripe_create_customer', {
          request: {
            email: customerDetails.email,
            name: customerDetails.name,
            metadata: {
              source: 'bear_ai_app',
              plan: planName,
            },
          },
        });
        finalCustomerId = customer.id;
      }

      // Confirm payment
      const { error: paymentError, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
          payment_method_data: {
            billing_details: {
              name: customerDetails.name,
              email: customerDetails.email,
              address: customerDetails.address,
            },
          },
        },
        redirect: 'if_required',
      });

      if (paymentError) {
        throw new Error(paymentError.message || 'Payment failed');
      }

      if (paymentIntent?.status === 'succeeded') {
        // Create subscription after successful payment
        const subscriptionRequest = {
          customer_id: finalCustomerId,
          price_id: priceId,
          payment_method_id: paymentIntent.payment_method,
          metadata: {
            plan_name: planName,
            payment_intent_id: paymentIntent.id,
            ...(isTeamSubscription && teamDetails ? {
              team_name: teamDetails.teamName,
              admin_email: teamDetails.adminEmail,
              max_members: teamDetails.maxMembers.toString(),
            } : {}),
          },
        };

        const subscription = isTeamSubscription
          ? await invoke('stripe_create_team_subscription', {
              request: {
                team_name: teamDetails!.teamName,
                admin_email: teamDetails!.adminEmail,
                customer_id: finalCustomerId,
                price_id: priceId,
                max_members: teamDetails!.maxMembers,
                metadata: subscriptionRequest.metadata,
              },
            })
          : await invoke('stripe_create_subscription', {
              request: subscriptionRequest,
            });

        setPaymentSuccess(true);
        onSuccess(subscription);
      }
    } catch (error) {
      console.error('Payment error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      setPaymentError(errorMessage);
      onError(errorMessage);
    } finally {
      setProcessing(false);
    }
  };

  // Test payment validation (for development)
  const handleTestPayment = async () => {
    if (!clientSecret) return;

    try {
      setProcessing(true);
      const result = await invoke('stripe_validate_test_payment', {
        payment_intent_id: clientSecret.split('_secret_')[0],
      });
      console.log('Test payment validation result:', result);
    } catch (error) {
      console.error('Test payment validation error:', error);
    } finally {
      setProcessing(false);
    }
  };

  if (paymentSuccess) {
    return (
      <div className=\"text-center p-8 bg-green-50 rounded-lg border border-green-200\">
        <CheckCircle className=\"w-16 h-16 text-green-500 mx-auto mb-4\" />
        <h3 className=\"text-xl font-semibold text-green-800 mb-2\">
          Payment Successful!
        </h3>
        <p className=\"text-green-600\">
          Your {isTeamSubscription ? 'team ' : ''}subscription to {planName} has been activated.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className=\"space-y-6 max-w-md mx-auto\">
      {/* Security indicator */}
      <div className=\"flex items-center justify-center space-x-2 text-gray-600 bg-gray-50 p-3 rounded-lg\">
        <Shield className=\"w-5 h-5\" />
        <Lock className=\"w-4 h-4\" />
        <span className=\"text-sm\">Secured by Stripe</span>
      </div>

      {/* Plan summary */}
      <div className=\"bg-blue-50 p-4 rounded-lg border border-blue-200\">
        <div className=\"flex justify-between items-center\">
          <div>
            <h4 className=\"font-semibold text-blue-800\">{planName}</h4>
            {isTeamSubscription && teamDetails && (
              <p className=\"text-sm text-blue-600\">
                Team: {teamDetails.teamName} (up to {teamDetails.maxMembers} members)
              </p>
            )}
          </div>
          <div className=\"text-right\">
            <div className=\"flex items-center space-x-1 text-blue-800 font-semibold\">
              <DollarSign className=\"w-4 h-4\" />
              <span>{amount}</span>
              <span className=\"text-sm\">/{currency.toUpperCase()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Customer details */}
      <div className=\"space-y-4\">
        <h3 className=\"text-lg font-semibold flex items-center space-x-2\">
          <CreditCard className=\"w-5 h-5\" />
          <span>Billing Information</span>
        </h3>

        <div>
          <label className=\"block text-sm font-medium text-gray-700 mb-1\">
            Email Address *
          </label>
          <input
            type=\"email\"
            value={customerDetails.email}
            onChange={(e) => setCustomerDetails(prev => ({ ...prev, email: e.target.value }))}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              validationErrors.email ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder=\"your@email.com\"
            required
          />
          {validationErrors.email && (
            <p className=\"text-red-500 text-sm mt-1\">{validationErrors.email}</p>
          )}
        </div>

        <div>
          <label className=\"block text-sm font-medium text-gray-700 mb-1\">
            Full Name *
          </label>
          <input
            type=\"text\"
            value={customerDetails.name}
            onChange={(e) => setCustomerDetails(prev => ({ ...prev, name: e.target.value }))}
            className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              validationErrors.name ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder=\"John Doe\"
            required
          />
          {validationErrors.name && (
            <p className=\"text-red-500 text-sm mt-1\">{validationErrors.name}</p>
          )}
        </div>
      </div>

      {/* Payment element */}
      <div className=\"space-y-4\">
        <h3 className=\"text-lg font-semibold\">Payment Method</h3>
        <div className=\"p-4 border border-gray-300 rounded-lg bg-white\">
          {clientSecret ? (
            <PaymentElement
              options={{
                layout: 'tabs',
                fields: {
                  billingDetails: {
                    address: {
                      country: 'auto',
                    },
                  },
                },
              }}
            />
          ) : (
            <div className=\"flex items-center justify-center py-8\">
              <Loader2 className=\"w-6 h-6 animate-spin text-gray-400\" />
              <span className=\"ml-2 text-gray-500\">Loading payment form...</span>
            </div>
          )}
        </div>
      </div>

      {/* Error display */}
      {paymentError && (
        <div className=\"flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700\">
          <AlertCircle className=\"w-5 h-5 flex-shrink-0\" />
          <span className=\"text-sm\">{paymentError}</span>
        </div>
      )}

      {/* Submit button */}
      <button
        type=\"submit\"
        disabled={!stripe || processing || !clientSecret}
        className={`w-full py-3 px-4 rounded-lg font-semibold flex items-center justify-center space-x-2 transition-colors ${
          processing || !stripe || !clientSecret
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
            : 'bg-blue-600 text-white hover:bg-blue-700'
        }`}
      >
        {processing ? (
          <>
            <Loader2 className=\"w-5 h-5 animate-spin\" />
            <span>Processing...</span>
          </>
        ) : (
          <>
            <Lock className=\"w-4 h-4\" />
            <span>
              {isTeamSubscription ? 'Subscribe Team' : 'Subscribe'} • ${amount}
            </span>
          </>
        )}
      </button>

      {/* Test mode indicator */}
      {import.meta.env.DEV && (
        <div className=\"text-center\">
          <p className=\"text-xs text-gray-500 mb-2\">
            Development Mode - Use test card 4242 4242 4242 4242
          </p>
          <button
            type=\"button\"
            onClick={handleTestPayment}
            className=\"text-xs text-blue-600 hover:text-blue-800 underline\"
          >
            Validate Test Payment
          </button>
        </div>
      )}

      {/* Security footer */}
      <div className=\"text-center text-xs text-gray-500 mt-4\">
        <p>Your payment information is encrypted and secure.</p>
        <p>Powered by Stripe • PCI DSS Compliant</p>
      </div>
    </form>
  );
};

// Main PaymentForm component with Stripe Elements provider
const PaymentForm: React.FC<PaymentFormProps> = (props) => {
  const { config, loading, error } = useStripeConfig();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);

  useEffect(() => {
    if (config?.publishableKey) {
      setStripePromise(loadStripe(config.publishableKey));
    }
  }, [config]);

  if (loading) {
    return (
      <div className=\"flex items-center justify-center py-12\">
        <Loader2 className=\"w-8 h-8 animate-spin text-blue-500\" />
        <span className=\"ml-3 text-gray-600\">Loading payment system...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className=\"text-center py-12\">
        <AlertCircle className=\"w-12 h-12 text-red-500 mx-auto mb-4\" />
        <h3 className=\"text-lg font-semibold text-red-800 mb-2\">Payment System Error</h3>
        <p className=\"text-red-600 mb-4\">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className=\"px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700\"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className=\"text-center py-12\">
        <AlertCircle className=\"w-12 h-12 text-red-500 mx-auto mb-4\" />
        <p className=\"text-red-600\">Failed to load payment system</p>
      </div>
    );
  }

  const options = {
    mode: 'payment' as const,
    amount: props.amount * 100,
    currency: props.currency.toLowerCase(),
    appearance: {
      theme: 'stripe' as const,
      variables: {
        colorPrimary: '#2563eb',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorDanger: '#ef4444',
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        spacingUnit: '4px',
        borderRadius: '8px',
      },
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <PaymentFormInner {...props} />
    </Elements>
  );
};

export default PaymentForm;