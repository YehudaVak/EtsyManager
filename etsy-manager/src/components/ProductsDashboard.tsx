'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, Product, ProductPricing, ProductVariation, ProductSupplier, ProductWithPricing } from '@/lib/supabase';
import { uploadOrderImage } from '@/lib/storage';
import { useAuth } from '@/lib/auth';
import StoreSelector from './StoreSelector';
import EditableField from './EditableField';
import {
  Plus,
  Trash2,
  Camera,
  X,
  Package,
  DollarSign,
  Clock,
  ExternalLink,
  AlertCircle,
  ClipboardList,
  Upload,
  ImageIcon,
  CheckSquare,
  Pencil,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Copy,
  GripVertical,
} from 'lucide-react';
import Link from 'next/link';

const BRAND_ORANGE = '#d96f36';

// Product status options
const PRODUCT_STATUSES = [
  { value: 'active', label: 'Active', bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500' },
  { value: 'need_work', label: 'Need to Work On', bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500' },
  { value: 'to_quote', label: 'To Quote', bg: 'bg-purple-100', text: 'text-purple-700', dot: 'bg-purple-500' },
  { value: 'quotation_received', label: 'Quotation Received', bg: 'bg-sky-100', text: 'text-sky-700', dot: 'bg-sky-500' },
];

// Common countries for pricing
const COUNTRIES = ['US', 'UK/GB', 'DE', 'CA', 'AU', 'Other'];
const COUNTRY_LABELS: Record<string, string> = {
  'US': 'United States (US)',
  'UK/GB': 'United Kingdom (UK)',
  'DE': 'Germany (DE)',
  'CA': 'Canada (CA)',
  'AU': 'Australia (AU)',
  'Other': 'Other',
};

interface ProductsDashboardProps {
  isAdmin?: boolean;
}

export default function ProductsDashboard({ isAdmin = false }: ProductsDashboardProps) {
  const { selectedStore } = useAuth();
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ productId: string; linkedOrderCount: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Multi-select state
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [bulkDeleteError, setBulkDeleteError] = useState('');

  // Status filter tabs
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'need_work' | 'to_quote' | 'quotation_received' | 'out_of_stock'>('all');

  // Detail modal
  const [selectedProduct, setSelectedProduct] = useState<ProductWithPricing | null>(null);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);

  // Sort
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'desc' });

  // Column widths for resizable columns
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>({
    rowNum: 50,
    image: 110,
    name: 200,
    supplier: 120,
    subcategory: 100,
    status: 120,
    etsyPrice: 90,
    salePercent: 80,
    priceUS: 80,
    profit: 80,
    outOfStock: 70,
    actions: 80,
  });

  // Row heights
  const [rowHeights, setRowHeights] = useState<{ [key: string]: number }>({});
  const defaultRowHeight = 55;

  // Refs for column resizing
  const resizingColumn = useRef<string | null>(null);
  const colStartX = useRef<number>(0);
  const colStartWidth = useRef<number>(0);

  // Refs for row resizing
  const resizingRow = useRef<string | null>(null);
  const rowStartY = useRef<number>(0);
  const rowStartHeight = useRef<number>(0);

  // New product form state
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    variants: '[]',
    supplier_name: '',
    supplier_link: '',
    subcategory: '',
    size: '',
    color: '',
    material: '',
    product_status: 'active',
    etsy_full_price: undefined,
    sale_percent: 30,
    is_active: true,
    is_out_of_stock: false,
  });
  const [newProductImage, setNewProductImage] = useState<File | null>(null);
  const [newProductImagePreview, setNewProductImagePreview] = useState<string | null>(null);

  const [newPricing, setNewPricing] = useState<Partial<ProductPricing>[]>([
    { country: 'US', price: 0, shipping_time: '' },
  ]);

  // ── Data fetching ──────────────────────────────────────────────

  useEffect(() => {
    if (selectedStore) {
      fetchProducts();
    }
  }, [selectedStore]);

  // Keep selectedProduct in sync when products state updates (e.g., after supplier CRUD)
  useEffect(() => {
    if (selectedProduct) {
      const updated = products.find(p => p.id === selectedProduct.id);
      if (updated && JSON.stringify(updated) !== JSON.stringify(selectedProduct)) {
        setSelectedProduct(updated);
      }
    }
  }, [products]);

  const fetchProducts = async (silent = false) => {
    if (!selectedStore) return;

    if (!silent) setLoading(true);
    try {
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', selectedStore.id)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      const { data: pricingData, error: pricingError } = await supabase
        .from('product_pricing')
        .select('*');

      if (pricingError) throw pricingError;

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

      let suppliersData: any[] = [];
      try {
        const { data, error: suppliersError } = await supabase
          .from('product_suppliers')
          .select('*')
          .order('sort_order', { ascending: true });
        if (!suppliersError) suppliersData = data || [];
      } catch {
        // product_suppliers table may not exist yet
      }

      // Build all products with pricing, variations, and suppliers
      const allProducts: ProductWithPricing[] = (productsData || []).map((product) => ({
        ...product,
        pricing: (pricingData || []).filter((p) => p.product_id === product.id),
        variations: variationsData.filter((v) => v.product_id === product.id),
        suppliers: suppliersData.filter((s) => s.product_id === product.id),
      }));

      setProducts(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  // ── CRUD handlers ──────────────────────────────────────────────

  const handleAddProduct = async () => {
    if (!newProduct.name || !selectedStore) return;

    try {
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert([{
          name: newProduct.name,
          store_id: selectedStore.id,
          description: newProduct.description,
          variants: newProduct.variants,
          subcategory: newProduct.subcategory,
          supplier_name: newProduct.supplier_name,
          supplier_link: newProduct.supplier_link,
          size: newProduct.size,
          color: newProduct.color,
          material: newProduct.material,
          product_status: newProduct.product_status || 'active',
          etsy_full_price: newProduct.etsy_full_price || null,
          sale_percent: newProduct.sale_percent ?? 30,
          is_active: newProduct.is_active,
          is_out_of_stock: newProduct.is_out_of_stock,
          product_link: newProduct.product_link,
        }])
        .select()
        .single();

      if (productError) {
        const msg = productError.message || productError.details || JSON.stringify(productError);
        throw new Error(msg);
      }

      if (newProductImage) {
        const result = await uploadOrderImage(newProductImage, `product_${productData.id}`);
        if (result.success && result.url) {
          await supabase.from('products').update({ image_url: result.url }).eq('id', productData.id);
        }
      }

      // Auto-add Sain as default supplier for new products
      await supabase.from('product_suppliers').insert([{
        product_id: productData.id,
        name: 'Sain',
        price: 0,
        is_selected: true,
      }]);
      // Sync default supplier to product
      await supabase.from('products').update({ supplier_name: 'Sain' }).eq('id', productData.id);

      const validPricing = newPricing.filter((p) => p.country && p.price !== undefined);
      if (validPricing.length > 0) {
        const { error: pricingError } = await supabase
          .from('product_pricing')
          .insert(
            validPricing.map((p) => ({
              product_id: productData.id,
              country: p.country,
              price: p.price,
              shipping_time: p.shipping_time,
            }))
          );
        if (pricingError) throw pricingError;
      }

      setNewProduct({
        name: '', description: '', variants: '', subcategory: '',
        supplier_name: '', supplier_link: '', size: '', color: '', material: '',
        product_status: 'active', etsy_full_price: undefined, sale_percent: 30,
        is_active: true, is_out_of_stock: false,
      });
      setNewProductImage(null);
      setNewProductImagePreview(null);
      setNewPricing([{ country: 'US', price: 0, shipping_time: '' }]);
      setShowAddModal(false);
      fetchProducts(true);
    } catch (error: any) {
      const msg = error?.message || error?.details || JSON.stringify(error);
      console.error('Error adding product:', msg);
      alert(`Error adding product: ${msg}`);
    }
  };

  const handleUpdateProduct = async (productId: string, updates: Partial<Product>) => {
    try {
      const { error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', productId);

      if (error) throw error;

      setProducts((prev) =>
        prev.map((p) => (p.id === productId ? { ...p, ...updates } : p))
      );

      // Also update selectedProduct if it's the one being edited
      if (selectedProduct && selectedProduct.id === productId) {
        setSelectedProduct((prev) => prev ? { ...prev, ...updates } : prev);
      }
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleUpdatePricing = async (
    productId: string,
    country: string,
    updates: Partial<ProductPricing>
  ) => {
    try {
      const product = products.find((p) => p.id === productId);
      const existingPricing = product?.pricing?.find((pr) => pr.country === country);

      if (existingPricing) {
        const { error } = await supabase
          .from('product_pricing')
          .update(updates)
          .eq('product_id', productId)
          .eq('country', country);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('product_pricing').insert([{
          product_id: productId,
          country,
          price: updates.price || 0,
          shipping_time: updates.shipping_time,
        }]);
        if (error) throw error;
      }

      fetchProducts(true);
    } catch (error) {
      console.error('Error updating pricing:', error);
    }
  };

  // ── Supplier handlers ──────────────────────────────────────────

  const handleAddSupplier = async (productId: string) => {
    try {
      const product = products.find((p) => p.id === productId);
      const hasSuppliers = product?.suppliers && product.suppliers.length > 0;

      const nextOrder = product?.suppliers?.length || 0;
      const { error } = await supabase.from('product_suppliers').insert([{
        product_id: productId,
        name: '',
        price: 0,
        is_selected: !hasSuppliers,
        sort_order: nextOrder,
      }]);
      if (error) throw error;

      fetchProducts(true);
    } catch (error) {
      console.error('Error adding supplier:', error);
    }
  };

  const handleUpdateSupplier = async (
    supplierId: string,
    productId: string,
    updates: Partial<ProductSupplier>
  ) => {
    try {
      const { error } = await supabase
        .from('product_suppliers')
        .update(updates)
        .eq('id', supplierId);
      if (error) throw error;

      // If this supplier is selected, sync changes to product
      const product = products.find((p) => p.id === productId);
      const supplier = product?.suppliers?.find((s) => s.id === supplierId);
      if (supplier?.is_selected) {
        const syncUpdates: Partial<Product> = {};
        if (updates.name !== undefined) syncUpdates.supplier_name = updates.name;
        if (updates.price !== undefined) syncUpdates.supplier_price = updates.price;
        if (Object.keys(syncUpdates).length > 0) {
          await supabase.from('products').update(syncUpdates).eq('id', productId);
        }
      }

      fetchProducts(true);
    } catch (error) {
      console.error('Error updating supplier:', error);
    }
  };

  const handleSelectSupplier = async (productId: string, supplierId: string) => {
    try {
      // Deselect all suppliers for this product
      await supabase
        .from('product_suppliers')
        .update({ is_selected: false })
        .eq('product_id', productId);

      // Select the chosen supplier
      await supabase
        .from('product_suppliers')
        .update({ is_selected: true })
        .eq('id', supplierId);

      // Sync to product table
      const product = products.find((p) => p.id === productId);
      const supplier = product?.suppliers?.find((s) => s.id === supplierId);
      if (supplier) {
        await supabase.from('products').update({
          supplier_name: supplier.name,
          supplier_price: supplier.price,
        }).eq('id', productId);
      }

      fetchProducts(true);
    } catch (error) {
      console.error('Error selecting supplier:', error);
    }
  };

  const handleDeleteSupplier = async (supplierId: string, productId: string) => {
    try {
      const product = products.find((p) => p.id === productId);
      const supplier = product?.suppliers?.find((s) => s.id === supplierId);
      const wasSelected = supplier?.is_selected;

      const { error } = await supabase
        .from('product_suppliers')
        .delete()
        .eq('id', supplierId);
      if (error) throw error;

      if (wasSelected) {
        const remaining = product?.suppliers?.filter((s) => s.id !== supplierId);
        if (remaining && remaining.length > 0) {
          await supabase.from('product_suppliers')
            .update({ is_selected: true })
            .eq('id', remaining[0].id);
          await supabase.from('products').update({
            supplier_name: remaining[0].name,
            supplier_price: remaining[0].price,
          }).eq('id', productId);
        } else {
          await supabase.from('products').update({
            supplier_name: null,
            supplier_price: null,
          }).eq('id', productId);
        }
      }

      fetchProducts(true);
    } catch (error) {
      console.error('Error deleting supplier:', error);
    }
  };

  const dragSupplierRef = useRef<{ dragIdx: number; overIdx: number } | null>(null);

  const handleSupplierDragStart = (idx: number) => {
    dragSupplierRef.current = { dragIdx: idx, overIdx: idx };
  };

  const handleSupplierDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragSupplierRef.current) {
      dragSupplierRef.current.overIdx = idx;
    }
  };

  const handleSupplierDrop = async (productId: string) => {
    if (!dragSupplierRef.current) return;
    const { dragIdx, overIdx } = dragSupplierRef.current;
    dragSupplierRef.current = null;
    if (dragIdx === overIdx) return;

    const product = products.find((p) => p.id === productId);
    if (!product?.suppliers) return;

    // Reorder locally
    const reordered = [...product.suppliers];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(overIdx, 0, moved);

    // Update sort_order for all suppliers
    try {
      await Promise.all(
        reordered.map((s, i) =>
          supabase.from('product_suppliers').update({ sort_order: i }).eq('id', s.id)
        )
      );
      fetchProducts(true);
    } catch (error) {
      console.error('Error reordering suppliers:', error);
    }
  };

  // ── Variation handlers ──────────────────────────────────────────

  const handleAddVariation = async (productId: string) => {
    try {
      const product = products.find((p) => p.id === productId);
      const nextOrder = product?.variations?.length || 0;
      const { error } = await supabase.from('product_variations').insert([{
        product_id: productId,
        name: '',
        price: product?.etsy_full_price || null,
        sort_order: nextOrder,
      }]);
      if (error) {
        console.error('Variation insert error:', error.message, error.details, error.hint);
        throw error;
      }
      fetchProducts(true);
    } catch (error: any) {
      console.error('Error adding variation:', error?.message || error);
    }
  };

  const handleUpdateVariation = async (
    variationId: string,
    updates: Partial<ProductVariation>
  ) => {
    try {
      // Only send DB-safe fields
      const dbUpdates: Record<string, any> = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.price !== undefined) dbUpdates.price = updates.price;
      if (updates.image_url !== undefined) dbUpdates.image_url = updates.image_url;
      if (updates.sort_order !== undefined) dbUpdates.sort_order = updates.sort_order;

      const { error } = await supabase
        .from('product_variations')
        .update(dbUpdates)
        .eq('id', variationId);
      if (error) {
        console.error('Variation update error:', error.message, error.details, error.hint);
        throw error;
      }
      fetchProducts(true);
    } catch (error: any) {
      console.error('Error updating variation:', error?.message || error);
    }
  };

  const handleDeleteVariation = async (variationId: string) => {
    try {
      const { error } = await supabase
        .from('product_variations')
        .delete()
        .eq('id', variationId);
      if (error) throw error;
      fetchProducts(true);
    } catch (error) {
      console.error('Error deleting variation:', error);
    }
  };

  const handleVariationImageUpload = async (variationId: string, file: File) => {
    try {
      const result = await uploadOrderImage(file, `variation_${variationId}`);
      if (result.success && result.url) {
        await handleUpdateVariation(variationId, { image_url: result.url });
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error uploading variation image:', error);
    }
  };

  const dragVariationRef = useRef<{ dragIdx: number; overIdx: number } | null>(null);

  const handleVariationDragStart = (idx: number) => {
    dragVariationRef.current = { dragIdx: idx, overIdx: idx };
  };

  const handleVariationDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragVariationRef.current) {
      dragVariationRef.current.overIdx = idx;
    }
  };

  const handleVariationDrop = async (productId: string) => {
    if (!dragVariationRef.current) return;
    const { dragIdx, overIdx } = dragVariationRef.current;
    dragVariationRef.current = null;
    if (dragIdx === overIdx) return;

    const product = products.find((p) => p.id === productId);
    if (!product?.variations) return;

    const reordered = [...product.variations];
    const [moved] = reordered.splice(dragIdx, 1);
    reordered.splice(overIdx, 0, moved);

    try {
      await Promise.all(
        reordered.map((v, i) =>
          supabase.from('product_variations').update({ sort_order: i }).eq('id', v.id)
        )
      );
      fetchProducts(true);
    } catch (error) {
      console.error('Error reordering variations:', error);
    }
  };

  const initiateDelete = async (productId: string) => {
    setDeleteError('');
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .eq('product_id', productId);
    setDeleteConfirm({ productId, linkedOrderCount: count || 0 });
  };

  const handleDeleteProduct = async (productId: string) => {
    setDeleteError('');
    setDeleteLoading(true);
    try {
      const { error: unlinkError } = await supabase
        .from('orders')
        .update({ product_id: null })
        .eq('product_id', productId);
      if (unlinkError) console.error('Error unlinking orders:', unlinkError);

      const { error: pricingError } = await supabase.from('product_pricing').delete().eq('product_id', productId);
      if (pricingError) console.error('Error deleting pricing:', pricingError);

      const { error } = await supabase.from('products').delete().eq('id', productId);

      if (error) {
        const msg = error.message || error.details || JSON.stringify(error);
        throw new Error(msg);
      }

      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setDeleteConfirm(null);
      if (selectedProduct?.id === productId) setSelectedProduct(null);
    } catch (error: any) {
      console.error('Error deleting product:', error);
      setDeleteError(`Failed to delete product: ${error?.message || 'Unknown error'}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Duplicate product ──────────────────────────────────────────

  const handleDuplicateProduct = async (product: ProductWithPricing) => {
    if (!selectedStore) return;
    try {
      const { data: newProd, error: prodErr } = await supabase
        .from('products')
        .insert([{
          name: `${product.name} (Copy)`,
          store_id: selectedStore.id,
          description: product.description,
          variants: product.variants,
          subcategory: product.subcategory,
          supplier_name: product.supplier_name,
          supplier_link: product.supplier_link,
          size: product.size,
          color: product.color,
          material: product.material,
          product_status: product.product_status || 'active',
          etsy_full_price: product.etsy_full_price || null,
          sale_percent: product.sale_percent ?? 30,
          is_active: product.is_active,
          is_out_of_stock: product.is_out_of_stock,
          product_link: product.product_link,
          image_url: product.image_url,
        }])
        .select()
        .single();

      if (prodErr) throw prodErr;

      // Duplicate pricing
      if (product.pricing && product.pricing.length > 0) {
        await supabase.from('product_pricing').insert(
          product.pricing.map(p => ({
            product_id: newProd.id,
            country: p.country,
            price: p.price,
            shipping_time: p.shipping_time,
          }))
        );
      }

      fetchProducts(true);
    } catch (error: any) {
      console.error('Error duplicating product:', error?.message || error);
      alert(`Error duplicating product: ${error?.message || 'Unknown error'}`);
    }
  };

  // ── Multi-select ───────────────────────────────────────────────

  const toggleSelectProduct = (productId: string) => {
    setSelectedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedProducts.size === filteredProducts.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(filteredProducts.map(p => p.id)));
    }
  };

  const clearSelection = () => setSelectedProducts(new Set());

  const handleBulkDelete = async () => {
    setBulkDeleteError('');
    setDeleteLoading(true);
    try {
      const ids = Array.from(selectedProducts);
      for (const id of ids) {
        await supabase.from('orders').update({ product_id: null }).eq('product_id', id);
      }
      for (const id of ids) {
        await supabase.from('product_pricing').delete().eq('product_id', id);
      }
      const failedIds: string[] = [];
      for (const id of ids) {
        const { error } = await supabase.from('products').delete().eq('id', id);
        if (error) {
          console.error('Error deleting product', id, error.message || error.details || JSON.stringify(error));
          failedIds.push(id);
        }
      }
      const deletedIds = ids.filter(id => !failedIds.includes(id));
      if (deletedIds.length > 0) {
        setProducts(prev => prev.filter(p => !deletedIds.includes(p.id)));
        setSelectedProducts(prev => {
          const next = new Set(prev);
          deletedIds.forEach(id => next.delete(id));
          return next;
        });
      }
      if (failedIds.length > 0) {
        setBulkDeleteError(`Failed to delete ${failedIds.length} product(s).`);
      } else {
        setSelectedProducts(new Set());
        setBulkDeleteConfirm(false);
      }
    } catch (error: any) {
      console.error('Error bulk deleting products:', error?.message || error);
      setBulkDeleteError(`Failed to delete products: ${error?.message || 'Unknown error'}`);
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Image upload ───────────────────────────────────────────────

  const handleImageUpload = async (productId: string, file: File) => {
    setUploadingImage(productId);
    try {
      const result = await uploadOrderImage(file, `product_${productId}`);
      if (result.success && result.url) {
        await handleUpdateProduct(productId, { image_url: result.url });
      } else if (result.error) {
        alert(result.error);
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(null);
    }
  };

  // ── Pricing helpers ────────────────────────────────────────────

  const addPricingRow = () => {
    const usedCountries = newPricing.map((p) => p.country);
    const availableCountry = COUNTRIES.find((c) => !usedCountries.includes(c)) || 'Other';
    setNewPricing([...newPricing, { country: availableCountry, price: 0, shipping_time: '' }]);
  };

  const removePricingRow = (index: number) => {
    if (newPricing.length > 1) {
      setNewPricing(newPricing.filter((_, i) => i !== index));
    }
  };

  // ── Column resize handlers ────────────────────────────────────

  const handleResizeStart = useCallback((e: React.MouseEvent, columnKey: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizingColumn.current = columnKey;
    colStartX.current = e.clientX;
    colStartWidth.current = columnWidths[columnKey] || 100;
    document.addEventListener('mousemove', handleResizeMove);
    document.addEventListener('mouseup', handleResizeEnd);
  }, [columnWidths]);

  const handleResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingColumn.current) return;
    const diff = e.clientX - colStartX.current;
    const newWidth = Math.max(50, colStartWidth.current + diff);
    setColumnWidths(prev => ({ ...prev, [resizingColumn.current!]: newWidth }));
  }, []);

  const handleResizeEnd = useCallback(() => {
    resizingColumn.current = null;
    document.removeEventListener('mousemove', handleResizeMove);
    document.removeEventListener('mouseup', handleResizeEnd);
  }, [handleResizeMove]);

  // ── Row resize handlers ───────────────────────────────────────

  const handleRowResizeStart = useCallback((e: React.MouseEvent, rowId: string) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRow.current = rowId;
    rowStartY.current = e.clientY;
    rowStartHeight.current = rowHeights[rowId] || defaultRowHeight;
    document.addEventListener('mousemove', handleRowResizeMove);
    document.addEventListener('mouseup', handleRowResizeEnd);
  }, [rowHeights]);

  const handleRowResizeMove = useCallback((e: MouseEvent) => {
    if (!resizingRow.current) return;
    const diff = e.clientY - rowStartY.current;
    const newHeight = Math.max(40, rowStartHeight.current + diff);
    setRowHeights(prev => ({ ...prev, [resizingRow.current!]: newHeight }));
  }, []);

  const handleRowResizeEnd = useCallback(() => {
    resizingRow.current = null;
    document.removeEventListener('mousemove', handleRowResizeMove);
    document.removeEventListener('mouseup', handleRowResizeEnd);
  }, [handleRowResizeMove]);

  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleResizeEnd);
      document.removeEventListener('mousemove', handleRowResizeMove);
      document.removeEventListener('mouseup', handleRowResizeEnd);
    };
  }, [handleResizeMove, handleResizeEnd, handleRowResizeMove, handleRowResizeEnd]);

  // ── Sort handler ──────────────────────────────────────────────

  const handleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  // ── Status counts ─────────────────────────────────────────────

  const statusCounts = {
    all: products.length,
    active: products.filter(p => p.product_status === 'active').length,
    need_work: products.filter(p => p.product_status === 'need_work').length,
    to_quote: products.filter(p => p.product_status === 'to_quote').length,
    quotation_received: products.filter(p => p.product_status === 'quotation_received').length,
    out_of_stock: products.filter(p => p.is_out_of_stock).length,
  };

  // ── Filtered + sorted products ────────────────────────────────

  const filteredProducts = products
    .filter((product) => {
      // Status filter
      if (statusFilter === 'active' && product.product_status !== 'active') return false;
      if (statusFilter === 'need_work' && product.product_status !== 'need_work') return false;
      if (statusFilter === 'to_quote' && product.product_status !== 'to_quote') return false;
      if (statusFilter === 'quotation_received' && product.product_status !== 'quotation_received') return false;
      if (statusFilter === 'out_of_stock' && !product.is_out_of_stock) return false;

      // Search filter
      if (!searchTerm) return true;
      const search = searchTerm.toLowerCase();
      return (
        product.name.toLowerCase().includes(search) ||
        product.supplier_name?.toLowerCase().includes(search) ||
        product.subcategory?.toLowerCase().includes(search)
      );
    })
    .sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aVal = (a as any)[sortConfig.key];
      const bVal = (b as any)[sortConfig.key];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return `$${value.toFixed(2)}`;
  };

  const getSupplierPrice = (product: ProductWithPricing) => {
    return product.supplier_price ? formatCurrency(product.supplier_price) : '-';
  };

  const getAfterSalePrice = (product: ProductWithPricing) => {
    if (!product.etsy_full_price) return null;
    return product.etsy_full_price * (1 - (product.sale_percent ?? 30) / 100);
  };

  const getEtsyCommission = (product: ProductWithPricing) => {
    const afterSale = getAfterSalePrice(product);
    if (afterSale === null) return null;
    return afterSale * 0.12;
  };

  const getProfit = (product: ProductWithPricing) => {
    if (!product.etsy_full_price || !product.supplier_price) return '-';
    const afterSale = getAfterSalePrice(product)!;
    const commission = getEtsyCommission(product)!;
    const profit = afterSale - commission - product.supplier_price;
    return profit;
  };

  const formatProfit = (product: ProductWithPricing) => {
    const profit = getProfit(product);
    if (profit === '-') return '-';
    return `$${(profit as number).toFixed(2)}`;
  };

  const getStatusBadge = (product: ProductWithPricing) => {
    const status = PRODUCT_STATUSES.find(s => s.value === product.product_status) || PRODUCT_STATUSES[0];
    return (
      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${status.bg} ${status.text}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
        {status.label}
      </span>
    );
  };

  // ── Render sort icon ──────────────────────────────────────────

  const renderSortIcon = (key: string) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />;
    }
    return <ArrowUpDown className="w-3 h-3 opacity-50" />;
  };

  // ── Loading ───────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: BRAND_ORANGE }}></div>
      </div>
    );
  }

  // ══════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: BRAND_ORANGE }}>
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-gray-900">Products Quotation</h1>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                    isAdmin ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {isAdmin ? 'Admin' : 'Supplier'}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{products.length} products</p>
              </div>
              <StoreSelector />
              <Link
                href={isAdmin ? '/admin/orders' : '/supplier/orders'}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                Orders
              </Link>
            </div>
          </div>

          {/* Search */}
          <div className="mt-3 flex items-center gap-2">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 px-3 py-1.5 border rounded-lg text-gray-900 text-sm focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-1.5 rounded-lg text-white font-medium text-sm flex-shrink-0"
              style={{ backgroundColor: BRAND_ORANGE }}
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          </div>
        </div>
      </header>

      {/* ── Status Filter Tabs ─────────────────────────────────── */}
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
            All Products
            <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === 'all' ? 'bg-gray-600' : 'bg-gray-200'}`}>
              {statusCounts.all}
            </span>
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              statusFilter === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700 hover:bg-green-50 border border-gray-200'
            }`}
          >
            Active
            {statusCounts.active > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === 'active' ? 'bg-green-600' : 'bg-green-100 text-green-700'}`}>
                {statusCounts.active}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('need_work')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              statusFilter === 'need_work'
                ? 'bg-yellow-500 text-white'
                : 'bg-white text-gray-700 hover:bg-yellow-50 border border-gray-200'
            }`}
          >
            Need to Work On
            {statusCounts.need_work > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === 'need_work' ? 'bg-yellow-600' : 'bg-yellow-100 text-yellow-700'}`}>
                {statusCounts.need_work}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('to_quote')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              statusFilter === 'to_quote'
                ? 'bg-purple-500 text-white'
                : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
            }`}
          >
            To Quote
            {statusCounts.to_quote > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === 'to_quote' ? 'bg-purple-600' : 'bg-purple-100 text-purple-700'}`}>
                {statusCounts.to_quote}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('quotation_received')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors flex items-center gap-2 ${
              statusFilter === 'quotation_received'
                ? 'bg-sky-500 text-white'
                : 'bg-white text-gray-700 hover:bg-sky-50 border border-gray-200'
            }`}
          >
            Quotation Received
            {statusCounts.quotation_received > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-xs ${statusFilter === 'quotation_received' ? 'bg-sky-600' : 'bg-sky-100 text-sky-700'}`}>
                {statusCounts.quotation_received}
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
        </div>
      </div>

      {/* ── Bulk Actions Bar ───────────────────────────────────── */}
      {selectedProducts.size > 0 && (
        <div className="mx-4 mt-3 flex items-center gap-3 px-4 py-3 bg-orange-50 border border-orange-200 rounded-xl">
          <CheckSquare className="w-5 h-5 text-orange-600" />
          <span className="text-sm font-medium text-orange-800">
            {selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''} selected
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

      {/* ══════════════════════════════════════════════════════════ */}
      {/* DESKTOP TABLE VIEW                                        */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="hidden lg:block p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
          <div className="overflow-x-auto">
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              {/* Table Header */}
              <thead>
                <tr style={{ backgroundColor: BRAND_ORANGE }}>
                  {/* Select All */}
                  <th className="px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-white/50 text-white focus:ring-white cursor-pointer accent-white"
                    />
                  </th>
                  {/* Row # */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.rowNum }}>
                    #
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30" onMouseDown={(e) => handleResizeStart(e, 'rowNum')} />
                  </th>
                  {/* Image */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.image }}>
                    Image
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30" onMouseDown={(e) => handleResizeStart(e, 'image')} />
                  </th>
                  {/* Product Name */}
                  <th
                    className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer hover:bg-[#c45f2a] transition-colors"
                    style={{ width: columnWidths.name }}
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Product Name
                      {renderSortIcon('name')}
                    </div>
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'name'); }} />
                  </th>
                  {/* Supplier */}
                  <th
                    className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer hover:bg-[#c45f2a] transition-colors"
                    style={{ width: columnWidths.supplier }}
                    onClick={() => handleSort('supplier_name')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Supplier
                      {renderSortIcon('supplier_name')}
                    </div>
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'supplier'); }} />
                  </th>
                  {/* Subcategory */}
                  <th
                    className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer hover:bg-[#c45f2a] transition-colors"
                    style={{ width: columnWidths.subcategory }}
                    onClick={() => handleSort('subcategory')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Subcategory
                      {renderSortIcon('subcategory')}
                    </div>
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'subcategory'); }} />
                  </th>
                  {/* Status */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.status }}>
                    Status
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30" onMouseDown={(e) => handleResizeStart(e, 'status')} />
                  </th>
                  {/* Etsy Price */}
                  <th
                    className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a] cursor-pointer hover:bg-[#c45f2a] transition-colors"
                    style={{ width: columnWidths.etsyPrice }}
                    onClick={() => handleSort('etsy_full_price')}
                  >
                    <div className="flex items-center justify-center gap-1">
                      Etsy $
                      {renderSortIcon('etsy_full_price')}
                    </div>
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30" onMouseDown={(e) => { e.stopPropagation(); handleResizeStart(e, 'etsyPrice'); }} />
                  </th>
                  {/* Sale % */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.salePercent }}>
                    Sale %
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30" onMouseDown={(e) => handleResizeStart(e, 'salePercent')} />
                  </th>
                  {/* US Price */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.priceUS }}>
                    US $
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30" onMouseDown={(e) => handleResizeStart(e, 'priceUS')} />
                  </th>
                  {/* Profit */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.profit }}>
                    Profit
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30" onMouseDown={(e) => handleResizeStart(e, 'profit')} />
                  </th>
                  {/* Out of Stock */}
                  <th className="relative px-3 py-3 text-center text-sm font-semibold text-white border-r border-[#c45f2a]" style={{ width: columnWidths.outOfStock }}>
                    OOS
                    <div className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-white/30" onMouseDown={(e) => handleResizeStart(e, 'outOfStock')} />
                  </th>
                  {/* Actions */}
                  <th className="px-3 py-3 text-center text-sm font-semibold text-white" style={{ width: columnWidths.actions }}>
                    Actions
                  </th>
                </tr>
              </thead>

              {/* Table Body */}
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="px-6 py-12 text-center">
                      <Package className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                      <p className="text-gray-500">No products found</p>
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product, index) => (
                    <tr
                      key={product.id}
                      className={`border-b border-gray-100 cursor-pointer transition-colors ${
                        selectedProducts.has(product.id) ? 'bg-orange-50' : 'hover:bg-gray-50'
                      } ${product.is_out_of_stock ? 'bg-red-50/30' : ''}`}
                      style={{ height: rowHeights[product.id] || defaultRowHeight }}
                      onClick={() => setSelectedProduct(product)}
                    >
                      {/* Checkbox */}
                      <td className="px-3 text-center border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedProducts.has(product.id)}
                          onChange={() => toggleSelectProduct(product.id)}
                          className="w-4 h-4 rounded border-gray-300 text-[#d96f36] focus:ring-[#d96f36] cursor-pointer"
                        />
                      </td>
                      {/* Row # */}
                      <td className="px-3 text-center text-xs text-gray-400 border-r border-gray-100">
                        {index + 1}
                      </td>
                      {/* Image */}
                      <td className="px-2 text-center border-r border-gray-100" onClick={(e) => e.stopPropagation()}>
                        <div className="relative group/img mx-auto" style={{ width: 96, height: 96 }}>
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.name} className="w-24 h-24 object-cover rounded" />
                          ) : (
                            <div className="w-24 h-24 bg-gray-100 rounded flex items-center justify-center">
                              <Camera className="w-7 h-7 text-gray-300" />
                            </div>
                          )}
                          <label className="absolute inset-0 cursor-pointer rounded overflow-hidden">
                            <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleImageUpload(product.id, file);
                            }} />
                            <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/40 transition-colors flex items-center justify-center rounded">
                              <Upload className="w-3 h-3 text-white opacity-0 group-hover/img:opacity-100 transition-opacity" />
                            </div>
                          </label>
                          {uploadingImage === product.id && (
                            <div className="absolute inset-0 bg-black/50 rounded flex items-center justify-center">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            </div>
                          )}
                        </div>
                      </td>
                      {/* Product Name */}
                      <td className="px-3 text-center border-r border-gray-100">
                        <div className="line-clamp-2 text-base font-medium text-gray-900">{product.name}</div>
                      </td>
                      {/* Supplier */}
                      <td className="px-3 text-base text-gray-600 text-center border-r border-gray-100 truncate">
                        {product.supplier_name || '-'}
                      </td>
                      {/* Subcategory */}
                      <td className="px-3 text-base text-gray-600 text-center border-r border-gray-100 truncate">
                        {product.subcategory || '-'}
                      </td>
                      {/* Status */}
                      <td className="px-3 text-center border-r border-gray-100">
                        {getStatusBadge(product)}
                      </td>
                      {/* Etsy Price */}
                      <td className="px-3 text-base text-gray-900 text-center border-r border-gray-100">
                        {formatCurrency(product.etsy_full_price)}
                      </td>
                      {/* Sale % */}
                      <td className="px-3 text-base text-gray-600 text-center border-r border-gray-100">
                        {product.sale_percent != null ? `${product.sale_percent}%` : '-'}
                      </td>
                      {/* US Price */}
                      <td className="px-3 text-base text-gray-900 text-center border-r border-gray-100">
                        {getSupplierPrice(product)}
                      </td>
                      {/* Profit */}
                      <td className="px-3 text-base text-center border-r border-gray-100">
                        {(() => {
                          const profit = getProfit(product);
                          if (profit === '-') return <span className="text-gray-400">-</span>;
                          return (
                            <span className={`font-medium ${(profit as number) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                              ${(profit as number).toFixed(2)}
                            </span>
                          );
                        })()}
                      </td>
                      {/* Out of Stock */}
                      <td className="px-3 text-center border-r border-gray-100">
                        {product.is_out_of_stock ? (
                          <span className="text-red-500 text-sm font-bold">OOS</span>
                        ) : (
                          <span className="text-green-500 text-sm">OK</span>
                        )}
                      </td>
                      {/* Actions */}
                      <td className="px-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setSelectedProduct(product)}
                            className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                            title="Edit"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          {product.product_link && (
                            <a
                              href={product.product_link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded transition-colors"
                              title="Etsy"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDuplicateProduct(product)}
                            className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-colors"
                            title="Duplicate"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => initiateDelete(product.id)}
                            className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-2 bg-gray-50 border-t flex items-center gap-4 text-sm">
            <span className="text-gray-600">{filteredProducts.length} products</span>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* MOBILE CARD VIEW                                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="lg:hidden p-4 space-y-3 pt-2">
        {/* Select All */}
        {filteredProducts.length > 0 && (
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={filteredProducts.length > 0 && selectedProducts.size === filteredProducts.length}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-gray-300 text-[#d96f36] focus:ring-[#d96f36] cursor-pointer"
            />
            <span className="text-sm text-gray-600">Select all ({filteredProducts.length})</span>
          </div>
        )}

        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-900">No products found</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 font-medium hover:underline"
              style={{ color: BRAND_ORANGE }}
            >
              Add your first product
            </button>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className={`bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden transition-all ${
                product.is_out_of_stock ? 'border-l-4 border-l-red-400' : ''
              } ${selectedProducts.has(product.id) ? 'ring-2 ring-orange-400 bg-orange-50/20' : ''}`}
              onClick={() => setSelectedProduct(product)}
            >
              <div className="p-3 space-y-2">
                {/* Top row: Checkbox + Image + Color/Size/Material + Actions */}
                <div className="flex items-center gap-3">
                  {/* Checkbox */}
                  <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedProducts.has(product.id)}
                      onChange={() => toggleSelectProduct(product.id)}
                      className="w-4 h-4 rounded border-gray-300 text-[#d96f36] focus:ring-[#d96f36] cursor-pointer"
                    />
                  </div>

                  {/* Image */}
                  <div className="flex-shrink-0">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded-lg" />
                    ) : (
                      <div className="w-14 h-14 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Camera className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                  </div>

                  {/* Color, Size, Material */}
                  <div className="flex-1 min-w-0 grid grid-cols-3 gap-2">
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase">Color</span>
                      <span className="block text-sm text-gray-900 truncate">{product.color || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase">Size</span>
                      <span className="block text-sm text-gray-900 truncate">{product.size || '-'}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] text-gray-400 uppercase">Material</span>
                      <span className="block text-sm text-gray-900 truncate">{product.material || '-'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(product)}
                      className="p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDuplicateProduct(product)}
                      className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => initiateDelete(product.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Product Name (full row) */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
                  {getStatusBadge(product)}
                  {product.is_out_of_stock && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-red-100 text-red-600">OOS</span>
                  )}
                </div>

                {/* Prices */}
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">Etsy: <span className="font-semibold text-gray-900">${product.etsy_full_price || '-'}</span></span>
                  <span className="text-xs text-gray-500">After Sale: <span className="font-semibold text-gray-900">{(() => { const a = getAfterSalePrice(product); return a !== null ? `$${a.toFixed(2)}` : '-'; })()}</span></span>
                  <span className="text-xs text-gray-500">Supplier: <span className="font-semibold text-gray-900">{getSupplierPrice(product)}</span></span>
                  <span className="text-xs text-gray-500">Profit: <span className={`font-semibold ${(() => { const p = getProfit(product); return p === '-' ? 'text-gray-400' : (p as number) >= 0 ? 'text-green-700' : 'text-red-500'; })()}`}>{formatProfit(product)}</span></span>
                </div>

              </div>
            </div>
          ))
        )}

        {/* Mobile Footer */}
        {filteredProducts.length > 0 && (
          <div className="text-center py-2">
            <span className="text-sm text-gray-500">{filteredProducts.length} products</span>
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* PRODUCT DETAIL MODAL                                      */}
      {/* ══════════════════════════════════════════════════════════ */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setSelectedProduct(null)}>
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="sticky top-0 z-10 px-6 py-3 border-b flex items-start justify-between gap-3" style={{ backgroundColor: BRAND_ORANGE }}>
              <h2 className="text-base font-semibold text-white line-clamp-2 min-w-0">
                {selectedProduct.name || 'Product Details'}
              </h2>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="px-4 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setSelectedProduct(null)}
                  className="p-1.5 text-white/80 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-4 sm:p-6 space-y-5">

              {/* ── SECTION: Product Info ── */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                <EditableField
                  value={selectedProduct.name || ''}
                  onChange={(v) => handleUpdateProduct(selectedProduct.id, { name: String(v) })}
                  placeholder="Product Name"
                  className="!text-sm !font-semibold !text-gray-800 !border-transparent !px-1 !py-0.5 hover:!border-gray-300 focus:!border-[#d96f36]"
                />

                {/* Image + Status/Color/Size/Material */}
                <div className="flex flex-col sm:flex-row gap-4 items-start">
                  {/* Image Upload */}
                  <div className="flex-shrink-0 self-center sm:self-start">
                    <div className="relative w-32 h-32 sm:w-40 sm:h-40">
                      {selectedProduct.image_url ? (
                        <img
                          src={selectedProduct.image_url}
                          alt=""
                          className="w-32 h-32 sm:w-40 sm:h-40 object-cover rounded-xl cursor-pointer hover:opacity-90 transition-opacity"
                          onClick={() => setEnlargedImage(selectedProduct.image_url!)}
                        />
                      ) : (
                        <div className="w-32 h-32 sm:w-40 sm:h-40 bg-gray-50 rounded-xl flex flex-col items-center justify-center border-2 border-dashed border-gray-300">
                          <Camera className="w-8 h-8 text-gray-300" />
                          <span className="text-xs text-gray-400 mt-1">No image</span>
                        </div>
                      )}
                      {uploadingImage === selectedProduct.id && (
                        <div className="absolute inset-0 bg-black/50 rounded-xl flex items-center justify-center">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-3 mt-3">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: BRAND_ORANGE }}>
                        <Upload className="w-4 h-4" />
                        {selectedProduct.image_url ? 'Change' : 'Upload'}
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(selectedProduct.id, file);
                          }}
                        />
                      </label>
                      {selectedProduct.image_url && (
                        <button
                          type="button"
                          onClick={() => handleUpdateProduct(selectedProduct.id, { image_url: '' })}
                          className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 6 fields: 2 columns x 3 rows on desktop, single column on mobile */}
                  <div className="flex-1 grid grid-cols-2 gap-x-3 gap-y-1">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                      <select
                        value={selectedProduct.product_status || 'active'}
                        onChange={(e) => handleUpdateProduct(selectedProduct.id, { product_status: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-[#d96f36]/20 focus:border-[#d96f36]"
                      >
                        {PRODUCT_STATUSES.map(s => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Color</label>
                      <EditableField
                        value={selectedProduct.color || ''}
                        onChange={(v) => handleUpdateProduct(selectedProduct.id, { color: String(v) })}
                        placeholder="e.g., Blue"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Subcategory</label>
                      <EditableField
                        value={selectedProduct.subcategory || ''}
                        onChange={(v) => handleUpdateProduct(selectedProduct.id, { subcategory: String(v) })}
                        placeholder="e.g., Home Decor"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Size</label>
                      <EditableField
                        value={selectedProduct.size || ''}
                        onChange={(v) => handleUpdateProduct(selectedProduct.id, { size: String(v) })}
                        placeholder="e.g., Large"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Material</label>
                      <EditableField
                        value={selectedProduct.material || ''}
                        onChange={(v) => handleUpdateProduct(selectedProduct.id, { material: String(v) })}
                        placeholder="e.g., Ceramic"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION: Variations ── */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Variations</h3>
                  <button
                    onClick={() => handleAddVariation(selectedProduct.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: BRAND_ORANGE }}
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>

                {(!selectedProduct.variations || selectedProduct.variations.length === 0) ? (
                  <p className="text-sm text-gray-400 italic">No variations added yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedProduct.variations.map((variation, idx) => (
                      <div
                        key={variation.id}
                        draggable
                        onDragStart={() => handleVariationDragStart(idx)}
                        onDragOver={(e) => handleVariationDragOver(e, idx)}
                        onDrop={() => handleVariationDrop(selectedProduct.id)}
                        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg border bg-gray-50 border-gray-100"
                      >
                        <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        {/* Variation image thumbnail */}
                        <label className="relative w-10 h-10 flex-shrink-0 cursor-pointer group">
                          {variation.image_url ? (
                            <img src={variation.image_url} alt="" className="w-10 h-10 object-cover rounded" />
                          ) : (
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                              <Camera className="w-4 h-4 text-gray-400" />
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleVariationImageUpload(variation.id, file);
                            }}
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center rounded">
                            <Upload className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </label>
                        {/* Name */}
                        <div className="flex-1 min-w-0">
                          <EditableField
                            value={variation.name}
                            onChange={(v) => handleUpdateVariation(variation.id, { name: String(v) })}
                            placeholder="Variation name"
                          />
                        </div>
                        {/* Price */}
                        <div className="w-20">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
                            <EditableField
                              type="number"
                              value={variation.price || 0}
                              onChange={(v) => handleUpdateVariation(variation.id, { price: parseFloat(String(v)) || 0 })}
                              placeholder="0.00"
                              className="pl-6"
                            />
                          </div>
                        </div>
                        {/* Delete */}
                        <button
                          onClick={() => handleDeleteVariation(variation.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── SECTION: Pricing ── */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Pricing</h3>

                {/* Row 1: Etsy Price, Sale %, After Sale */}
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Etsy Price</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 font-medium">$</span>
                      <EditableField
                        type="number"
                        value={selectedProduct.etsy_full_price || ''}
                        onChange={(v) => handleUpdateProduct(selectedProduct.id, { etsy_full_price: Number(v) || 0 })}
                        placeholder="0.00"
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Sale %</label>
                    <EditableField
                      type="number"
                      value={selectedProduct.sale_percent ?? 30}
                      onChange={(v) => handleUpdateProduct(selectedProduct.id, { sale_percent: Number(v) || 0 })}
                      step="1"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">After Sale</label>
                    <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                      {(() => {
                        const afterSale = getAfterSalePrice(selectedProduct);
                        return afterSale !== null ? `$${afterSale.toFixed(2)}` : '-';
                      })()}
                    </div>
                  </div>
                </div>
                {/* Row 2: Etsy Fee, After Fee, Supplier $ */}
                <div className="grid grid-cols-3 gap-3 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Etsy Fee (12%)</label>
                    <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-red-500">
                      {(() => {
                        const commission = getEtsyCommission(selectedProduct);
                        return commission !== null ? `-$${commission.toFixed(2)}` : '-';
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">After Fee</label>
                    <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                      {(() => {
                        const afterSale = getAfterSalePrice(selectedProduct);
                        const commission = getEtsyCommission(selectedProduct);
                        return (afterSale !== null && commission !== null) ? `$${(afterSale - commission).toFixed(2)}` : '-';
                      })()}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Supplier $</label>
                    <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-700">
                      {selectedProduct.supplier_price
                        ? `$${selectedProduct.supplier_price.toFixed(2)}`
                        : '-'}
                      {selectedProduct.supplier_name && (
                        <span className="text-xs text-gray-400 ml-1">({selectedProduct.supplier_name})</span>
                      )}
                    </div>
                  </div>
                </div>
                {/* Row 3: Profit $, Profit % */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Profit $</label>
                    <div className={`px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm ${
                      (() => {
                        const p = getProfit(selectedProduct);
                        return p === '-' ? 'text-gray-400' : (p as number) >= 0 ? 'text-green-700' : 'text-red-500';
                      })()
                    }`}>
                      {formatProfit(selectedProduct)}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Profit %</label>
                    <div className={`px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm ${
                      (() => {
                        const p = getProfit(selectedProduct);
                        if (p === '-') return 'text-gray-400';
                        const afterSale = getAfterSalePrice(selectedProduct);
                        if (!afterSale) return 'text-gray-400';
                        return (p as number) >= 0 ? 'text-green-700' : 'text-red-500';
                      })()
                    }`}>
                      {(() => {
                        const p = getProfit(selectedProduct);
                        if (p === '-') return '-';
                        const afterSale = getAfterSalePrice(selectedProduct);
                        if (!afterSale) return '-';
                        return `${(((p as number) / afterSale) * 100).toFixed(0)}%`;
                      })()}
                    </div>
                  </div>
                </div>

                {/* Competitor Pricing */}
                <div className="border-t border-gray-100 pt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-2 uppercase">Competitor</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Price $</label>
                      <EditableField
                        type="number"
                        value={selectedProduct.competitor_price || ''}
                        onChange={(v) => handleUpdateProduct(selectedProduct.id, { competitor_price: Number(v) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Shipment $</label>
                      <EditableField
                        type="number"
                        value={selectedProduct.competitor_shipment || ''}
                        onChange={(v) => handleUpdateProduct(selectedProduct.id, { competitor_shipment: Number(v) || 0 })}
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Total $</label>
                      <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-center font-semibold text-sm text-gray-900">
                        {(selectedProduct.competitor_price || selectedProduct.competitor_shipment)
                          ? `$${((selectedProduct.competitor_price || 0) + (selectedProduct.competitor_shipment || 0)).toFixed(2)}`
                          : '-'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION: Suppliers ── */}
              <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Suppliers</h3>
                  <button
                    onClick={() => handleAddSupplier(selectedProduct.id)}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg text-white hover:opacity-90 transition-opacity"
                    style={{ backgroundColor: BRAND_ORANGE }}
                  >
                    <Plus className="w-3 h-3" /> Add
                  </button>
                </div>

                {(!selectedProduct.suppliers || selectedProduct.suppliers.length === 0) ? (
                  <p className="text-sm text-gray-400 italic">No suppliers added yet.</p>
                ) : (
                  <div className="space-y-1.5">
                    {selectedProduct.suppliers.map((supplier, idx) => (
                      <div
                        key={supplier.id}
                        draggable
                        onDragStart={() => handleSupplierDragStart(idx)}
                        onDragOver={(e) => handleSupplierDragOver(e, idx)}
                        onDrop={() => handleSupplierDrop(selectedProduct.id)}
                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border ${
                          supplier.is_selected
                            ? 'bg-orange-50 border-orange-200'
                            : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <div className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 flex-shrink-0">
                          <GripVertical className="w-4 h-4" />
                        </div>
                        <input
                          type="radio"
                          name={`supplier-${selectedProduct.id}`}
                          checked={supplier.is_selected}
                          onChange={() => handleSelectSupplier(selectedProduct.id, supplier.id)}
                          className="w-4 h-4 cursor-pointer flex-shrink-0"
                          style={{ accentColor: BRAND_ORANGE }}
                        />
                        <div className="w-32">
                          <EditableField
                            value={supplier.name}
                            onChange={(v) =>
                              handleUpdateSupplier(supplier.id, selectedProduct.id, { name: String(v) })
                            }
                            placeholder="Supplier name"
                          />
                        </div>
                        <div className="w-20">
                          <div className="relative">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs pointer-events-none">$</span>
                            <EditableField
                              type="number"
                              value={supplier.price}
                              onChange={(v) =>
                                handleUpdateSupplier(supplier.id, selectedProduct.id, { price: parseFloat(String(v)) || 0 })
                              }
                              placeholder="0.00"
                              className="pl-6"
                            />
                          </div>
                        </div>
                        <button
                          onClick={() => handleDeleteSupplier(supplier.id, selectedProduct.id)}
                          className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* ── SECTION: Links ── */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Links</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">1688 Link</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <EditableField
                        value={selectedProduct.supplier_link || ''}
                        onChange={(v) => handleUpdateProduct(selectedProduct.id, { supplier_link: String(v) })}
                        placeholder="https://detail.1688.com/..."
                      />
                    </div>
                    {selectedProduct.supplier_link && (
                      <a href={selectedProduct.supplier_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">AliExpress Link</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <EditableField
                        value={selectedProduct.ali_link || ''}
                        onChange={(v) => handleUpdateProduct(selectedProduct.id, { ali_link: String(v) })}
                        placeholder="https://aliexpress.com/..."
                      />
                    </div>
                    {selectedProduct.ali_link && (
                      <a href={selectedProduct.ali_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Etsy Link</label>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <EditableField
                        value={selectedProduct.product_link || ''}
                        onChange={(v) => handleUpdateProduct(selectedProduct.id, { product_link: String(v) })}
                        placeholder="https://www.etsy.com/listing/..."
                      />
                    </div>
                    {selectedProduct.product_link && (
                      <a href={selectedProduct.product_link} target="_blank" rel="noopener noreferrer"
                        className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: BRAND_ORANGE }}>
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* ── SECTION: Store / Competitor Research ── */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Store / Competitor Research</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Store Name</label>
                    <EditableField
                      value={selectedProduct.store_name || ''}
                      onChange={(v) => handleUpdateProduct(selectedProduct.id, { store_name: String(v) })}
                      placeholder="Competitor store name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Store Link</label>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <EditableField
                          value={selectedProduct.store_link || ''}
                          onChange={(v) => handleUpdateProduct(selectedProduct.id, { store_link: String(v) })}
                          placeholder="https://www.etsy.com/shop/..."
                        />
                      </div>
                      {selectedProduct.store_link && (
                        <a href={selectedProduct.store_link} target="_blank" rel="noopener noreferrer"
                          className="flex items-center px-3 py-2 rounded-lg text-sm font-medium text-white bg-gray-500 hover:bg-gray-600">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Sales</label>
                    <EditableField
                      value={selectedProduct.weekly_monthly_sales || ''}
                      onChange={(v) => handleUpdateProduct(selectedProduct.id, { weekly_monthly_sales: String(v) })}
                      placeholder="e.g., 50/week"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Store Age</label>
                    <EditableField
                      value={selectedProduct.store_age || ''}
                      onChange={(v) => handleUpdateProduct(selectedProduct.id, { store_age: String(v) })}
                      placeholder="e.g., 3 years"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">Competitors</label>
                    <EditableField
                      value={selectedProduct.competitors || ''}
                      onChange={(v) => handleUpdateProduct(selectedProduct.id, { competitors: String(v) })}
                      placeholder="e.g., 12"
                    />
                  </div>
                </div>
              </div>

              {/* ── SECTION: Notes ── */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Notes</h3>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Product Description</label>
                  <EditableField
                    type="textarea"
                    value={selectedProduct.description || ''}
                    onChange={(v) => handleUpdateProduct(selectedProduct.id, { description: String(v) })}
                    placeholder="Product description..."
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Remarks</label>
                  <EditableField
                    type="textarea"
                    value={selectedProduct.remarks || ''}
                    onChange={(v) => handleUpdateProduct(selectedProduct.id, { remarks: String(v) })}
                    placeholder="Notes, comments..."
                    rows={2}
                  />
                </div>
              </div>

              {/* ── SECTION: Country Pricing ── */}
              <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-800 uppercase tracking-wide">Pricing by Country</h3>
                <div className="space-y-2">
                  {COUNTRIES.map((country) => {
                    const pricing = selectedProduct.pricing?.find((p) => p.country === country);
                    return (
                      <div key={country} className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg border border-gray-100">
                        <div className="w-36 text-sm font-medium text-gray-900">{COUNTRY_LABELS[country] || country}</div>
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <div className="w-24">
                            <EditableField
                              type="number"
                              value={pricing?.price || ''}
                              onChange={(v) =>
                                handleUpdatePricing(selectedProduct.id, country, {
                                  price: parseFloat(String(v)) || 0,
                                })
                              }
                              placeholder="Price"
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4 text-gray-400" />
                          <div className="w-28">
                            <EditableField
                              value={pricing?.shipping_time || ''}
                              onChange={(v) =>
                                handleUpdatePricing(selectedProduct.id, country, {
                                  shipping_time: String(v),
                                })
                              }
                              placeholder="6-12days"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── SECTION: Stock Status ── */}
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className={`rounded-lg p-3 border ${selectedProduct.is_out_of_stock ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertCircle className={`w-5 h-5 ${selectedProduct.is_out_of_stock ? 'text-red-500' : 'text-gray-400'}`} />
                      <span className="font-medium text-gray-900">Out of Stock</span>
                    </div>
                    <button
                      onClick={() => handleUpdateProduct(selectedProduct.id, { is_out_of_stock: !selectedProduct.is_out_of_stock })}
                      className={`relative w-12 h-6 rounded-full transition-colors ${selectedProduct.is_out_of_stock ? 'bg-red-500' : 'bg-gray-300'}`}
                    >
                      <span className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${selectedProduct.is_out_of_stock ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* ADD PRODUCT MODAL                                         */}
      {/* ══════════════════════════════════════════════════════════ */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add New Product</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Product Image */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Product Image</label>
                <div className="flex items-start gap-4">
                  {newProductImagePreview ? (
                    <img src={newProductImagePreview} alt="Preview" className="w-24 h-24 object-cover rounded-lg border" />
                  ) : (
                    <div className="w-24 h-24 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center">
                      <ImageIcon className="w-8 h-8 text-gray-300" />
                      <span className="text-[10px] text-gray-400 mt-1">No image</span>
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-white" style={{ backgroundColor: BRAND_ORANGE }}>
                      <Upload className="w-4 h-4" />
                      {newProductImagePreview ? 'Change Photo' : 'Upload Photo'}
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) { setNewProductImage(file); setNewProductImagePreview(URL.createObjectURL(file)); }
                      }} />
                    </label>
                    {newProductImagePreview && (
                      <button type="button" onClick={() => { setNewProductImage(null); setNewProductImagePreview(null); }}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 transition-colors">
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Product Name */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Product Name *</label>
                <input type="text" value={newProduct.name || ''} onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g., SG-ZXM-XW30000-Yehuda" className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
              </div>

              {/* Size, Color, Material */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Size</label>
                  <input type="text" value={newProduct.size || ''} onChange={(e) => setNewProduct({ ...newProduct, size: e.target.value })}
                    placeholder="e.g., Large" className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Color</label>
                  <input type="text" value={newProduct.color || ''} onChange={(e) => setNewProduct({ ...newProduct, color: e.target.value })}
                    placeholder="e.g., Blue" className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Material</label>
                  <input type="text" value={newProduct.material || ''} onChange={(e) => setNewProduct({ ...newProduct, material: e.target.value })}
                    placeholder="e.g., Ceramic" className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Supplier Name</label>
                <input type="text" value={newProduct.supplier_name || ''} onChange={(e) => setNewProduct({ ...newProduct, supplier_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">1688 Link</label>
                <input type="url" value={newProduct.supplier_link || ''} onChange={(e) => setNewProduct({ ...newProduct, supplier_link: e.target.value })}
                  placeholder="https://detail.1688.com/..." className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Etsy Link</label>
                <input type="url" value={newProduct.product_link || ''} onChange={(e) => setNewProduct({ ...newProduct, product_link: e.target.value })}
                  placeholder="https://www.etsy.com/listing/..." className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
              </div>

              {/* Status + Subcategory */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Status</label>
                  <select value={newProduct.product_status || 'active'} onChange={(e) => setNewProduct({ ...newProduct, product_status: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500">
                    {PRODUCT_STATUSES.map(s => (<option key={s.value} value={s.value}>{s.label}</option>))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Subcategory</label>
                  <input type="text" value={newProduct.subcategory || ''} onChange={(e) => setNewProduct({ ...newProduct, subcategory: e.target.value })}
                    placeholder="e.g., Home Decor" className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
                </div>
              </div>

              {/* Etsy Pricing */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Full Price on Etsy</label>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">$</span>
                    <input type="number" step="0.01" value={newProduct.etsy_full_price || ''}
                      onChange={(e) => setNewProduct({ ...newProduct, etsy_full_price: parseFloat(e.target.value) || undefined })}
                      placeholder="0.00" className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Sale %</label>
                  <div className="flex items-center gap-1">
                    <input type="number" step="1" value={newProduct.sale_percent ?? 30}
                      onChange={(e) => setNewProduct({ ...newProduct, sale_percent: parseFloat(e.target.value) || 0 })}
                      placeholder="30" className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
                    <span className="text-gray-500">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Price After Sale</label>
                  <div className="px-3 py-2 border rounded-lg bg-gray-50 text-center font-semibold text-green-700">
                    {newProduct.etsy_full_price
                      ? `$${(newProduct.etsy_full_price * (1 - (newProduct.sale_percent ?? 30) / 100)).toFixed(2)}`
                      : '-'}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                <textarea value={newProduct.description || ''} onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  rows={2} className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
              </div>

              {/* Pricing by Country */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-900">Pricing by Country</label>
                  <button onClick={addPricingRow} className="text-sm font-medium flex items-center gap-1" style={{ color: BRAND_ORANGE }}>
                    <Plus className="w-4 h-4" /> Add Country
                  </button>
                </div>
                <div className="space-y-2">
                  {newPricing.map((pricing, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select value={pricing.country} onChange={(e) => {
                        const updated = [...newPricing]; updated[index].country = e.target.value; setNewPricing(updated);
                      }} className="w-24 px-2 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500">
                        {COUNTRIES.map((c) => (<option key={c} value={c}>{COUNTRY_LABELS[c] || c}</option>))}
                      </select>
                      <div className="flex-1 flex items-center gap-1">
                        <span className="text-gray-500">$</span>
                        <input type="number" step="0.01" value={pricing.price || ''} onChange={(e) => {
                          const updated = [...newPricing]; updated[index].price = parseFloat(e.target.value) || 0; setNewPricing(updated);
                        }} placeholder="Price" className="w-full px-2 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
                      </div>
                      <input type="text" value={pricing.shipping_time || ''} onChange={(e) => {
                        const updated = [...newPricing]; updated[index].shipping_time = e.target.value; setNewPricing(updated);
                      }} placeholder="6-12days" className="w-28 px-2 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500" />
                      {newPricing.length > 1 && (
                        <button onClick={() => removePricingRow(index)} className="p-2 text-gray-400 hover:text-red-500">
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-4 py-3 flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleAddProduct} disabled={!newProduct.name}
                className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50" style={{ backgroundColor: BRAND_ORANGE }}>
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ──────────────────────────── */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Product?</h3>
            {deleteConfirm.linkedOrderCount > 0 ? (
              <div className="mb-4">
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2">
                  <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800">
                    This product is linked to <strong>{deleteConfirm.linkedOrderCount} order{deleteConfirm.linkedOrderCount > 1 ? 's' : ''}</strong>.
                    Deleting it will remove the product link from those orders.
                  </p>
                </div>
                <p className="text-gray-600 text-sm">Are you sure you want to continue?</p>
              </div>
            ) : (
              <p className="text-gray-600 mb-4">This will permanently delete this product and its pricing. This action cannot be undone.</p>
            )}
            {deleteError && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm mb-4">{deleteError}</div>
            )}
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setDeleteConfirm(null); setDeleteError(''); }}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="button" disabled={deleteLoading} onClick={() => handleDeleteProduct(deleteConfirm.productId)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50">
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bulk Delete Confirmation Modal ─────────────────────── */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete {selectedProducts.size} Products?</h3>
              <button onClick={() => { setBulkDeleteConfirm(false); setBulkDeleteError(''); }} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete <strong className="text-gray-900">{selectedProducts.size} product{selectedProducts.size > 1 ? 's' : ''}</strong> and their pricing? This action cannot be undone.
            </p>
            {bulkDeleteError && (
              <div className="bg-red-50 text-red-600 px-4 py-2 rounded-lg text-sm mb-4">{bulkDeleteError}</div>
            )}
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => { setBulkDeleteConfirm(false); setBulkDeleteError(''); }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium transition-colors">Cancel</button>
              <button type="button" onClick={handleBulkDelete}
                className="px-4 py-2 text-white bg-red-500 hover:bg-red-600 rounded-lg font-medium transition-colors">
                Delete {selectedProducts.size} Products
              </button>
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
    </div>
  );
}
