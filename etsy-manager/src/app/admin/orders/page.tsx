'use client';

import { useEffect, useState } from 'react';
import { supabase, Order } from '@/lib/supabase';
import { uploadOrderImage, replaceOrderImage } from '@/lib/storage';
import { formatCurrency } from '@/lib/finance';
import {
  Package,
  Search,
  Upload,
  CheckCircle,
  XCircle,
  Calendar,
  User,
  MapPin,
  Phone,
  Link as LinkIcon,
  Image as ImageIcon,
  Ruler,
  Palette,
  Box,
  FileText,
  DollarSign,
  Truck,
  AlertCircle,
  Wrench,
  StickyNote
} from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('ordered_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (orderId: string, file: File, oldImageUrl?: string) => {
    setUploadingImage(orderId);
    try {
      const result = await replaceOrderImage(file, orderId, oldImageUrl);

      if (!result.success) {
        alert(result.error || 'Failed to upload image');
        return;
      }

      // Update database with new image URL
      const { error } = await supabase
        .from('orders')
        .update({ image_url: result.url })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, image_url: result.url } : order
      ));
    } catch (error) {
      console.error('Error updating image:', error);
      alert('Failed to update order with new image');
    } finally {
      setUploadingImage(null);
    }
  };

  const handleFieldUpdate = async (orderId: string, field: keyof Order, value: any) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ [field]: value })
        .eq('id', orderId);

      if (error) throw error;

      // Update local state
      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, [field]: value } : order
      ));
    } catch (error) {
      console.error('Error updating field:', error);
      alert('Failed to update order');
    }
  };

  const handleToggle = async (orderId: string, field: keyof Order, currentValue: boolean | undefined) => {
    await handleFieldUpdate(orderId, field, !currentValue);
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    return (
      order.customer_name?.toLowerCase().includes(searchLower) ||
      order.contact?.toLowerCase().includes(searchLower) ||
      order.address?.toLowerCase().includes(searchLower) ||
      order.tracking_number?.toLowerCase().includes(searchLower)
    );
  });

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Package className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
          </div>
        </div>

        {/* Search Bar */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search by customer name, contact, address, or tracking..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Image</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Specs</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tracking</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-6 py-12 text-center">
                      <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">
                        {searchTerm ? 'No orders found matching your search' : 'No orders yet'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      {/* Date */}
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          {formatDate(order.ordered_date)}
                        </div>
                      </td>

                      {/* Customer */}
                      <td className="px-4 py-4 text-sm">
                        <input
                          type="text"
                          value={order.customer_name || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'customer_name', e.target.value)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'customer_name', e.target.value)}
                          placeholder="Customer name"
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                        <textarea
                          value={order.address || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'address', e.target.value)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'address', e.target.value)}
                          placeholder="Address"
                          rows={2}
                          className="w-full mt-1 px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Contact */}
                      <td className="px-4 py-4 text-sm">
                        <input
                          type="text"
                          value={order.contact || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'contact', e.target.value)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'contact', e.target.value)}
                          placeholder="Phone/Email"
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Product Link & Notes */}
                      <td className="px-4 py-4 text-sm max-w-xs">
                        <input
                          type="text"
                          value={order.product_link || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'product_link', e.target.value)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'product_link', e.target.value)}
                          placeholder="Product link"
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 mb-1"
                        />
                        <textarea
                          value={order.notes || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'notes', e.target.value)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'notes', e.target.value)}
                          placeholder="Notes"
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Image Upload */}
                      <td className="px-4 py-4 text-sm">
                        <div className="flex flex-col items-center gap-2">
                          {order.image_url && (
                            <img
                              src={order.image_url}
                              alt="Order"
                              className="w-16 h-16 object-cover rounded border border-gray-300"
                            />
                          )}
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(order.id, file, order.image_url);
                              }}
                            />
                            <div className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors">
                              {uploadingImage === order.id ? (
                                <>Uploading...</>
                              ) : (
                                <>
                                  <Upload className="w-3 h-3" />
                                  {order.image_url ? 'Change' : 'Upload'}
                                </>
                              )}
                            </div>
                          </label>
                        </div>
                      </td>

                      {/* Product Specs */}
                      <td className="px-4 py-4 text-sm">
                        <input
                          type="text"
                          value={order.size || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'size', e.target.value)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'size', e.target.value)}
                          placeholder="Size"
                          className="w-full px-2 py-1 mb-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={order.color || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'color', e.target.value)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'color', e.target.value)}
                          placeholder="Color"
                          className="w-full px-2 py-1 mb-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                        />
                        <input
                          type="text"
                          value={order.material || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'material', e.target.value)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'material', e.target.value)}
                          placeholder="Material"
                          className="w-full px-2 py-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Amount to Pay */}
                      <td className="px-4 py-4 text-right">
                        <input
                          type="number"
                          step="0.01"
                          value={order.total_amount_to_pay || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'total_amount_to_pay', parseFloat(e.target.value) || 0)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'total_amount_to_pay', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                          className="w-24 px-2 py-1 text-right border border-gray-300 rounded font-semibold text-green-600 focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Status Toggles */}
                      <td className="px-4 py-4 text-sm">
                        <div className="space-y-1">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={order.is_paid || false}
                              onChange={() => handleToggle(order.id, 'is_paid', order.is_paid)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-xs">Paid</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={order.is_shipped || false}
                              onChange={() => handleToggle(order.id, 'is_shipped', order.is_shipped)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-xs">Shipped</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={order.is_completed_on_etsy || false}
                              onChange={() => handleToggle(order.id, 'is_completed_on_etsy', order.is_completed_on_etsy)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-xs">Etsy Complete</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={order.is_delivered || false}
                              onChange={() => handleToggle(order.id, 'is_delivered', order.is_delivered)}
                              className="rounded border-gray-300"
                            />
                            <span className="text-xs">Delivered</span>
                          </label>
                        </div>
                      </td>

                      {/* Tracking & Internal Notes */}
                      <td className="px-4 py-4 text-sm">
                        <input
                          type="text"
                          value={order.tracking_number || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'tracking_number', e.target.value)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'tracking_number', e.target.value)}
                          placeholder="Tracking #"
                          className="w-full px-2 py-1 mb-1 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-blue-500"
                        />
                        <textarea
                          value={order.internal_notes || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'internal_notes', e.target.value)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'internal_notes', e.target.value)}
                          placeholder="Internal notes"
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-blue-500"
                        />
                      </td>

                      {/* Issues & Solutions */}
                      <td className="px-4 py-4 text-sm">
                        <textarea
                          value={order.issue || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'issue', e.target.value)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'issue', e.target.value)}
                          placeholder="Issue description"
                          rows={2}
                          className="w-full px-2 py-1 mb-1 text-xs border border-red-300 rounded focus:ring-1 focus:ring-red-500"
                        />
                        <textarea
                          value={order.the_solution || ''}
                          onChange={(e) => handleFieldUpdate(order.id, 'the_solution', e.target.value)}
                          onBlur={(e) => handleFieldUpdate(order.id, 'the_solution', e.target.value)}
                          placeholder="Solution"
                          rows={2}
                          className="w-full px-2 py-1 text-xs border border-green-300 rounded focus:ring-1 focus:ring-green-500"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer */}
        {filteredOrders.length > 0 && (
          <div className="mt-4 bg-white rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between text-sm">
              <p className="text-gray-600">
                Showing {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''}
              </p>
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-gray-600">Total Amount: </span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(filteredOrders.reduce((sum, o) => sum + (o.total_amount_to_pay || 0), 0))}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
