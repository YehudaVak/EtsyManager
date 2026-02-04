'use client';

import { useEffect, useState } from 'react';
import { supabase, Order } from '@/lib/supabase';
import { formatCurrency, formatPercent } from '@/lib/finance';
import { Package, MapPin, FileText, CheckCircle } from 'lucide-react';

type ViewMode = 'admin' | 'supplier';

export default function HomePage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('admin');
  const [markingShipped, setMarkingShipped] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ supplier_status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, supplier_status: newStatus as any } : order
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to update status');
    }
  };

  const handleMarkAsShipped = async (orderId: string) => {
    setMarkingShipped(orderId);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ supplier_status: 'Shipped' })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, supplier_status: 'Shipped' } : order
      ));
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Failed to mark as shipped');
    } finally {
      setMarkingShipped(null);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusColor = (status?: string | null) => {
    switch (status?.toLowerCase()) {
      case 'pending':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'shipped':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'delivered':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  // Filter for supplier view - hide shipped/delivered orders
  const displayOrders = viewMode === 'supplier'
    ? orders.filter(order => order.supplier_status !== 'Shipped' && order.supplier_status !== 'Delivered')
    : orders;

  // Calculate metrics
  const totalRevenue = orders.reduce((sum, o) => sum + (o.sold_price || 0), 0);
  const totalProfit = orders.reduce((sum, o) => sum + (o.net_profit || 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">E</span>
              </div>
              <span className="text-xl font-semibold text-gray-900">OrderMaster</span>
            </div>

            {/* User Info and Tabs */}
            <div className="flex items-center gap-6">
              <span className="text-sm text-gray-600">
                Alex <span className="text-gray-400">(Admin)</span>
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => setViewMode('admin')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'admin'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  ADMIN
                </button>
                <button
                  onClick={() => setViewMode('supplier')}
                  className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    viewMode === 'supplier'
                      ? 'bg-indigo-600 text-white'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  SUPPLIER
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Admin View */}
        {viewMode === 'admin' && (
          <>
            {/* Title Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Active Orders</h1>
              <p className="text-gray-500">
                Managing {displayOrders.length} items • Total Revenue: {formatCurrency(totalRevenue)} •
                Net Profit: {formatCurrency(totalProfit)}
              </p>
            </div>

            {/* Orders Table */}
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Order Info
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Sold Price
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Net Profit
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      ROI
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {displayOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No active orders</p>
                      </td>
                    </tr>
                  ) : (
                    displayOrders.map((order) => {
                      const roi = order.sold_price > 0
                        ? ((order.net_profit || 0) / order.sold_price) * 100
                        : 0;

                      return (
                        <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex-shrink-0"></div>
                              <div>
                                <p className="font-semibold text-gray-900">#{order.etsy_order_id}</p>
                                <p className="text-sm text-gray-600">{order.product_name}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <select
                              value={order.supplier_status || ''}
                              onChange={(e) => handleStatusChange(order.id, e.target.value)}
                              className={`px-3 py-1 text-xs font-medium rounded-md border ${getStatusColor(order.supplier_status)}`}
                            >
                              <option value="">NOT SET</option>
                              <option value="Pending">PENDING</option>
                              <option value="Processing">PROCESSING</option>
                              <option value="Shipped">SHIPPED</option>
                              <option value="Delivered">DELIVERED</option>
                            </select>
                          </td>
                          <td className="px-6 py-4">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{order.buyer_name || 'N/A'}</p>
                              <p className="text-xs text-gray-500">{order.buyer_email || 'No email'}</p>
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className="text-sm font-semibold text-gray-900">
                              {formatCurrency(order.sold_price)}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <p className={`text-sm font-semibold ${
                              (order.net_profit || 0) >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {formatCurrency(order.net_profit || 0)}
                            </p>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className={`inline-block px-2 py-1 text-xs font-semibold rounded ${
                              roi >= 50 ? 'bg-green-100 text-green-700' :
                              roi >= 25 ? 'bg-blue-100 text-blue-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {roi.toFixed(2)}%
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* Supplier View */}
        {viewMode === 'supplier' && (
          <>
            {/* Title Section */}
            <div className="mb-8">
              <h1 className="text-3xl font-semibold text-gray-900 mb-2">Orders to Ship</h1>
              <p className="text-gray-500">
                {displayOrders.length} order{displayOrders.length !== 1 ? 's' : ''} to process
              </p>
            </div>

            <div className="space-y-4">
              {displayOrders.length === 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">All Done!</h3>
                  <p className="text-gray-500">No orders to process at the moment.</p>
                </div>
              ) : (
                displayOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border border-gray-200 rounded-lg overflow-hidden"
                  >
                    {/* Order Header */}
                    <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Order #{order.etsy_order_id}</p>
                          <p className="text-sm font-semibold text-gray-900">
                            {formatDate(order.created_at)}
                          </p>
                        </div>
                        {order.supplier_status && (
                          <span className={`px-3 py-1 text-xs font-medium rounded-md border ${getStatusColor(order.supplier_status)}`}>
                            {order.supplier_status.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Order Content */}
                    <div className="p-6 space-y-4">
                      {/* Product */}
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Package className="w-5 h-5 text-indigo-600" />
                          <h4 className="text-sm font-semibold text-gray-700">Product</h4>
                        </div>
                        <p className="ml-7 text-base text-gray-900">{order.product_name}</p>
                      </div>

                      {/* Shipping Address */}
                      {order.shipping_address && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <MapPin className="w-5 h-5 text-green-600" />
                            <h4 className="text-sm font-semibold text-gray-700">Shipping Address</h4>
                          </div>
                          <p className="ml-7 text-sm text-gray-700 whitespace-pre-line">
                            {order.shipping_address}
                          </p>
                        </div>
                      )}

                      {/* Customization */}
                      {order.customization_notes && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <FileText className="w-5 h-5 text-purple-600" />
                            <h4 className="text-sm font-semibold text-gray-700">Customization Notes</h4>
                          </div>
                          <p className="ml-7 text-sm text-gray-700 whitespace-pre-line">
                            {order.customization_notes}
                          </p>
                        </div>
                      )}

                      {/* Mark as Shipped Button */}
                      <div className="pt-4">
                        <button
                          onClick={() => handleMarkAsShipped(order.id)}
                          disabled={markingShipped === order.id}
                          className="w-full flex items-center justify-center gap-2 bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all font-semibold"
                        >
                          <CheckCircle className={`w-5 h-5 ${markingShipped === order.id ? 'animate-spin' : ''}`} />
                          {markingShipped === order.id ? 'Marking as Shipped...' : 'Mark as Shipped'}
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
