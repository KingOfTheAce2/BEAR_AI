import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import {
  CreditCard,
  Calendar,
  DollarSign,
  Download,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  Crown,
  FileText,
  Settings,
  RefreshCw,
  ExternalLink,
  Plus,
  Trash2,
  Edit3,
} from 'lucide-react';

// Types for billing data
interface Subscription {
  id: string;
  customer: string;
  status: string;
  current_period_start: number;
  current_period_end: number;
  cancel_at_period_end: boolean;
  trial_end?: number;
  items: {
    data: Array<{
      id: string;
      price: {
        id: string;
        unit_amount?: number;
        currency: string;
        recurring?: {
          interval: string;
          interval_count: number;
        };
        metadata: Record<string, string>;
      };
      quantity: number;
    }>;
  };
  metadata: Record<string, string>;
}

interface Customer {
  id: string;
  email: string;
  name?: string;
  created: number;
  metadata: Record<string, string>;
}

interface Invoice {
  id: string;
  customer: string;
  subscription?: string;
  amount_due: number;
  amount_paid: number;
  amount_remaining: number;
  currency: string;
  status: string;
  hosted_invoice_url?: string;
  invoice_pdf?: string;
  due_date?: number;
  paid_at?: number;
  created: number;
  period_start?: number;
  period_end?: number;
}

interface TeamSubscription {
  id: string;
  team_name: string;
  admin_email: string;
  subscription_id: string;
  member_count: number;
  max_members: number;
  created_at: number;
  metadata: Record<string, string>;
}

interface BillingDashboardProps {
  customerId: string;
  isAdmin?: boolean;
  teamId?: string;
}

// Utility functions
const formatCurrency = (amount: number, currency: string) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency.toUpperCase(),
  }).format(amount / 100);
};

