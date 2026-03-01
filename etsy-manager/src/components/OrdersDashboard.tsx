'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, Order, ProductWithPricing, ProductPricing } from '@/lib/supabase';
import { uploadOrderImage, replaceOrderImage } from '@/lib/storage';
import { useAuth } from '@/lib/auth';
import { Plus, Search, RefreshCw, ExternalLink, Camera, ChevronDown, ChevronUp, Trash2, X, ArrowUpDown, ArrowUp, ArrowDown, AlertCircle, Package, Truck, ShoppingBag, CheckSquare, Upload, Pencil, Image, ClipboardCopy } from 'lucide-react';
import EditableField from './EditableField';

interface OrdersDashboardProps {
  isAdmin: boolean;
}

// Custom orange color
const BRAND_ORANGE = '#d96f36';

// Format date from YYYY-MM-DD to dd/mm/yyyy
const formatDate = (date: string | undefined | null): string => {
  if (!date) return '-';
  const parts = date.split('-');
  if (parts.length !== 3) return date;
  return `${parts[2]}/${parts[1]}/${parts[0]}`;
};

export default function OrdersDashboard({ isAdmin }: OrdersDashboardProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; orderId: string | null; orderName: string }>({
    show: false,
    orderId: null,
    orderName: ''
  });
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Order | null; direction: 'asc' | 'desc' }>({
    key: 'ordered_date',
    direction: 'desc'
  });

  // Multi-select state
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Filter state for supplier status tabs
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'paid' | 'needs_tracking' | 'shipped' | 'delivered' | 'out_of_stock' | 'issue'>('all');

  // WhatsApp copy toast
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Products for selector
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productDropdownOpen, setProductDropdownOpen] = useState<string | null>(null);

  // Column widths state for resizable columns
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    rowNum: 50,
    image: 110,
    date: 110,
    shipBy: 110,
    productName: 200,
    orderNo: 180,
    customer: 170,
    address: 280,
    size: 90,
    color: 90,
    material: 100,
    paid: 60,
    shipped: 70,
    delivered: 80,
    profit: 90,
    actions: 70,
  });

  // Row heights state for resizable rows
  const [rowHeights, setRowHeights] = useState<{ [key: string]: number }>({});
  const defaultRowHeight = 115;

  // Refs for column resizing
  const resizingColumn = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  // Refs for row resizing
  const resizingRow = useRef<string | null>(null);
  const startY = useRef<number>(0);
  const startHeight = useRef<number>(0);

  const { user, selectedStore, isLoading: authLoading } = useAuth();
  const router = useRouter();

  // Check authentication
  useEffect(() => {
    if (!authLoading) {
      if (!user) {
        router.push('/');
      } else if (isAdmin && user.role !== 'master_admin' && user.role !== 'store_admin') {
        router.push('/supplier/orders');
      }
    }
  }, [user, authLoading, isAdmin, router]);

  useEffect(() => {
    if (selectedStore) {
      fetchOrders();
      fetchProducts();
    }
  }, [selectedStore]);

  // Close product search dropdown on outside click
  useEffect(() => {
    if (!productDropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-product-search]')) {
        setProductDropdownOpen(null);
        setProductSearch('');
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [productDropdownOpen]);

  const fetchOrders = async () => {
    if (!selectedStore) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('store_id', selectedStore.id)
        .order('ordered_date', { ascending: false });

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!selectedStore) return;

    try {
      // Fetch products filtered by store
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', selectedStore.id)
        .eq('is_active', true)
        .order('name');

      if (productsError) throw productsError;

      // Fetch all pricing
      const { data: pricingData, error: pricingError } = await supabase
        .from('product_pricing')
        .select('*');

      if (pricingError) throw pricingError;

      // Fetch all variations
      let variationsData: any[] = [];
      try {
        const { data, error: variationsError } = await supabase
          .from('product_variations')
          .select('*')
          .order('sort_order', { ascending: true });
        if (!variationsError) variationsData = data || [];
      } catch {
        // product_variations table may not exist yet
      }

      // Combine products with their pricing and variations
      const productsWithPricing: ProductWithPricing[] = (productsData || []).map((product) => ({
        ...product,
        pricing: (pricingData || []).filter((p) => p.product_id === product.id),
        variations: variationsData.filter((v) => v.product_id === product.id),
      }));

      setProducts(productsWithPricing);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleDeleteOrder = async (orderId: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
      setOrders(orders.filter(order => order.id !== orderId));
      setDeleteConfirm({ show: false, orderId: null, orderName: '' });
    } catch (error) {
      console.error('Error deleting order:', error);
      alert('Failed to delete order');
    }
  };

  // Multi-select functions
  const toggleSelectOrder = (orderId: string) => {
    setSelectedOrders(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) {
        next.delete(orderId);
      } else {
        next.add(orderId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedOrders.size === filteredOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(filteredOrders.map(o => o.id)));
    }
  };

  const clearSelection = () => setSelectedOrders(new Set());

  const handleBulkDelete = async () => {
    try {
      const ids = Array.from(selectedOrders);
      const { error } = await supabase
        .from('orders')
        .delete()
        .in('id', ids);

      if (error) throw error;
      setOrders(prev => prev.filter(o => !selectedOrders.has(o.id)));
      setSelectedOrders(new Set());
      setBulkDeleteConfirm(false);
    } catch (error) {
      console.error('Error deleting orders:', error);
      alert('Failed to delete some orders. Please try again.');
      setBulkDeleteConfirm(false);
    }
  };

  const openDeleteConfirm = (order: Order) => {
    setDeleteConfirm({
      show: true,
      orderId: order.id,
      orderName: order.customer_name || order.etsy_order_no || 'this order'
    });
  };

  const handleImageUpload = async (orderId: string, file: File, oldImageUrl?: string) => {
    setUploadingImage(orderId);
    try {
      const result = await replaceOrderImage(file, orderId, oldImageUrl);
      if (!result.success) {
        alert(result.error || 'Failed to upload image');
        return;
      }
      await handleFieldUpdate(orderId, 'image_url', result.url);
    } catch (error) {
      console.error('Error updating image:', error);
    } finally {
      setUploadingImage(null);
    }
  };

  // Handle selecting a product and auto-filling order fields
  const handleSelectProduct = async (orderId: string, productId: string, customerCountry?: string) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    // Determine country from address or default to US
    const order = orders.find(o => o.id === orderId);
    let country = customerCountry || 'US';

    // Try to detect country from address if not provided
    if (!customerCountry && order?.address) {
      const addr = order.address.toLowerCase();
      if (addr.includes('united kingdom') || addr.includes(', uk') || addr.includes('england') || addr.includes('scotland') || addr.includes('wales')) {
        country = 'UK/GB';
      } else if (addr.includes('canada') || addr.includes(', ca')) {
        country = 'CA';
      } else if (addr.includes('australia') || addr.includes(', au')) {
        country = 'AU';
      } else if (addr.includes('germany') || addr.includes('france') || addr.includes('italy') || addr.includes('spain') || addr.includes('netherlands')) {
        country = 'EU';
      }
    }

    // Find pricing for the detected country
    const pricing = product.pricing?.find(p => p.country === country) || product.pricing?.[0];

    const updates: Partial<Order> = {
      product_id: productId,
      variation_id: undefined,
      product_name: product.name,
      product_link: product.product_link || undefined,
      order_from: product.supplier_name || undefined,
      image_url: product.image_url || undefined,
    };

    // Set supplier price if available
    if (pricing?.price) {
      updates.total_amount_to_pay = pricing.price;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, ...updates } : o
      ));
      // Also update selectedOrder if it's the same order
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updates });
      }
    } catch (error) {
      console.error('Error selecting product:', error);
    }
  };

  // Handle selecting a variation for an order
  const handleSelectVariation = async (orderId: string, variationId: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order?.product_id) return;

    const product = products.find(p => p.id === order.product_id);
    const variation = product?.variations?.find(v => v.id === variationId);

    const updates: Partial<Order> = {
      variation_id: variationId || undefined,
    };

    // Override image and product_name with variation data
    if (variation) {
      if (variation.image_url) {
        updates.image_url = variation.image_url;
      }
      updates.product_name = `${product?.name} – ${variation.name}`;
    } else {
      // "None" selected — revert to base product
      updates.image_url = product?.image_url || undefined;
      updates.product_name = product?.name;
    }

    try {
      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o =>
        o.id === orderId ? { ...o, ...updates } : o
      ));
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updates });
      }
    } catch (error) {
      console.error('Error selecting variation:', error);
    }
  };

  // WhatsApp copy helpers
  const buildOrderMessage = (order: Order): string => {
    const lines: string[] = [];
    if (order.address) lines.push(order.address);
    // Extract variation name from "Product – Variation" format
    const variationName = order.product_name?.includes(' – ')
      ? order.product_name.split(' – ').slice(1).join(' – ')
      : null;
    if (variationName) lines.push(variationName);
    lines.push(`Quantity: ${order.quantity ?? 1}`);
    return lines.join('\n');
  };

  const handleCopyImage = async (order: Order) => {
    if (!order.image_url) {
      setCopyToast('No image available');
      setTimeout(() => setCopyToast(null), 2000);
      return;
    }
    try {
      const response = await fetch(order.image_url);
      const blob = await response.blob();
      const pngBlob = blob.type === 'image/png' ? blob : await new Promise<Blob>((resolve) => {
        const img = document.createElement('img');
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          canvas.getContext('2d')!.drawImage(img, 0, 0);
          canvas.toBlob((b) => resolve(b!), 'image/png');
        };
        img.src = URL.createObjectURL(blob);
      });
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
      setCopyToast('Image copied!');
    } catch {
      setCopyToast('Failed to copy image');
    }
    setTimeout(() => setCopyToast(null), 2000);
  };

  const handleCopyText = async (order: Order) => {
    try {
      await navigator.clipboard.writeText(buildOrderMessage(order));
      setCopyToast('Text copied!');
    } catch {
      setCopyToast('Failed to copy text');
    }
    setTimeout(() => setCopyToast(null), 2000);
  };

  const handleFieldUpdate = async (orderId: string, field: keyof Order, value: any) => {
    try {
      let updates: Partial<Order> = { [field]: value };

      if (field === 'sold_for' || field === 'fees_percent' || field === 'product_cost') {
        const order = orders.find(o => o.id === orderId);
        if (order) {
          const soldFor = field === 'sold_for' ? value : order.sold_for || 0;
          const fees = field === 'fees_percent' ? value : order.fees_percent || 12.5;
          const cost = field === 'product_cost' ? value : order.product_cost || 0;
          const profit = soldFor - (soldFor * fees / 100) - cost;
          updates.profit = Math.round(profit * 100) / 100;
        }
      }

      const { error } = await supabase
        .from('orders')
        .update(updates)
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(order =>
        order.id === orderId ? { ...order, ...updates } : order
      ));
      // Also update selectedOrder if it's the same order
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder({ ...selectedOrder, ...updates });
      }
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  // Debounced field update for text inputs - updates local state immediately, DB after 500ms
  const pendingUpdates = useRef<{ [key: string]: ReturnType<typeof setTimeout> }>({});

  const handleDebouncedFieldUpdate = useCallback((orderId: string, field: keyof Order, value: any) => {
    // Update local state immediately (no lag)
    setOrders(prev => prev.map(order =>
      order.id === orderId ? { ...order, [field]: value } : order
    ));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, [field]: value } : prev);
    }

    // Debounce the DB call
    const key = `${orderId}-${String(field)}`;
    if (pendingUpdates.current[key]) {
      clearTimeout(pendingUpdates.current[key]);
    }
    pendingUpdates.current[key] = setTimeout(async () => {
      try {
        let updates: Partial<Order> = { [field]: value };

        if (field === 'sold_for' || field === 'fees_percent' || field === 'product_cost') {
          const order = orders.find(o => o.id === orderId);
          if (order) {
            const soldFor = field === 'sold_for' ? value : order.sold_for || 0;
            const fees = field === 'fees_percent' ? value : order.fees_percent || 12.5;
            const cost = field === 'product_cost' ? value : order.product_cost || 0;
            const profit = soldFor - (soldFor * fees / 100) - cost;
            updates.profit = Math.round(profit * 100) / 100;
          }
        }

        await supabase.from('orders').update(updates).eq('id', orderId);
      } catch (error) {
        console.error('Error updating field:', error);
      }
      delete pendingUpdates.current[key];
    }, 500);
  }, [orders, selectedOrder]);

  const handleAddOrder = async () => {
    if (!selectedStore) return;
    try {
      const { data, error } = await supabase
        .from('orders')
        .insert({
          store_id: selectedStore.id,
          ordered_date: new Date().toISOString().split('T')[0],
          fees_percent: 12.5
        })
        .select()
        .single();

      if (error) throw error;
      setOrders([data, ...orders]);
      setExpandedOrder(data.id);
      setSelectedOrder(data); // Open detail card for new order
    } catch (error) {
      console.error('Error adding order:', error);
    }
  };

  // Acknowledge order when supplier views it (for non-admin)
  const acknowledgeOrder = async (order: Order) => {
    if (isAdmin || order.supplier_acknowledged) return;

    try {
      const { error } = await supabase
        .from('orders')
        .update({ supplier_acknowledged: true })
        .eq('id', order.id);

      if (error) throw error;

      setOrders(orders.map(o =>
        o.id === order.id ? { ...o, supplier_acknowledged: true } : o
      ));
    } catch (error) {
      console.error('Error acknowledging order:', error);
    }
  };

  // Sort function
  const handleSort = (key: keyof Order) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Column resize handlers
  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColumn.current = columnKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[columnKey] || 100;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [columnWidths]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;
    const diff = e.clientX - startX.current;
    const newWidth = Math.max(50, startWidth.current + diff); // Minimum width of 50px
    setColumnWidths(prev => ({
      ...prev,
      [resizingColumn.current!]: newWidth
    }));
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

  // Row resize handlers
  const handleRowResizeStart = useCallback((e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRow.current = rowId;
    startY.current = e.clientY;
    startHeight.current = rowHeights[rowId] || defaultRowHeight;
    document.addEventListener('mousemove', handleRowResizeMove);
    document.addEventListener('mouseup', handleRowResizeEnd);
  }, [rowHeights]);

  const handleRowResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingRow.current) return;
    const diff = e.clientY - startY.current;
    const newHeight = Math.max(40, startHeight.current + diff); // Minimum height of 40px
    setRowHeights(prev => ({
      ...prev,
      [resizingRow.current!]: newHeight
    }));
  }, []);

  const handleRowResizeEnd = useCallback(() => {
    resizingRow.current = null;
    document.removeEventListener('mousemove', handleRowResizeMove);
    document.removeEventListener('mouseup', handleRowResizeEnd);
  }, [handleRowResizeMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('mousemove', handleRowResizeMove);
      document.removeEventListener('mouseup', handleRowResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd, handleRowResizeMove, handleRowResizeEnd]);

  // Helper functions for order status
  const isNewOrder = (order: Order) => !order.is_paid && !order.is_shipped && !order.is_delivered; // Order is NEW until paid/shipped/delivered
  const needsTracking = (order: Order) => !order.tracking_number; // Needs tracking until supplier fills it
  const isOutOfStock = (order: Order) => order.is_out_of_stock;

  // Count orders by status for filter tabs
  const statusCounts = {
    all: orders.length,
    new: orders.filter(isNewOrder).length,
    paid: orders.filter(order => order.is_paid).length,
    needs_tracking: orders.filter(needsTracking).length,
    shipped: orders.filter(order => order.is_shipped).length,
    delivered: orders.filter(order => order.is_delivered).length,
    out_of_stock: orders.filter(isOutOfStock).length,
    issue: orders.filter(order => !!order.issue).length,
  };

  const filteredOrders = orders
    .filter(order => {
      // Apply status filter first
      if (statusFilter === 'new' && !isNewOrder(order)) return false;
      if (statusFilter === 'paid' && !order.is_paid) return false;
      if (statusFilter === 'needs_tracking' && !needsTracking(order)) return false;
      if (statusFilter === 'shipped' && !order.is_shipped) return false;
      if (statusFilter === 'delivered' && !order.is_delivered) return false;
      if (statusFilter === 'out_of_stock' && !isOutOfStock(order)) return false;
      if (statusFilter === 'issue' && !order.issue) return false;

      // Then apply search filter
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        order.customer_name?.toLowerCase().includes(search) ||
        order.product_name?.toLowerCase().includes(search) ||
        order.etsy_order_no?.toLowerCase().includes(search) ||
        order.address?.toLowerCase().includes(search) ||
        order.tracking_number?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aVal = a[sortConfig.key];
      const bVal = b[sortConfig.key];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const formatCurrency = (value?: number) => {
    if (value === undefined || value === null) return '';
    return `$${value.toFixed(2)}`;
  };

  if (authLoading || !user || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Define columns for the table
  const columns = [
    { key: 'ordered_date', label: 'Ordered Date', type: 'date', minWidth: 130 },
    { key: 'ship_by', label: 'Ship By', type: 'date', minWidth: 130 },
    { key: 'etsy_order_no', label: 'Etsy Order #', type: 'text', minWidth: 120 },
    { key: 'customer_name', label: 'Customer Name', type: 'text', minWidth: 150 },
    { key: 'address', label: 'Address', type: 'textarea', minWidth: 180 },
    { key: 'product_link', label: 'Product Link', type: 'link', minWidth: 120 },
    { key: 'size', label: 'Size', type: 'text', minWidth: 80 },
    { key: 'color', label: 'Color', type: 'text', minWidth: 80 },
    { key: 'material', label: 'Material', type: 'text', minWidth: 90 },
    { key: 'notes', label: 'Notes', type: 'textarea', minWidth: 150 },
    { key: 'first_message_sent', label: '1st Msg', type: 'checkbox', minWidth: 60, adminOnly: true },
    { key: 'total_amount_to_pay', label: 'Amount to Pay', type: 'number', minWidth: 100, adminOnly: true },
    { key: 'tracking_number', label: 'Tracking #', type: 'text', minWidth: 130 },
    { key: 'is_paid', label: 'Paid', type: 'checkbox', minWidth: 50 },
    { key: 'tracking_added', label: 'Track Added', type: 'checkbox', minWidth: 60, adminOnly: true },
    { key: 'is_shipped', label: 'Shipped', type: 'checkbox', minWidth: 60 },
    { key: 'shipped_message_sent', label: 'Ship Msg', type: 'checkbox', minWidth: 60, adminOnly: true },
    { key: 'is_completed_on_etsy', label: 'Etsy Done', type: 'checkbox', minWidth: 60 },
    { key: 'is_delivered', label: 'Delivered', type: 'checkbox', minWidth: 60 },
    { key: 'review_message_sent', label: 'Review Msg', type: 'checkbox', minWidth: 60, adminOnly: true },
    { key: 'order_from', label: 'Order From', type: 'text', minWidth: 100 },
    { key: 'sold_for', label: 'Sold For', type: 'number', minWidth: 90, adminOnly: true },
    { key: 'fees_percent', label: 'Fees %', type: 'number', minWidth: 70, adminOnly: true },
    { key: 'product_cost', label: 'Cost', type: 'number', minWidth: 80, adminOnly: true },
    { key: 'profit', label: 'Profit', type: 'readonly', minWidth: 80, adminOnly: true },
    { key: 'issue', label: 'Issue', type: 'textarea', minWidth: 150, adminOnly: true },
    { key: 'the_solution', label: 'Solution', type: 'textarea', minWidth: 150, adminOnly: true },
    { key: 'internal_notes', label: 'Internal Notes', type: 'textarea', minWidth: 150, adminOnly: true },
  ].filter(col => isAdmin || !col.adminOnly);

  const headerBg = isAdmin ? 'bg-white border-b' : 'bg-blue-600';
  const headerText = isAdmin ? 'text-gray-900' : 'text-white';

  // Common input styles for better editing experience
  const inputBaseStyle = "w-full px-2 py-1.5 text-base text-gray-900 bg-white border border-gray-200 rounded focus:border-[#d96f36] focus:ring-1 focus:ring-[#d96f36] focus:outline-none transition-colors";
  const checkboxStyle = "w-5 h-5 rounded border-gray-300 text-[#d96f36] focus:ring-[#d96f36] cursor-pointer";

  // Render table cell based on type
  const renderCell = (order: Order, col: typeof columns[0]) => {
    const value = (order as any)[col.key];

    switch (col.type) {
      case 'checkbox':
        return (
          <div className="flex items-center justify-center">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFieldUpdate(order.id, col.key as keyof Order, e.target.checked)}
              className={checkboxStyle}
            />
          </div>
        );

      case 'date':
        return (
          <EditableField
            type="date"
            value={value || ''}
            onChange={(v) => handleFieldUpdate(order.id, col.key as keyof Order, v)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            step="0.01"
            value={value || ''}
            onChange={(e) => handleFieldUpdate(order.id, col.key as keyof Order, parseFloat(e.target.value) || 0)}
            className={inputBaseStyle}
            placeholder="0.00"
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleFieldUpdate(order.id, col.key as keyof Order, e.target.value)}
            rows={2}
            className={`${inputBaseStyle} resize-none`}
            placeholder="..."
          />
        );

      case 'link':
        return (
          <div className="flex items-center gap-1">
            <input
              type="text"
              value={value || ''}
              onChange={(e) => handleFieldUpdate(order.id, col.key as keyof Order, e.target.value)}
              className={`${inputBaseStyle} text-blue-600`}
              placeholder="https://..."
            />
            {value && (
              <a href={value} target="_blank" rel="noopener noreferrer" className="p-1 text-blue-600 hover:bg-blue-50 rounded flex-shrink-0">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        );

      case 'readonly':
        return (
          <span className={`text-base font-semibold px-2 py-1.5 block ${col.key === 'profit' && value >= 0 ? 'text-green-600' : col.key === 'profit' ? 'text-red-600' : 'text-gray-900'}`}>
            {col.key === 'profit' ? formatCurrency(value) : value}
          </span>
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => handleFieldUpdate(order.id, col.key as keyof Order, e.target.value)}
            className={inputBaseStyle}
            placeholder="..."
          />
        );
    }
  };

  // Render image cell (separate for frozen column)
  const renderImageCell = (order: Order) => (
    <div className="relative w-24 h-24 mx-auto">
      {order.image_url ? (
        <img src={order.image_url} alt="" className="w-24 h-24 object-cover rounded" />
      ) : (
        <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center border-2 border-dashed border-gray-300">
          <Camera className="w-5 h-5 text-gray-400" />
        </div>
      )}
      <label className="absolute inset-0 cursor-pointer hover:bg-black/10 rounded transition-colors">
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleImageUpload(order.id, file, order.image_url);
          }}
        />
      </label>
      {uploadingImage === order.id && (
        <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className={`${headerBg} ${headerText} sticky top-0 z-50 shadow-sm`}>
        <div className="px-4 py-3 pl-14 lg:pl-4">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-xl font-bold flex-1 text-center lg:text-left">
              {isAdmin ? 'Orders' : 'Supplier Orders'}
            </h1>
            <div className="flex items-center gap-2">
              <button
                onClick={fetchOrders}
                className={`p-2 rounded-lg ${isAdmin ? 'text-gray-500 hover:bg-gray-100' : 'hover:bg-blue-700'}`}
                title="Refresh"
              >
                <RefreshCw className="w-5 h-5" />
              </button>
              <button
                onClick={handleAddOrder}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: isAdmin ? BRAND_ORANGE : undefined }}
              >
                <Plus className="w-5 h-5" />
                <span className="hidden sm:inline">{isAdmin ? 'New Order' : 'New'}</span>
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 relative">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 ${isAdmin ? 'text-gray-400' : 'text-blue-300'}`} />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg ${isAdmin ? 'border text-gray-900' : 'bg-blue-700 border border-blue-500 text-white placeholder-blue-300'} focus:ring-2 ${isAdmin ? 'focus:ring-orange-500 focus:border-orange-500' : 'focus:ring-white'}`}
            />
          </div>
        </div>
      </header>

      {/* Status Filter Tabs */}
      <div className="px-4 pt-4">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              statusFilter === 'all'
                ? 'bg-gray-800 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All Orders
            <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === 'all' ? 'bg-gray-600' : 'bg-gray-200'}`}>
              {statusCounts.all}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('new')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              statusFilter === 'new'
                ? 'bg-orange-500 text-white'
                : 'bg-white text-gray-700 hover:bg-orange-50 border border-gray-200'
            }`}
          >
            <Package className="w-4 h-4" />
            New
            {statusCounts.new > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === 'new' ? 'bg-orange-600' : 'bg-orange-100 text-orange-700'}`}>
                {statusCounts.new}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('paid')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              statusFilter === 'paid'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700 hover:bg-green-50 border border-gray-200'
            }`}
          >
            Paid
            {statusCounts.paid > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === 'paid' ? 'bg-green-600' : 'bg-green-100 text-green-700'}`}>
                {statusCounts.paid}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('needs_tracking')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              statusFilter === 'needs_tracking'
                ? 'bg-blue-500 text-white'
                : 'bg-white text-gray-700 hover:bg-blue-50 border border-gray-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            Needs Tracking
            {statusCounts.needs_tracking > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === 'needs_tracking' ? 'bg-blue-600' : 'bg-blue-100 text-blue-700'}`}>
                {statusCounts.needs_tracking}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('shipped')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              statusFilter === 'shipped'
                ? 'bg-purple-500 text-white'
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            Shipped
            {statusCounts.shipped > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === 'shipped' ? 'bg-purple-600' : 'bg-purple-100 text-purple-700'}`}>
                {statusCounts.shipped}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('delivered')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              statusFilter === 'delivered'
                ? 'bg-teal-500 text-white'
                : 'bg-white text-gray-700 hover:bg-teal-50 border border-gray-200'
            }`}
          >
            Delivered
            {statusCounts.delivered > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === 'delivered' ? 'bg-teal-600' : 'bg-teal-100 text-teal-700'}`}>
                {statusCounts.delivered}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('out_of_stock')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              statusFilter === 'out_of_stock'
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-700 hover:bg-red-50 border border-gray-200'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            Out of Stock
            {statusCounts.out_of_stock > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === 'out_of_stock' ? 'bg-red-600' : 'bg-red-100 text-red-700'}`}>
                {statusCounts.out_of_stock}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('issue')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              statusFilter === 'issue'
                ? 'bg-red-600 text-white'
                : 'bg-white text-gray-700 hover:bg-red-50 border border-gray-200'
            }`}
          >
            Action Needed
            {statusCounts.issue > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-red-600 text-white">
                {statusCounts.issue}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {isAdmin && selectedOrders.size > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
          <CheckSquare className="w-5 h-5 text-orange-600" />
          <span className="text-sm font-medium text-orange-800">
            {selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''} selected
          </span>
          <div className="flex-1" />
          <button
            type="button"
            onClick={clearSelection}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setBulkDeleteConfirm(true)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </button>
        </div>
      )}

      {/* Desktop Table View - Simplified */}
      <div className="hidden lg:block p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 220px)' }}>
            <table style={{ tableLayout: 'fixed', width: Math.max(Object.values(columnWidths).reduce((a, b) => a + b, 0) + 40, 0) }}>
              {/* Table Header */}
              <thead className="sticky top-0 z-20">
                <tr style={{ backgroundColor: BRAND_ORANGE }}>
                  {/* Select All Checkbox */}
                  {isAdmin && (
                    <th className="px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: 40 }}>
                      <input
                        type="checkbox"
                        checked={filteredOrders.length > 0 && selectedOrders.size === filteredOrders.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 rounded border-white/50 text-white focus:ring-white cursor-pointer accent-white"
                      />
                    </th>
                  )}
                  {/* Row Number */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.rowNum }}>
                    #
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => handleResizeStart(e, 'rowNum')}
                    />
                  </th>
                  {/* Status */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: 90 }}>
                    Status
                  </th>
                  {/* Image */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.image }}>
                    Image
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => handleResizeStart(e, 'image')}
                    />
                  </th>
                  {/* Date */}
                  <th
                    className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer bg-[#d96f36] hover:bg-[#c45f2a] transition-colors"
                    style={{ width: columnWidths.date }}
                    onClick={() => handleSort('ordered_date')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Date
                      {sortConfig.key === 'ordered_date' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'date'); }}
                    />
                  </th>
                  {/* Quantity */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] bg-[#d96f36]" style={{ width: 60 }}>
                    Qty
                  </th>
                  {/* Ship By */}
                  <th
                    className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer bg-[#d96f36] hover:bg-[#c45f2a] transition-colors"
                    style={{ width: columnWidths.shipBy }}
                    onClick={() => handleSort('ship_by')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Ship By
                      {sortConfig.key === 'ship_by' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'shipBy'); }}
                    />
                  </th>
                  {/* Product Name */}
                  <th
                    className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer bg-[#d96f36] hover:bg-[#c45f2a] transition-colors"
                    style={{ width: columnWidths.productName }}
                    onClick={() => handleSort('product_name')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Product Name
                      {sortConfig.key === 'product_name' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'productName'); }}
                    />
                  </th>
                  {/* Tracking Number */}
                  <th
                    className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer bg-[#d96f36] hover:bg-[#c45f2a] transition-colors"
                    style={{ width: columnWidths.orderNo }}
                    onClick={() => handleSort('tracking_number')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Tracking #
                      {sortConfig.key === 'tracking_number' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'orderNo'); }}
                    />
                  </th>
                  {/* Customer */}
                  <th
                    className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer bg-[#d96f36] hover:bg-[#c45f2a] transition-colors"
                    style={{ width: columnWidths.customer }}
                    onClick={() => handleSort('customer_name')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Customer
                      {sortConfig.key === 'customer_name' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'customer'); }}
                    />
                  </th>
                  {/* Address */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.address }}>
                    Address
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => handleResizeStart(e, 'address')}
                    />
                  </th>
                  {/* Size */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.size }}>
                    Size
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => handleResizeStart(e, 'size')}
                    />
                  </th>
                  {/* Color */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.color }}>
                    Color
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => handleResizeStart(e, 'color')}
                    />
                  </th>
                  {/* Material */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.material }}>
                    Material
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => handleResizeStart(e, 'material')}
                    />
                  </th>
                  {/* Paid */}
                  <th
                    className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer bg-[#d96f36] hover:bg-[#c45f2a] transition-colors"
                    style={{ width: columnWidths.paid }}
                    onClick={() => handleSort('is_paid')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Paid
                      {sortConfig.key === 'is_paid' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'paid'); }}
                    />
                  </th>
                  {/* Shipped */}
                  <th
                    className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer bg-[#d96f36] hover:bg-[#c45f2a] transition-colors"
                    style={{ width: columnWidths.shipped }}
                    onClick={() => handleSort('is_shipped')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Shipped
                      {sortConfig.key === 'is_shipped' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'shipped'); }}
                    />
                  </th>
                  {/* Delivered */}
                  <th
                    className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer bg-[#d96f36] hover:bg-[#c45f2a] transition-colors"
                    style={{ width: columnWidths.delivered }}
                    onClick={() => handleSort('is_delivered')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Delivered
                      {sortConfig.key === 'is_delivered' ? (
                        sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                    </div>
                    <div
                      className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                      onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'delivered'); }}
                    />
                  </th>
                  {/* Amount to Pay (Supplier view) */}
                  {!isAdmin && (
                    <th
                      className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer bg-[#d96f36] hover:bg-[#c45f2a] transition-colors"
                      style={{ width: 100 }}
                      onClick={() => handleSort('total_amount_to_pay')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Amount
                        {sortConfig.key === 'total_amount_to_pay' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                      </div>
                    </th>
                  )}
                  {/* Profit (Admin only) */}
                  {isAdmin && (
                    <th
                      className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer bg-[#d96f36] hover:bg-[#c45f2a] transition-colors"
                      style={{ width: columnWidths.profit }}
                      onClick={() => handleSort('profit')}
                    >
                      <div className="flex items-center justify-center gap-1">
                        Profit
                        {sortConfig.key === 'profit' ? (
                          sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                        ) : <ArrowUpDown className="w-3 h-3 opacity-50" />}
                      </div>
                      <div
                        className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30"
                        onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'profit'); }}
                      />
                    </th>
                  )}
                  {/* Actions (Admin only) */}
                  {isAdmin && (
                    <th className="relative px-3 py-3 text-center text-sm font-semibold text-white" style={{ width: columnWidths.actions }}>
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={isAdmin ? 17 : 15} className="px-4 py-12 text-center text-gray-500">
                      No orders yet.{' '}
                      <button onClick={handleAddOrder} className="text-[#d96f36] hover:underline font-medium">
                        Create your first order
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order, index) => (
                    <tr
                      key={order.id}
                      className={`border-b-2 border-gray-200 hover:bg-orange-50 cursor-pointer transition-colors relative group ${isNewOrder(order) ? 'bg-orange-50/50' : ''} ${selectedOrders.has(order.id) ? 'bg-orange-100' : ''}`}
                      style={{ height: rowHeights[order.id] || defaultRowHeight }}
                      onClick={() => {
                        setSelectedOrder(order);
                        acknowledgeOrder(order);
                      }}
                    >
                      {/* Row Checkbox */}
                      {isAdmin && (
                        <td className="px-3 py-3 text-center border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedOrders.has(order.id)}
                            onChange={() => toggleSelectOrder(order.id)}
                            className={checkboxStyle}
                          />
                        </td>
                      )}
                      {/* Row number */}
                      <td className="px-3 py-3 text-center text-base font-medium text-gray-600 border-r border-gray-100 relative">
                        {index + 1}
                        {/* Row resize handle */}
                        <div
                          className="absolute left-0 bottom-0 w-full h-1 cursor-row-resize hover:bg-[#d96f36]/30 opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => { e.stopPropagation(); handleRowResizeStart(e, order.id); }}
                        />
                      </td>
                      {/* Status badges */}
                      <td className="px-2 py-3 text-center border-r border-gray-100">
                        <div className="flex flex-col items-center gap-1">
                          {isNewOrder(order) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                              NEW
                            </span>
                          )}
                          {isOutOfStock(order) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                              OUT
                            </span>
                          )}
                          {needsTracking(order) && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                              TRACK
                            </span>
                          )}
                          {order.is_paid && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                              PAID
                            </span>
                          )}
                          {order.is_shipped && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                              SHIPPED
                            </span>
                          )}
                          {order.is_delivered && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-700">
                              DELIVERED
                            </span>
                          )}
                        </div>
                      </td>
                      {/* Image */}
                      <td className="px-3 py-3 text-center border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <div className="relative w-24 h-24 mx-auto group/img" data-product-search>
                          {order.image_url ? (
                            <img src={order.image_url} alt="" className="w-24 h-24 object-cover rounded" />
                          ) : (
                            <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center border border-dashed border-gray-300">
                              <Camera className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <label className="absolute inset-0 cursor-pointer rounded overflow-hidden">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(order.id, file, order.image_url);
                              }}
                            />
                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/40 transition-colors flex items-center justify-center">
                              <Camera className="w-4 h-4 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                            </div>
                          </label>
                          {/* Quick-fix product button */}
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setProductDropdownOpen(productDropdownOpen === `inline_${order.id}` ? null : `inline_${order.id}`);
                              setProductSearch('');
                            }}
                            className="absolute -top-1 -right-1 w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center opacity-0 group-hover/img:opacity-100 transition-opacity shadow-sm hover:bg-orange-50 hover:border-orange-400 z-10"
                            title="Change product"
                          >
                            <Pencil className="w-3 h-3 text-gray-600" />
                          </button>
                          {uploadingImage === order.id && (
                            <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            </div>
                          )}
                          {/* Inline product dropdown */}
                          {productDropdownOpen === `inline_${order.id}` && (
                            <div className="absolute z-50 top-full left-0 mt-1 w-72 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden" onClick={(e) => e.stopPropagation()}>
                              <div className="p-2 border-b">
                                <input
                                  type="text"
                                  value={productSearch}
                                  onChange={(e) => setProductSearch(e.target.value)}
                                  placeholder="Search products..."
                                  className="w-full px-2 py-1.5 border rounded text-sm text-gray-900 focus:ring-2 focus:ring-orange-500"
                                  autoFocus
                                />
                              </div>
                              <div className="max-h-60 overflow-y-auto">
                                {products
                                  .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                                  .map((product) => (
                                    <button
                                      key={product.id}
                                      onClick={() => {
                                        handleSelectProduct(order.id, product.id);
                                        setProductDropdownOpen(null);
                                        setProductSearch('');
                                      }}
                                      className={`w-full text-left px-2 py-1.5 text-xs hover:bg-blue-50 transition-colors flex items-center gap-2 ${
                                        order.product_id === product.id ? 'bg-blue-50 font-medium' : ''
                                      }`}
                                    >
                                      {product.image_url ? (
                                        <img src={product.image_url} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />
                                      ) : (
                                        <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                          <Package className="w-4 h-4 text-gray-400" />
                                        </div>
                                      )}
                                      <span className="line-clamp-2">{product.name}</span>
                                    </button>
                                  ))}
                              </div>
                              {/* Inline variation picker */}
                              {(() => {
                                const selectedProd = products.find(p => p.id === order.product_id);
                                if (selectedProd?.variations && selectedProd.variations.length > 0) {
                                  return (
                                    <div className="border-t p-2 flex flex-wrap gap-1">
                                      {selectedProd.variations.map((v) => (
                                        <button
                                          key={v.id}
                                          onClick={() => {
                                            handleSelectVariation(order.id, v.id);
                                            setProductDropdownOpen(null);
                                          }}
                                          className={`flex items-center gap-1 px-1.5 py-1 rounded border text-xs transition-colors ${
                                            order.variation_id === v.id
                                              ? 'border-orange-400 bg-orange-50'
                                              : 'border-gray-200 hover:border-blue-300'
                                          }`}
                                        >
                                          {v.image_url && (
                                            <img src={v.image_url} alt="" className="w-8 h-8 object-cover rounded flex-shrink-0" />
                                          )}
                                          <span>{v.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Date */}
                      <td className="px-3 py-3 text-center text-base text-gray-900 border-r border-gray-100">
                        {formatDate(order.ordered_date)}
                      </td>
                      {/* Quantity */}
                      <td className="px-3 py-3 text-center text-base text-gray-900 border-r border-gray-100">
                        {(order.quantity ?? 1) > 1
                          ? <span className="font-semibold text-orange-600">×{order.quantity}</span>
                          : <span className="text-gray-400">1</span>
                        }
                      </td>
                      {/* Ship By */}
                      <td className="px-3 py-3 text-center text-base text-gray-900 border-r border-gray-100">
                        {formatDate(order.ship_by)}
                      </td>
                      {/* Product Name */}
                      <td className="px-3 py-3 text-center text-base text-gray-900 border-r border-gray-100">
                        <div className="line-clamp-2" title={order.product_name || ''}>
                          {order.product_name || '-'}
                        </div>
                      </td>
                      {/* Tracking Number */}
                      <td className="px-3 py-3 text-center text-base text-gray-900 font-medium border-r border-gray-100">
                        <div className="line-clamp-2" title={order.tracking_number || ''}>
                          {order.tracking_number || '-'}
                        </div>
                      </td>
                      {/* Customer */}
                      <td className="px-3 py-3 text-center text-base text-gray-900 border-r border-gray-100">
                        <div className="line-clamp-2" title={order.customer_name || ''}>
                          {order.customer_name || '-'}
                        </div>
                      </td>
                      {/* Address */}
                      <td className="px-3 py-3 text-center text-base text-gray-700 border-r border-gray-100">
                        <div className="line-clamp-2" title={order.address || ''}>
                          {order.address || '-'}
                        </div>
                      </td>
                      {/* Size */}
                      <td className="px-3 py-3 text-center border-r border-gray-100">
                        {order.size ? (
                          <span className="inline-block bg-blue-100 text-gray-900 px-2 py-1 rounded text-sm font-medium">
                            {order.size}
                          </span>
                        ) : '-'}
                      </td>
                      {/* Color */}
                      <td className="px-3 py-3 text-center border-r border-gray-100">
                        {order.color ? (
                          <span className="inline-block bg-gray-200 text-gray-900 px-2 py-1 rounded text-sm font-medium">
                            {order.color}
                          </span>
                        ) : '-'}
                      </td>
                      {/* Material */}
                      <td className="px-3 py-3 text-center border-r border-gray-100">
                        {order.material ? (
                          <span className="inline-block bg-green-100 text-gray-900 px-2 py-1 rounded text-sm font-medium">
                            {order.material}
                          </span>
                        ) : '-'}
                      </td>
                      {/* Paid */}
                      <td className="px-3 py-3 text-center border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={order.is_paid || false}
                          onChange={(e) => handleFieldUpdate(order.id, 'is_paid', e.target.checked)}
                          className={checkboxStyle}
                        />
                      </td>
                      {/* Shipped */}
                      <td className="px-3 py-3 text-center border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={order.is_shipped || false}
                          onChange={(e) => handleFieldUpdate(order.id, 'is_shipped', e.target.checked)}
                          className={checkboxStyle}
                        />
                      </td>
                      {/* Delivered */}
                      <td className="px-3 py-3 text-center border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={order.is_delivered || false}
                          onChange={(e) => handleFieldUpdate(order.id, 'is_delivered', e.target.checked)}
                          className={checkboxStyle}
                        />
                      </td>
                      {/* Amount to Pay (Supplier view) */}
                      {!isAdmin && (
                        <td className="px-3 py-3 text-center border-r border-gray-100">
                          <span className="text-sm font-semibold text-blue-600">
                            {formatCurrency(order.total_amount_to_pay)}
                          </span>
                        </td>
                      )}
                      {/* Profit (admin only) */}
                      {isAdmin && (
                        <td className="px-3 py-3 text-center border-r border-gray-100">
                          <span className={`text-sm font-semibold ${order.profit && order.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(order.profit)}
                          </span>
                        </td>
                      )}
                      {/* Actions (Admin only) */}
                      {isAdmin && (
                        <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => openDeleteConfirm(order)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Summary Footer for Desktop */}
        {isAdmin && orders.length > 0 && (
          <div className="mt-4 flex justify-end gap-6 text-sm">
            <span className="text-gray-600">{filteredOrders.length} orders</span>
            <span className="text-gray-600">Total Sales: <strong className="text-green-600">{formatCurrency(filteredOrders.reduce((s, o) => s + (o.sold_for || 0), 0))}</strong></span>
            <span className="text-gray-600">Total Profit: <strong style={{ color: BRAND_ORANGE }}>{formatCurrency(filteredOrders.reduce((s, o) => s + (o.profit || 0), 0))}</strong></span>
          </div>
        )}
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden p-4 space-y-4 pb-24">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <p className="text-gray-900">No orders yet</p>
            <button
              onClick={handleAddOrder}
              className="mt-4 font-medium hover:underline"
              style={{ color: BRAND_ORANGE }}
            >
              Create your first order
            </button>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order.id} className={`bg-white rounded-xl shadow-sm overflow-hidden ${isNewOrder(order) ? 'ring-2 ring-orange-300' : ''}`}>
              {/* Order Header - Always Visible */}
              <div
                className="p-3 cursor-pointer hover:bg-gray-50 space-y-2"
                onClick={() => {
                  setExpandedOrder(expandedOrder === order.id ? null : order.id);
                  acknowledgeOrder(order);
                }}
              >
                {/* Top row: Checkbox + Image + Color/Size/Material + Actions */}
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  {isAdmin && (
                    <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleSelectOrder(order.id)}
                        className="w-4 h-4 rounded border-gray-300 text-[#d96f36] focus:ring-[#d96f36] cursor-pointer"
                      />
                    </div>
                  )}

                  {/* Image */}
                  <div className="relative flex-shrink-0">
                    {order.image_url ? (
                      <img src={order.image_url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                    ) : (
                      <div className="w-24 h-24 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Camera className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                    {uploadingImage === order.id && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>

                  {/* Color, Size, Material */}
                  <div className="flex-1 min-w-0 grid grid-cols-3 gap-2">
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase">Color</span>
                      <span className="block text-sm text-gray-900 truncate">{order.color || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase">Size</span>
                      <span className="block text-sm text-gray-900 truncate">{order.size || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase">Material</span>
                      <span className="block text-sm text-gray-900 truncate">{order.material || '-'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedOrder(order)}
                      className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    {isAdmin && (
                      <button
                        onClick={() => openDeleteConfirm(order)}
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {expandedOrder === order.id ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Product Name + Status badges */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm truncate">{order.product_name || 'New Order'}</h3>
                  {order.etsy_order_no && (
                    <span className="text-xs text-gray-500">#{order.etsy_order_no}</span>
                  )}
                  {isNewOrder(order) && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-100 text-orange-700">NEW</span>
                  )}
                  {isOutOfStock(order) && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-700">OUT</span>
                  )}
                  {needsTracking(order) && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-100 text-blue-700">TRACK</span>
                  )}
                  {order.is_paid && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-green-100 text-green-700">PAID</span>
                  )}
                  {order.is_shipped && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-purple-100 text-purple-700">SHIPPED</span>
                  )}
                  {order.is_delivered && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-teal-100 text-teal-700">DELIVERED</span>
                  )}
                </div>

                {/* Date + Customer + Supplier */}
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span>{formatDate(order.ordered_date) !== '-' ? formatDate(order.ordered_date) : 'No date'}</span>
                  {order.customer_name && <span>• {order.customer_name}</span>}
                  {order.order_from && <span>• {order.order_from}</span>}
                  {(order.quantity ?? 1) > 1 && <span className="px-1.5 py-0.5 rounded bg-orange-100 text-orange-700 font-semibold">×{order.quantity}</span>}
                </div>

                {/* Prices */}
                {isAdmin && (order.sold_for || (order.profit !== undefined && order.profit !== null)) && (
                  <div className="flex items-center gap-3">
                    {order.sold_for && (
                      <span className="text-xs text-gray-500">Sold: <span className="font-semibold text-gray-900">{formatCurrency(order.sold_for)}</span></span>
                    )}
                    {order.profit !== undefined && order.profit !== null && (
                      <span className="text-xs text-gray-500">Profit: <span className={`font-semibold ${order.profit >= 0 ? 'text-green-700' : 'text-red-500'}`}>{formatCurrency(order.profit)}</span></span>
                    )}
                  </div>
                )}
              </div>

              {/* Expanded Content - Mobile */}
              {expandedOrder === order.id && (
                <div className="border-t bg-gray-50 p-4 space-y-4">
                  {/* Product Selector */}
                  {products.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 relative" data-product-search>
                      <label className="block text-xs font-medium text-blue-800 mb-1">
                        <ShoppingBag className="w-3 h-3 inline mr-1" />
                        Select from Products Catalog
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                        <input
                          type="text"
                          value={productDropdownOpen === order.id ? productSearch : (products.find(p => p.id === order.product_id)?.name || '')}
                          onChange={(e) => {
                            setProductSearch(e.target.value);
                            if (!productDropdownOpen) setProductDropdownOpen(order.id);
                          }}
                          onFocus={() => {
                            setProductDropdownOpen(order.id);
                            setProductSearch('');
                          }}
                          placeholder="Search products..."
                          className="w-full pl-9 pr-3 py-2 border border-blue-300 rounded-lg text-gray-900 bg-white focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      {productDropdownOpen === order.id && (
                        <div className="absolute z-50 left-3 right-3 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                          {products
                            .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                            .map((product) => (
                              <button
                                key={product.id}
                                onClick={() => {
                                  handleSelectProduct(order.id, product.id);
                                  setProductDropdownOpen(null);
                                  setProductSearch('');
                                }}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center gap-3 ${
                                  order.product_id === product.id ? 'bg-blue-50 font-medium' : ''
                                }`}
                              >
                                {product.image_url ? (
                                  <img src={product.image_url} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                                ) : (
                                  <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                    <Package className="w-5 h-5 text-gray-400" />
                                  </div>
                                )}
                                <span className="line-clamp-2">{product.name}</span>
                              </button>
                            ))}
                          {products.filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                            <div className="px-3 py-2 text-sm text-gray-400">No products found</div>
                          )}
                        </div>
                      )}
                      {/* Variation picker - visual grid */}
                      {(() => {
                        const selectedProd = products.find(p => p.id === order.product_id);
                        if (selectedProd?.variations && selectedProd.variations.length > 0) {
                          return (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {selectedProd.variations.map((v) => (
                                <button
                                  key={v.id}
                                  onClick={() => handleSelectVariation(order.id, v.id)}
                                  className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-sm transition-colors ${
                                    order.variation_id === v.id
                                      ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-300'
                                      : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                                  }`}
                                >
                                  {v.image_url ? (
                                    <img src={v.image_url} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />
                                  ) : (
                                    <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                      <Package className="w-4 h-4 text-gray-400" />
                                    </div>
                                  )}
                                  <div className="text-left">
                                    <div className="font-medium text-gray-900">{v.name}</div>
                                    {v.price && <div className="text-xs text-gray-500">${v.price}</div>}
                                  </div>
                                </button>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">Order Date</label>
                      <EditableField
                        type="date"
                        value={order.ordered_date || ''}
                        onChange={(v) => handleFieldUpdate(order.id, 'ordered_date', v)}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">Ship By</label>
                      <EditableField
                        type="date"
                        value={order.ship_by || ''}
                        onChange={(v) => handleFieldUpdate(order.id, 'ship_by', v)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">Product Name</label>
                      <input
                        type="text"
                        value={order.product_name || ''}
                        onChange={(e) => handleDebouncedFieldUpdate(order.id, 'product_name', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">Etsy Order #</label>
                      <input
                        type="text"
                        value={order.etsy_order_no || ''}
                        onChange={(e) => handleDebouncedFieldUpdate(order.id, 'etsy_order_no', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">Customer Name</label>
                      <input
                        type="text"
                        value={order.customer_name || ''}
                        onChange={(e) => handleDebouncedFieldUpdate(order.id, 'customer_name', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">Supplier</label>
                    <input
                      type="text"
                      value={order.order_from || ''}
                      onChange={(e) => handleDebouncedFieldUpdate(order.id, 'order_from', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">Address</label>
                    <textarea
                      value={order.address || ''}
                      onChange={(e) => handleDebouncedFieldUpdate(order.id, 'address', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">Product Link</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={order.product_link || ''}
                        onChange={(e) => handleDebouncedFieldUpdate(order.id, 'product_link', e.target.value)}
                        className="flex-1 px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      />
                      {order.product_link && (
                        <a href={order.product_link} target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg" style={{ backgroundColor: '#fef3e8', color: BRAND_ORANGE }}>
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">Size</label>
                      <input
                        type="text"
                        value={order.size || ''}
                        onChange={(e) => handleDebouncedFieldUpdate(order.id, 'size', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">Color</label>
                      <input
                        type="text"
                        value={order.color || ''}
                        onChange={(e) => handleDebouncedFieldUpdate(order.id, 'color', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">Material</label>
                      <input
                        type="text"
                        value={order.material || ''}
                        onChange={(e) => handleDebouncedFieldUpdate(order.id, 'material', e.target.value)}
                        className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">Notes</label>
                    <textarea
                      value={order.notes || ''}
                      onChange={(e) => handleDebouncedFieldUpdate(order.id, 'notes', e.target.value)}
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {isAdmin && (() => {
                    const linkedProduct = products.find(p => p.id === order.product_id);
                    const etsyPrice = linkedProduct?.etsy_full_price || null;
                    const salePercent = linkedProduct?.sale_percent ?? 30;
                    const supplierPrice = linkedProduct?.supplier_price || null;
                    const supplierName = linkedProduct?.supplier_name || null;
                    const afterSale = etsyPrice ? etsyPrice * (1 - salePercent / 100) : null;
                    const etsyFee = afterSale ? afterSale * 0.12 : null;
                    const profit = (afterSale !== null && etsyFee !== null && supplierPrice) ? afterSale - etsyFee - supplierPrice : null;
                    const profitPercent = (profit !== null && afterSale) ? ((profit / afterSale) * 100).toFixed(0) : null;

                    return (
                      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
                        <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Pricing</h3>

                        {/* Row 1: Etsy Price, Sale %, After Sale */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Etsy Price</label>
                            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                              {etsyPrice ? `$${etsyPrice.toFixed(0)}` : '-'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Sale %</label>
                            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                              {salePercent}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">After Sale</label>
                            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                              {afterSale !== null ? `$${afterSale.toFixed(2)}` : '-'}
                            </div>
                          </div>
                        </div>

                        {/* Row 2: Etsy Fee, After Fee, Supplier $ */}
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Etsy Fee (12%)</label>
                            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-red-500">
                              {etsyFee !== null ? `-$${etsyFee.toFixed(2)}` : '-'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">After Fee</label>
                            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                              {(afterSale !== null && etsyFee !== null) ? `$${(afterSale - etsyFee).toFixed(2)}` : '-'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Supplier $</label>
                            <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                              {supplierPrice ? `$${supplierPrice.toFixed(2)}` : '-'}
                              {supplierName && (
                                <span className="text-xs text-gray-400 ml-1">({supplierName})</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Profit $</label>
                            <div className={`px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm ${
                              profit === null ? 'text-gray-400' : profit >= 0 ? 'text-green-700' : 'text-red-500'
                            }`}>
                              {profit !== null ? `$${profit.toFixed(2)}` : '-'}
                            </div>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-600 mb-1">Profit %</label>
                            <div className={`px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm ${
                              profitPercent === null ? 'text-gray-400' : profit! >= 0 ? 'text-green-700' : 'text-red-500'
                            }`}>
                              {profitPercent !== null ? `${profitPercent}%` : '-'}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Amount to Pay - Visible to Supplier */}
                  {!isAdmin && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-blue-900">Amount to Pay</label>
                        <span className="text-xl font-bold text-blue-700">
                          {formatCurrency(order.total_amount_to_pay)}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Out of Stock Toggle - Mobile */}
                  <div className={`rounded-lg p-3 border ${order.is_out_of_stock ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`w-5 h-5 ${order.is_out_of_stock ? 'text-red-500' : 'text-gray-400'}`} />
                        <span className={`text-sm font-medium ${order.is_out_of_stock ? 'text-red-700' : 'text-gray-700'}`}>
                          Out of Stock
                        </span>
                      </div>
                      <button
                        onClick={() => handleFieldUpdate(order.id, 'is_out_of_stock', !order.is_out_of_stock)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                          order.is_out_of_stock
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {order.is_out_of_stock ? 'Yes' : 'No'}
                      </button>
                    </div>
                  </div>

                  <div className="rounded-lg p-4" style={{ backgroundColor: '#fef3e8' }}>
                    <h3 className="font-medium mb-3" style={{ color: '#b35a2b' }}>Status</h3>
                    <div className={`grid gap-3 ${isAdmin ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2 sm:grid-cols-4'}`}>
                      {[
                        { key: 'first_message_sent', label: '1st Message', adminOnly: true },
                        { key: 'is_paid', label: 'Paid', adminOnly: false },
                        { key: 'tracking_added', label: 'Tracking Added', adminOnly: true },
                        { key: 'is_shipped', label: 'Shipped', adminOnly: false },
                        { key: 'shipped_message_sent', label: 'Ship Message', adminOnly: true },
                        { key: 'is_completed_on_etsy', label: 'Etsy Complete', adminOnly: false },
                        { key: 'is_delivered', label: 'Delivered', adminOnly: false },
                        { key: 'review_message_sent', label: 'Review Message', adminOnly: true },
                      ]
                        .filter(item => isAdmin || !item.adminOnly)
                        .map(({ key, label }) => (
                          <label key={key} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={(order as any)[key] || false}
                              onChange={(e) => handleFieldUpdate(order.id, key as keyof Order, e.target.checked)}
                              className={checkboxStyle}
                            />
                            <span className="text-sm text-gray-900">{label}</span>
                          </label>
                        ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">Tracking Number</label>
                    <input
                      type="text"
                      value={order.tracking_number || ''}
                      onChange={(e) => handleDebouncedFieldUpdate(order.id, 'tracking_number', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {isAdmin && (
                    <>
                      <div className="bg-red-50 rounded-lg p-4">
                        <h3 className="font-medium text-red-800 mb-3">Issues & Solutions</h3>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-900 mb-1">Issue</label>
                            <textarea
                              value={order.issue || ''}
                              onChange={(e) => handleDebouncedFieldUpdate(order.id, 'issue', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-red-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-red-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-900 mb-1">Solution</label>
                            <textarea
                              value={order.the_solution || ''}
                              onChange={(e) => handleDebouncedFieldUpdate(order.id, 'the_solution', e.target.value)}
                              rows={2}
                              className="w-full px-3 py-2 border border-green-200 rounded-lg text-gray-900 focus:ring-2 focus:ring-green-500"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-900 mb-1">Internal Notes</label>
                        <textarea
                          value={order.internal_notes || ''}
                          onChange={(e) => handleDebouncedFieldUpdate(order.id, 'internal_notes', e.target.value)}
                          rows={2}
                          className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {isAdmin ? (
        orders.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 lg:hidden">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-900">{filteredOrders.length} orders</span>
              <div className="flex items-center gap-4">
                <span className="text-gray-900">Sales: <strong className="text-green-600">{formatCurrency(filteredOrders.reduce((s, o) => s + (o.sold_for || 0), 0))}</strong></span>
                <span className="text-gray-900">Profit: <strong style={{ color: BRAND_ORANGE }}>{formatCurrency(filteredOrders.reduce((s, o) => s + (o.profit || 0), 0))}</strong></span>
              </div>
            </div>
          </div>
        )
      ) : (
        <div className="fixed bottom-0 left-0 right-0 bg-blue-600 text-white p-3 text-center text-sm lg:hidden">
          Supplier View - Financial data hidden
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm.show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Order</h3>
              <button
                onClick={() => setDeleteConfirm({ show: false, orderId: null, orderName: '' })}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong className="text-gray-900">{deleteConfirm.orderName}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteConfirm({ show: false, orderId: null, orderName: '' })}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteConfirm.orderId && handleDeleteOrder(deleteConfirm.orderId)}
                className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete {selectedOrders.size} Orders?</h3>
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="p-1 text-gray-400 hover:text-gray-600 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete <strong className="text-gray-900">{selectedOrders.size} order{selectedOrders.size > 1 ? 's' : ''}</strong>?
              This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => setBulkDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkDelete}
                className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors"
              >
                Delete {selectedOrders.size} Orders
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Detail Card Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onMouseDown={(e) => { if (e.target === e.currentTarget) { e.preventDefault(); setSelectedOrder(null); } }}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between" style={{ backgroundColor: BRAND_ORANGE }}>
              <h2 className="text-xl font-bold text-white">
                {selectedOrder.customer_name || 'New Order'} {selectedOrder.etsy_order_no && `#${selectedOrder.etsy_order_no}`}
              </h2>
              <button
                onMouseDown={(e) => { e.preventDefault(); setSelectedOrder(null); }}
                className="p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Top Row: Order Date + Ship By + Etsy Order # */}
              <div className="flex items-end gap-4">
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Order Date</label>
                  <EditableField
                    type="date"
                    value={selectedOrder.ordered_date || ''}
                    onChange={(v) => handleFieldUpdate(selectedOrder.id, 'ordered_date', v)}
                  />
                </div>
                <div className="w-32">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Ship By</label>
                  <EditableField
                    type="date"
                    value={selectedOrder.ship_by || ''}
                    onChange={(v) => handleFieldUpdate(selectedOrder.id, 'ship_by', v)}
                  />
                </div>
                <div className="w-40">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Etsy Order #</label>
                  <EditableField
                    value={selectedOrder.etsy_order_no || ''}
                    onChange={(v) => handleFieldUpdate(selectedOrder.id, 'etsy_order_no', v)}
                    placeholder="Enter order number"
                  />
                </div>
              </div>

              {/* From Catalog (full row) */}
              {products.length > 0 && (
                <div className="relative" data-product-search>
                  <label className="block text-xs font-medium text-blue-600 mb-1">
                    <ShoppingBag className="w-3 h-3 inline mr-1" />
                    From Catalog
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    <input
                      type="text"
                      value={productDropdownOpen === selectedOrder.id ? productSearch : (products.find(p => p.id === selectedOrder.product_id)?.name || '')}
                      onChange={(e) => {
                        setProductSearch(e.target.value);
                        if (!productDropdownOpen) setProductDropdownOpen(selectedOrder.id);
                      }}
                      onFocus={() => {
                        setProductDropdownOpen(selectedOrder.id);
                        setProductSearch('');
                      }}
                      placeholder="Search products..."
                      className="w-full pl-9 pr-3 py-2 border border-blue-200 rounded-lg text-sm text-gray-900 bg-blue-50 focus:ring-2 focus:ring-blue-500"
                    />
                    {selectedOrder.product_id && productDropdownOpen !== selectedOrder.id && (
                      <button
                        onClick={() => {
                          handleSelectProduct(selectedOrder.id, '');
                        }}
                        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  {productDropdownOpen === selectedOrder.id && (
                    <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                      {products
                        .filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase()))
                        .map((product) => (
                          <button
                            key={product.id}
                            onClick={() => {
                              handleSelectProduct(selectedOrder.id, product.id);
                              setProductDropdownOpen(null);
                              setProductSearch('');
                            }}
                            className={`w-full text-left px-3 py-2 text-sm hover:bg-blue-50 transition-colors flex items-center gap-3 ${
                              selectedOrder.product_id === product.id ? 'bg-blue-50 font-medium' : ''
                            }`}
                          >
                            {product.image_url ? (
                              <img src={product.image_url} alt="" className="w-12 h-12 object-cover rounded flex-shrink-0" />
                            ) : (
                              <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                <Package className="w-5 h-5 text-gray-400" />
                              </div>
                            )}
                            <span className="line-clamp-2">{product.name}</span>
                          </button>
                        ))}
                      {products.filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 && (
                        <div className="px-3 py-2 text-sm text-gray-400">No products found</div>
                      )}
                    </div>
                  )}
                  {/* Variation picker - visual grid */}
                  {(() => {
                    const selectedProd = products.find(p => p.id === selectedOrder.product_id);
                    if (selectedProd?.variations && selectedProd.variations.length > 0) {
                      return (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {selectedProd.variations.map((v) => (
                            <button
                              key={v.id}
                              onClick={() => handleSelectVariation(selectedOrder.id, v.id)}
                              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg border text-sm transition-colors ${
                                selectedOrder.variation_id === v.id
                                  ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-300'
                                  : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                              }`}
                            >
                              {v.image_url ? (
                                <img src={v.image_url} alt="" className="w-10 h-10 object-cover rounded flex-shrink-0" />
                              ) : (
                                <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center flex-shrink-0">
                                  <Package className="w-4 h-4 text-gray-400" />
                                </div>
                              )}
                              <div className="text-left">
                                <div className="font-medium text-gray-900">{v.name}</div>
                                {v.price && <div className="text-xs text-gray-500">${v.price}</div>}
                              </div>
                            </button>
                          ))}
                        </div>
                      );
                    }
                    return null;
                  })()}
                </div>
              )}

              {/* Product Name (full row) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <EditableField
                  value={selectedOrder.product_name || ''}
                  onChange={(v) => handleFieldUpdate(selectedOrder.id, 'product_name', v)}
                  placeholder="Enter product name"
                />
              </div>

              {/* Image + Customer + Supplier */}
              <div className="flex gap-5">
                {/* Image Upload */}
                <div className="flex-shrink-0">
                  <div className="relative w-28 h-28">
                    {selectedOrder.image_url ? (
                      <img
                        src={selectedOrder.image_url}
                        alt=""
                        className="w-28 h-28 object-cover rounded-xl cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => setEnlargedImage(selectedOrder.image_url!)}
                      />
                    ) : (
                      <div className="w-28 h-28 bg-gray-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                        <Camera className="w-7 h-7 text-gray-300" />
                        <span className="text-[10px] text-gray-400 mt-1">No image</span>
                      </div>
                    )}
                    {uploadingImage === selectedOrder.id && (
                      <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-1 mt-2">
                    <label className="cursor-pointer inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-white" style={{ backgroundColor: BRAND_ORANGE }}>
                      <Upload className="w-3 h-3" />
                      {selectedOrder.image_url ? 'Change' : 'Upload'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(selectedOrder.id, file, selectedOrder.image_url);
                        }}
                      />
                    </label>
                    {selectedOrder.image_url && (
                      <button
                        type="button"
                        onClick={() => handleFieldUpdate(selectedOrder.id, 'image_url', '')}
                        className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Customer + Supplier */}
                <div className="flex-1 space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
                    <EditableField
                      value={selectedOrder.customer_name || ''}
                      onChange={(v) => handleFieldUpdate(selectedOrder.id, 'customer_name', v)}
                      placeholder="Enter customer name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Order From (Supplier)</label>
                    <EditableField
                      value={selectedOrder.order_from || ''}
                      onChange={(v) => handleFieldUpdate(selectedOrder.id, 'order_from', v)}
                      placeholder="Enter supplier"
                    />
                  </div>
                </div>
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Size</label>
                  <EditableField
                    value={selectedOrder.size || ''}
                    onChange={(v) => handleFieldUpdate(selectedOrder.id, 'size', v)}
                    placeholder="e.g., Large"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <EditableField
                    value={selectedOrder.color || ''}
                    onChange={(v) => handleFieldUpdate(selectedOrder.id, 'color', v)}
                    placeholder="e.g., Blue"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Material</label>
                  <EditableField
                    value={selectedOrder.material || ''}
                    onChange={(v) => handleFieldUpdate(selectedOrder.id, 'material', v)}
                    placeholder="e.g., Ceramic"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Link</label>
                  <div className="flex gap-2">
                    <EditableField
                      value={selectedOrder.product_link || ''}
                      onChange={(v) => handleFieldUpdate(selectedOrder.id, 'product_link', v)}
                      placeholder="https://..."
                      className="text-blue-600"
                    />
                    {selectedOrder.product_link && (
                      <a
                        href={selectedOrder.product_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: '#fef3e8', color: BRAND_ORANGE }}
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* Quantity + Tracking */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <EditableField
                    type="number"
                    value={String(selectedOrder.quantity ?? 1)}
                    onChange={(v) => handleFieldUpdate(selectedOrder.id, 'quantity', parseInt(String(v)) || 1)}
                    placeholder="1"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tracking Number</label>
                  <EditableField
                    value={selectedOrder.tracking_number || ''}
                    onChange={(v) => handleFieldUpdate(selectedOrder.id, 'tracking_number', v)}
                    placeholder="Enter tracking number"
                  />
                </div>
              </div>

              {/* Address - Full Width with Resizable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Shipping Address</label>
                <EditableField
                  type="textarea"
                  value={selectedOrder.address || ''}
                  onChange={(v) => handleFieldUpdate(selectedOrder.id, 'address', v)}
                  placeholder="Enter full shipping address"
                  rows={8}
                />
              </div>

              {/* Notes - Resizable */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <EditableField
                  type="textarea"
                  value={selectedOrder.notes || ''}
                  onChange={(v) => handleFieldUpdate(selectedOrder.id, 'notes', v)}
                  placeholder="Any special notes..."
                  rows={4}
                />
              </div>

              {/* Out of Stock Alert - Prominent for Supplier */}
              <div className={`rounded-xl p-4 border-2 ${selectedOrder.is_out_of_stock ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertCircle className={`w-6 h-6 ${selectedOrder.is_out_of_stock ? 'text-red-500' : 'text-gray-400'}`} />
                    <div>
                      <h3 className={`font-semibold ${selectedOrder.is_out_of_stock ? 'text-red-700' : 'text-gray-700'}`}>
                        Out of Stock
                      </h3>
                      <p className="text-sm text-gray-600">
                        {selectedOrder.is_out_of_stock
                          ? 'This item is marked as out of stock'
                          : 'Mark if this product is unavailable'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleFieldUpdate(selectedOrder.id, 'is_out_of_stock', !selectedOrder.is_out_of_stock)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      selectedOrder.is_out_of_stock
                        ? 'bg-red-500 text-white hover:bg-red-600'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    {selectedOrder.is_out_of_stock ? 'Out of Stock' : 'Mark Out of Stock'}
                  </button>
                </div>
              </div>

              {/* Status Checkboxes */}
              <div className="rounded-xl p-4" style={{ backgroundColor: '#fef3e8' }}>
                <h3 className="font-semibold mb-3" style={{ color: BRAND_ORANGE }}>Order Status</h3>
                <div className="grid grid-cols-4 gap-4">
                  {[
                    { key: 'is_paid', label: 'Paid' },
                    { key: 'is_shipped', label: 'Shipped' },
                    { key: 'is_delivered', label: 'Delivered' },
                    { key: 'is_completed_on_etsy', label: 'Completed on Etsy' },
                    ...(isAdmin ? [
                      { key: 'first_message_sent', label: 'First Message Sent' },
                      { key: 'tracking_added', label: 'Tracking Added' },
                      { key: 'shipped_message_sent', label: 'Shipped Message Sent' },
                      { key: 'review_message_sent', label: 'Review Message Sent' },
                    ] : [])
                  ].map(({ key, label }) => (
                    <label key={key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={(selectedOrder as any)[key] || false}
                        onChange={(e) => handleFieldUpdate(selectedOrder.id, key as keyof Order, e.target.checked)}
                        className={checkboxStyle}
                      />
                      <span className="text-sm text-gray-900">{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Financial Section (Admin Only) */}
              {isAdmin && (() => {
                const linkedProduct = products.find(p => p.id === selectedOrder.product_id);
                const etsyPrice = linkedProduct?.etsy_full_price || null;
                const salePercent = linkedProduct?.sale_percent ?? 30;
                const supplierPrice = linkedProduct?.supplier_price || null;
                const supplierName = linkedProduct?.supplier_name || null;
                const afterSale = etsyPrice ? etsyPrice * (1 - salePercent / 100) : null;
                const etsyFee = afterSale ? afterSale * 0.12 : null;
                const profit = (afterSale !== null && etsyFee !== null && supplierPrice) ? afterSale - etsyFee - supplierPrice : null;
                const profitPercent = (profit !== null && afterSale) ? ((profit / afterSale) * 100).toFixed(0) : null;

                return (
                  <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Pricing</h3>

                    {/* Row 1: Etsy Price, Sale %, After Sale */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Etsy Price</label>
                        <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                          {etsyPrice ? `$${etsyPrice.toFixed(0)}` : '-'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Sale %</label>
                        <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                          {salePercent}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">After Sale</label>
                        <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                          {afterSale !== null ? `$${afterSale.toFixed(2)}` : '-'}
                        </div>
                      </div>
                    </div>

                    {/* Row 2: Etsy Fee, After Fee, Supplier $ */}
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Etsy Fee (12%)</label>
                        <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-red-500">
                          {etsyFee !== null ? `-$${etsyFee.toFixed(2)}` : '-'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">After Fee</label>
                        <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                          {(afterSale !== null && etsyFee !== null) ? `$${(afterSale - etsyFee).toFixed(2)}` : '-'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Supplier $</label>
                        <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                          {supplierPrice ? `$${supplierPrice.toFixed(2)}` : '-'}
                          {supplierName && (
                            <span className="text-xs text-gray-400 ml-1">({supplierName})</span>
                          )}
                        </div>
                      </div>
                    </div>
                    {/* Row 3: Profit $, Profit % */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Profit $</label>
                        <div className={`px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm ${
                          profit === null ? 'text-gray-400' : profit >= 0 ? 'text-green-700' : 'text-red-500'
                        }`}>
                          {profit !== null ? `$${profit.toFixed(2)}` : '-'}
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1">Profit %</label>
                        <div className={`px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm ${
                          profitPercent === null ? 'text-gray-400' : profit! >= 0 ? 'text-green-700' : 'text-red-500'
                        }`}>
                          {profitPercent !== null ? `${profitPercent}%` : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Amount to Pay - Visible to Supplier */}
              {!isAdmin && (
                <div className="bg-blue-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-blue-900">Amount to Pay</h3>
                      <p className="text-sm text-blue-600">Your price for this product</p>
                    </div>
                    <span className="text-2xl font-bold text-blue-700">
                      {formatCurrency(selectedOrder.total_amount_to_pay)}
                    </span>
                  </div>
                </div>
              )}

              {/* Issues Section (Admin Only) */}
              {isAdmin && (
                <div className="bg-red-50 rounded-xl p-4">
                  <h3 className="font-semibold text-red-800 mb-3">Issues & Solutions</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Issue</label>
                      <EditableField
                        type="textarea"
                        value={selectedOrder.issue || ''}
                        onChange={(v) => handleFieldUpdate(selectedOrder.id, 'issue', v)}
                        placeholder="Describe any issue..."
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Solution</label>
                      <EditableField
                        type="textarea"
                        value={selectedOrder.the_solution || ''}
                        onChange={(v) => handleFieldUpdate(selectedOrder.id, 'the_solution', v)}
                        placeholder="Describe the solution..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Internal Notes (Admin Only) */}
              {isAdmin && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
                  <EditableField
                    type="textarea"
                    value={selectedOrder.internal_notes || ''}
                    onChange={(v) => handleFieldUpdate(selectedOrder.id, 'internal_notes', v)}
                    placeholder="Internal notes (not visible to supplier)..."
                    rows={3}
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className={`sticky bottom-0 px-6 py-4 border-t bg-gray-50 flex ${isAdmin ? 'justify-between' : 'justify-end'} items-center gap-2`}>
              {isAdmin && (
                <button
                  onMouseDown={(e) => {
                    e.preventDefault();
                    setSelectedOrder(null);
                    openDeleteConfirm(selectedOrder);
                  }}
                  className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Order
                </button>
              )}
              <div className="flex items-center gap-2">
                {isAdmin && (
                  <>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleCopyImage(selectedOrder);
                      }}
                      className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      title="Copy product image to clipboard"
                    >
                      <Image className="w-4 h-4" />
                      Copy Image
                    </button>
                    <button
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleCopyText(selectedOrder);
                      }}
                      className="px-3 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                      title="Copy order details to clipboard"
                    >
                      <ClipboardCopy className="w-4 h-4" />
                      Copy Text
                    </button>
                  </>
                )}
                <button
                  onMouseDown={(e) => { e.preventDefault(); setSelectedOrder(null); }}
                  className="px-6 py-2 text-white rounded-lg font-medium transition-colors"
                  style={{ backgroundColor: BRAND_ORANGE }}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Image Lightbox */}
      {enlargedImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 cursor-pointer"
          onClick={() => setEnlargedImage(null)}
        >
          <img
            src={enlargedImage}
            alt=""
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={() => setEnlargedImage(null)}
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white bg-black/50 hover:bg-black/70 rounded-full transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
      {/* Copy Toast */}
      {copyToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-4 py-2 bg-gray-900 text-white rounded-lg shadow-lg text-sm font-medium animate-fade-in">
          {copyToast}
        </div>
      )}
    </div>
  );
}
