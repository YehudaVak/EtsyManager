'use client';

import { useState, useEffect } from 'react';
import { supabase, Product, ProductPricing, ProductWithPricing } from '@/lib/supabase';
import { uploadOrderImage } from '@/lib/storage';
import { useAuth } from '@/lib/auth';
import StoreSelector from './StoreSelector';
import {
  Plus,
  Trash2,
  Camera,
  X,
  ChevronDown,
  ChevronUp,
  Package,
  Globe,
  DollarSign,
  Clock,
  ExternalLink,
  AlertCircle,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';

const BRAND_ORANGE = '#d96f36';

// Common countries for pricing
const COUNTRIES = ['US', 'UK/GB', 'EU', 'CA', 'AU', 'Other'];

interface ProductsDashboardProps {
  isAdmin?: boolean;
}

export default function ProductsDashboard({ isAdmin = false }: ProductsDashboardProps) {
  const { selectedStore } = useAuth();
  const [products, setProducts] = useState<ProductWithPricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithPricing | null>(null);
  const [uploadingImage, setUploadingImage] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOutOfStock, setFilterOutOfStock] = useState(false);

  // New product form state
  const [newProduct, setNewProduct] = useState<Partial<Product>>({
    name: '',
    description: '',
    variants: '',
    supplier_name: '',
    is_active: true,
    is_out_of_stock: false,
  });
  const [newPricing, setNewPricing] = useState<Partial<ProductPricing>[]>([
    { country: 'US', price: 0, shipping_time: '' },
  ]);

  useEffect(() => {
    if (selectedStore) {
      fetchProducts();
    }
  }, [selectedStore]);

  const fetchProducts = async () => {
    if (!selectedStore) return;

    setLoading(true);
    try {
      // Fetch products filtered by store
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select('*')
        .eq('store_id', selectedStore.id)
        .order('created_at', { ascending: false });

      if (productsError) throw productsError;

      // Fetch all pricing
      const { data: pricingData, error: pricingError } = await supabase
        .from('product_pricing')
        .select('*');

      if (pricingError) throw pricingError;

      // Combine products with their pricing
      const productsWithPricing: ProductWithPricing[] = (productsData || []).map((product) => ({
        ...product,
        pricing: (pricingData || []).filter((p) => p.product_id === product.id),
      }));

      setProducts(productsWithPricing);
    } catch (error) {
      console.error('Error fetching products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !selectedStore) return;

    try {
      // Insert product with store_id
      const { data: productData, error: productError } = await supabase
        .from('products')
        .insert([{
          name: newProduct.name,
          store_id: selectedStore.id,
          description: newProduct.description,
          variants: newProduct.variants,
          supplier_name: newProduct.supplier_name,
          is_active: newProduct.is_active,
          is_out_of_stock: newProduct.is_out_of_stock,
          product_link: newProduct.product_link,
          image_url: newProduct.image_url,
        }])
        .select()
        .single();

      if (productError) throw productError;

      // Insert pricing entries
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

      // Reset form and refresh
      setNewProduct({
        name: '',
        description: '',
        variants: '',
        supplier_name: '',
        is_active: true,
        is_out_of_stock: false,
      });
      setNewPricing([{ country: 'US', price: 0, shipping_time: '' }]);
      setShowAddModal(false);
      fetchProducts();
    } catch (error) {
      console.error('Error adding product:', error);
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
      // Check if pricing exists
      const existingPricing = products
        .find((p) => p.id === productId)
        ?.pricing?.find((pr) => pr.country === country);

      if (existingPricing) {
        // Update existing
        const { error } = await supabase
          .from('product_pricing')
          .update(updates)
          .eq('product_id', productId)
          .eq('country', country);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase.from('product_pricing').insert([
          {
            product_id: productId,
            country,
            price: updates.price || 0,
            shipping_time: updates.shipping_time,
          },
        ]);

        if (error) throw error;
      }

      fetchProducts();
    } catch (error) {
      console.error('Error updating pricing:', error);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase.from('products').delete().eq('id', productId);

      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== productId));
      setDeleteConfirm(null);
    } catch (error) {
      console.error('Error deleting product:', error);
    }
  };

  const handleImageUpload = async (productId: string, file: File, oldImageUrl?: string) => {
    setUploadingImage(productId);
    try {
      const result = await uploadOrderImage(file, `product_${productId}`);
      if (result.success && result.url) {
        await handleUpdateProduct(productId, { image_url: result.url });
      }
    } catch (error) {
      console.error('Error uploading image:', error);
    } finally {
      setUploadingImage(null);
    }
  };

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

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchTerm ||
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.supplier_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStock = !filterOutOfStock || product.is_out_of_stock;
    return matchesSearch && matchesStock;
  });

  const formatCurrency = (value: number | undefined | null) => {
    if (value === undefined || value === null) return '-';
    return `$${value.toFixed(2)}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: BRAND_ORANGE }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
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
                    isAdmin
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-blue-100 text-blue-700'
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
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: BRAND_ORANGE }}
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">Add Product</span>
            </button>
          </div>

          {/* Search and Filter */}
          <div className="mt-4 flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
            />
            <button
              onClick={() => setFilterOutOfStock(!filterOutOfStock)}
              className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 ${
                filterOutOfStock
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-700 border hover:bg-red-50'
              }`}
            >
              <AlertCircle className="w-4 h-4" />
              Out of Stock
            </button>
          </div>
        </div>
      </header>

      {/* Products List */}
      <div className="p-4 space-y-4">
        {filteredProducts.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm">
            <Package className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-900">No products yet</p>
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
              className={`bg-white rounded-xl shadow-sm overflow-hidden ${
                product.is_out_of_stock ? 'ring-2 ring-red-300' : ''
              }`}
            >
              {/* Product Header */}
              <div
                className="p-4 cursor-pointer hover:bg-gray-50"
                onClick={() => setExpandedProduct(expandedProduct === product.id ? null : product.id)}
              >
                <div className="flex items-start gap-4">
                  {/* Image */}
                  <div className="relative flex-shrink-0">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-20 h-20 object-cover rounded-lg"
                      />
                    ) : (
                      <div className="w-20 h-20 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Camera className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <label
                      className="absolute inset-0 cursor-pointer"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleImageUpload(product.id, file, product.image_url);
                        }}
                      />
                    </label>
                    {uploadingImage === product.id && (
                      <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                      </div>
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{product.name}</h3>
                      {product.is_out_of_stock && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
                          OUT OF STOCK
                        </span>
                      )}
                    </div>
                    {product.variants && (
                      <p className="text-sm text-gray-600 mt-1">
                        Variants: <span className="font-medium">{product.variants}</span>
                      </p>
                    )}
                    {product.supplier_name && (
                      <p className="text-sm text-gray-600">
                        Supplier: <span className="font-medium">{product.supplier_name}</span>
                      </p>
                    )}

                    {/* Pricing Summary */}
                    <div className="flex flex-wrap gap-2 mt-2">
                      {product.pricing?.map((pricing) => (
                        <span
                          key={pricing.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 rounded text-xs"
                        >
                          <Globe className="w-3 h-3 text-blue-600" />
                          <span className="font-medium text-gray-900">{pricing.country}:</span>
                          <span className="text-blue-600">{formatCurrency(pricing.price)}</span>
                          {pricing.shipping_time && (
                            <span className="text-gray-500">({pricing.shipping_time})</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2">
                    {product.product_link && (
                      <a
                        href={product.product_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded"
                      >
                        <ExternalLink className="w-5 h-5" />
                      </a>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteConfirm(product.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                    {expandedProduct === product.id ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Expanded Content */}
              {expandedProduct === product.id && (
                <div className="border-t bg-gray-50 p-4 space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">
                        Product Name
                      </label>
                      <input
                        type="text"
                        value={product.name}
                        onChange={(e) => handleUpdateProduct(product.id, { name: e.target.value })}
                        className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">
                        Variants
                      </label>
                      <input
                        type="text"
                        value={product.variants || ''}
                        onChange={(e) => handleUpdateProduct(product.id, { variants: e.target.value })}
                        placeholder="e.g., UNI, S/M/L"
                        className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">
                        Supplier Name
                      </label>
                      <input
                        type="text"
                        value={product.supplier_name || ''}
                        onChange={(e) =>
                          handleUpdateProduct(product.id, { supplier_name: e.target.value })
                        }
                        className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-900 mb-1">
                        Product Link
                      </label>
                      <input
                        type="url"
                        value={product.product_link || ''}
                        onChange={(e) =>
                          handleUpdateProduct(product.id, { product_link: e.target.value })
                        }
                        placeholder="https://..."
                        className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-1">
                      Description
                    </label>
                    <textarea
                      value={product.description || ''}
                      onChange={(e) =>
                        handleUpdateProduct(product.id, { description: e.target.value })
                      }
                      rows={2}
                      className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                    />
                  </div>

                  {/* Country Pricing */}
                  <div>
                    <label className="block text-xs font-medium text-gray-900 mb-2">
                      Pricing by Country
                    </label>
                    <div className="space-y-2">
                      {COUNTRIES.map((country) => {
                        const pricing = product.pricing?.find((p) => p.country === country);
                        return (
                          <div key={country} className="flex items-center gap-3 bg-white p-3 rounded-lg border">
                            <div className="w-16 text-sm font-medium text-gray-900">{country}</div>
                            <div className="flex-1 flex items-center gap-2">
                              <DollarSign className="w-4 h-4 text-gray-400" />
                              <input
                                type="number"
                                step="0.01"
                                value={pricing?.price || ''}
                                onChange={(e) =>
                                  handleUpdatePricing(product.id, country, {
                                    price: parseFloat(e.target.value) || 0,
                                  })
                                }
                                placeholder="Price"
                                className="w-24 px-2 py-1 border rounded text-gray-900 focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                            <div className="flex-1 flex items-center gap-2">
                              <Clock className="w-4 h-4 text-gray-400" />
                              <input
                                type="text"
                                value={pricing?.shipping_time || ''}
                                onChange={(e) =>
                                  handleUpdatePricing(product.id, country, {
                                    shipping_time: e.target.value,
                                  })
                                }
                                placeholder="e.g., 6-12days"
                                className="w-32 px-2 py-1 border rounded text-gray-900 focus:ring-2 focus:ring-orange-500"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Out of Stock Toggle */}
                  <div
                    className={`rounded-lg p-3 border ${
                      product.is_out_of_stock ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertCircle
                          className={`w-5 h-5 ${
                            product.is_out_of_stock ? 'text-red-500' : 'text-gray-400'
                          }`}
                        />
                        <span className="font-medium text-gray-900">Out of Stock</span>
                      </div>
                      <button
                        onClick={() =>
                          handleUpdateProduct(product.id, { is_out_of_stock: !product.is_out_of_stock })
                        }
                        className={`relative w-12 h-6 rounded-full transition-colors ${
                          product.is_out_of_stock ? 'bg-red-500' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                            product.is_out_of_stock ? 'left-7' : 'left-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Add Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b px-4 py-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Add New Product</h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Basic Info */}
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  value={newProduct.name || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                  placeholder="e.g., SG-ZXM-XW30000-Yehuda"
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Variants</label>
                <input
                  type="text"
                  value={newProduct.variants || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, variants: e.target.value })}
                  placeholder="e.g., UNI, S/M/L"
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Supplier Name</label>
                <input
                  type="text"
                  value={newProduct.supplier_name || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, supplier_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Product Link</label>
                <input
                  type="url"
                  value={newProduct.product_link || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, product_link: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                <textarea
                  value={newProduct.description || ''}
                  onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                />
              </div>

              {/* Pricing by Country */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-900">
                    Pricing by Country
                  </label>
                  <button
                    onClick={addPricingRow}
                    className="text-sm font-medium flex items-center gap-1"
                    style={{ color: BRAND_ORANGE }}
                  >
                    <Plus className="w-4 h-4" />
                    Add Country
                  </button>
                </div>
                <div className="space-y-2">
                  {newPricing.map((pricing, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <select
                        value={pricing.country}
                        onChange={(e) => {
                          const updated = [...newPricing];
                          updated[index].country = e.target.value;
                          setNewPricing(updated);
                        }}
                        className="w-24 px-2 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      >
                        {COUNTRIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                      <div className="flex-1 flex items-center gap-1">
                        <span className="text-gray-500">$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={pricing.price || ''}
                          onChange={(e) => {
                            const updated = [...newPricing];
                            updated[index].price = parseFloat(e.target.value) || 0;
                            setNewPricing(updated);
                          }}
                          placeholder="Price"
                          className="w-full px-2 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                        />
                      </div>
                      <input
                        type="text"
                        value={pricing.shipping_time || ''}
                        onChange={(e) => {
                          const updated = [...newPricing];
                          updated[index].shipping_time = e.target.value;
                          setNewPricing(updated);
                        }}
                        placeholder="6-12days"
                        className="w-28 px-2 py-2 border rounded-lg text-gray-900 focus:ring-2 focus:ring-orange-500"
                      />
                      {newPricing.length > 1 && (
                        <button
                          onClick={() => removePricingRow(index)}
                          className="p-2 text-gray-400 hover:text-red-500"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="sticky bottom-0 bg-white border-t px-4 py-3 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProduct}
                disabled={!newProduct.name}
                className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: BRAND_ORANGE }}
              >
                Add Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-sm w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Product?</h3>
            <p className="text-gray-600 mb-6">
              This will permanently delete this product and its pricing. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteProduct(deleteConfirm)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