const formatDate = (timestamp: number) => {
  return new Date(timestamp * 1000).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'trialing':
      return <Clock className="w-5 h-5 text-blue-500" />;
    case 'past_due':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'canceled':
    case 'unpaid':
      return <XCircle className="w-5 h-5 text-red-500" />;
    default:
      return <Clock className="w-5 h-5 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'trialing':
      return 'bg-blue-100 text-blue-800';
    case 'past_due':
      return 'bg-yellow-100 text-yellow-800';
    case 'canceled':
    case 'unpaid':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Main billing dashboard component
const BillingDashboard: React.FC<BillingDashboardProps> = ({
  customerId,
  isAdmin = false,
  teamId,
}) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [teamSubscription, setTeamSubscription] = useState<TeamSubscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'subscriptions' | 'invoices' | 'team'>('overview');

  // Load billing data
  useEffect(() => {
    loadBillingData();
  }, [customerId, teamId]);

  const loadBillingData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load customer data
      const customerData = await invoke<Customer>('stripe_get_customer', {
        customer_id: customerId,
      });
      setCustomer(customerData);

      // Load subscriptions
      // Note: This would require a new Tauri command to list subscriptions by customer
      // For now, we'll simulate with a single subscription lookup
      try {
        const subscriptionData = await invoke<Subscription[]>('stripe_list_subscriptions', {
          customer_id: customerId,
        });
        setSubscriptions(subscriptionData);
      } catch (err) {
        console.warn('Failed to load subscriptions:', err);
        setSubscriptions([]);
      }

      // Load invoices
      const invoiceData = await invoke<Invoice[]>('stripe_get_invoices', {
        customer_id: customerId,
        limit: 12,
      });
      setInvoices(invoiceData);

      // Load team subscription if applicable
      if (teamId) {
        try {
          const teamData = await invoke<TeamSubscription>('get_team_subscription', {
            team_id: teamId,
          });
          setTeamSubscription(teamData);
        } catch (err) {
          console.warn('Failed to load team subscription:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load billing data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load billing data');
    } finally {
      setLoading(false);
    }
  };

  // Handle subscription cancellation
  const handleCancelSubscription = async (subscriptionId: string) => {
    if (!confirm('Are you sure you want to cancel this subscription?')) {
      return;
    }

    try {
      await invoke('stripe_cancel_subscription', {
        subscription_id: subscriptionId,
      });

      // Reload data to reflect changes
      await loadBillingData();
    } catch (err) {
      console.error('Failed to cancel subscription:', err);
      setError('Failed to cancel subscription. Please try again.');
    }
  };

  // Handle invoice download
  const handleDownloadInvoice = async (invoice: Invoice) => {
    if (invoice.hosted_invoice_url) {
      window.open(invoice.hosted_invoice_url, '_blank');
    } else if (invoice.invoice_pdf) {
      window.open(invoice.invoice_pdf, '_blank');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Loading billing information...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Billing Data</h3>
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={loadBillingData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Calculate summary statistics
  const activeSubscriptions = subscriptions.filter(sub => sub.status === 'active');
  const totalMonthlyAmount = activeSubscriptions.reduce((total, sub) => {
    const item = sub.items.data[0];
    if (item?.price.unit_amount && item.price.recurring?.interval === 'month') {
      return total + (item.price.unit_amount * item.quantity);
    }
    return total;
  }, 0);

  const nextBillingDate = activeSubscriptions.length > 0
    ? Math.min(...activeSubscriptions.map(sub => sub.current_period_end))
    : null;

  const unpaidInvoices = invoices.filter(inv => inv.status === 'open' || inv.status === 'past_due');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing Dashboard</h1>
          <p className="text-gray-600">
            Manage your subscription and billing information
          </p>
        </div>
        <button
          onClick={loadBillingData}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Active Subscriptions */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active Subscriptions</p>
              <p className="text-2xl font-bold text-gray-900">{activeSubscriptions.length}</p>
            </div>
            <Crown className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        {/* Monthly Total */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Monthly Total</p>
              <p className="text-2xl font-bold text-gray-900">
                {totalMonthlyAmount > 0 ? formatCurrency(totalMonthlyAmount, 'USD') : '$0'}
              </p>
            </div>
            <DollarSign className="w-8 h-8 text-green-500" />
          </div>
        </div>

        {/* Next Billing */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Next Billing</p>
              <p className="text-lg font-semibold text-gray-900">
                {nextBillingDate ? formatDate(nextBillingDate) : 'N/A'}
              </p>
            </div>
            <Calendar className="w-8 h-8 text-purple-500" />
          </div>
        </div>

        {/* Unpaid Invoices */}
        <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Unpaid Invoices</p>
              <p className="text-2xl font-bold text-gray-900">{unpaidInvoices.length}</p>
            </div>
            {unpaidInvoices.length > 0 ? (
              <AlertTriangle className="w-8 h-8 text-red-500" />
            ) : (
              <CheckCircle className="w-8 h-8 text-green-500" />
            )}
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          {['overview', 'subscriptions', 'invoices', ...(teamId ? ['team'] : [])].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Customer Information */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Account Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="text-gray-900">{customer?.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Name</label>
                <p className="text-gray-900">{customer?.name || 'Not provided'}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Customer ID</label>
                <p className="text-gray-500 font-mono text-sm">{customer?.id}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Member Since</label>
                <p className="text-gray-900">{customer ? formatDate(customer.created) : 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {invoices.slice(0, 5).map((invoice) => (
                <div key={invoice.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        Invoice #{invoice.id.slice(-8)}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(invoice.created)}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">
                      {formatCurrency(invoice.amount_due, invoice.currency)}
                    </p>
                    <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'subscriptions' && (
        <div className="space-y-6">
          {subscriptions.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
              <Crown className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Subscriptions</h3>
              <p className="text-gray-600 mb-4">You don't have any active subscriptions.</p>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Browse Plans
              </button>
            </div>
          ) : (
            subscriptions.map((subscription) => {
              const item = subscription.items.data[0];
              const price = item?.price;
              return (
                <div key={subscription.id} className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(subscription.status)}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {subscription.metadata.plan_name || 'Subscription'}
                        </h3>
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${getStatusColor(subscription.status)}`}>
                          {subscription.status}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      {price?.unit_amount && (
                        <p className="text-2xl font-bold text-gray-900">
                          {formatCurrency(price.unit_amount * item.quantity, price.currency)}
                          <span className="text-sm font-normal text-gray-500">
                            /{price.recurring?.interval}
                          </span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Period</label>
                      <p className="text-gray-900">
                        {formatDate(subscription.current_period_start)} - {formatDate(subscription.current_period_end)}
                      </p>
                    </div>
                    {subscription.trial_end && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Trial Ends</label>
                        <p className="text-gray-900">{formatDate(subscription.trial_end)}</p>
                      </div>
                    )}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Subscription ID</label>
                      <p className="text-gray-500 font-mono text-sm">{subscription.id}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center space-x-2">
                      {subscription.cancel_at_period_end && (
                        <span className="inline-flex items-center px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded-full">
                          <AlertTriangle className="w-3 h-3 mr-1" />
                          Cancels at period end
                        </span>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <button className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800">
                        <Edit3 className="w-4 h-4" />
                        <span>Modify</span>
                      </button>
                      {!subscription.cancel_at_period_end && (
                        <button
                          onClick={() => handleCancelSubscription(subscription.id)}
                          className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Cancel</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {activeTab === 'invoices' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold">Invoice History</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Invoice
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {invoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <FileText className="w-4 h-4 text-gray-400 mr-2" />
                          <span className="text-sm font-medium text-gray-900">
                            #{invoice.id.slice(-8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(invoice.created)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(invoice.amount_due, invoice.currency)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs rounded-full ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => handleDownloadInvoice(invoice)}
                          disabled={!invoice.hosted_invoice_url && !invoice.invoice_pdf}
                          className="flex items-center space-x-1 text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                          <Download className="w-4 h-4" />
                          <span>Download</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && teamSubscription && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center space-x-2">
                <Users className="w-5 h-5" />
                <span>Team Subscription</span>
              </h3>
              {isAdmin && (
                <button className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800">
                  <Settings className="w-4 h-4" />
                  <span>Manage Team</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Team Name</label>
                <p className="text-gray-900 font-semibold">{teamSubscription.team_name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Members</label>
                <p className="text-gray-900">
                  {teamSubscription.member_count} / {teamSubscription.max_members}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Admin</label>
                <p className="text-gray-900">{teamSubscription.admin_email}</p>
              </div>
            </div>

            {isAdmin && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex items-center space-x-4">
                  <button className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    <span>Add Member</span>
                  </button>
                  <button className="flex items-center space-x-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                    <Settings className="w-4 h-4" />
                    <span>Team Settings</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingDashboard;