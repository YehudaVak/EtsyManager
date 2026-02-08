'use client';

import { useState, useEffect } from 'react';
import { supabase, Store } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Store as StoreIcon, Plus, Edit2, Trash2, X, Save } from 'lucide-react';

const BRAND_ORANGE = '#d96f36';

export default function StoresManagement() {
  const { user } = useAuth();
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingStore, setEditingStore] = useState<Store | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    etsy_shop_name: '',
    description: '',
  });

  useEffect(() => {
    if (user?.role === 'master_admin') {
      fetchStores();
    }
  }, [user]);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .order('name');

      if (error) throw error;
      setStores(data || []);
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name) return;

    try {
      const { error } = await supabase.from('stores').insert({
        name: formData.name,
        etsy_shop_name: formData.etsy_shop_name,
        description: formData.description,
        is_active: true,
      });

      if (error) throw error;

      setFormData({ name: '', etsy_shop_name: '', description: '' });
      setShowAddModal(false);
      fetchStores();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleUpdate = async (storeId: string, updates: Partial<Store>) => {
    try {
      const { error } = await supabase
        .from('stores')
        .update(updates)
        .eq('id', storeId);

      if (error) throw error;
      fetchStores();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (storeId: string) => {
    if (!confirm('Are you sure? This will delete all products and orders for this store!')) {
      return;
    }

    try {
      const { error } = await supabase.from('stores').delete().eq('id', storeId);
      if (error) throw error;
      fetchStores();
    } catch (error: any) {
      alert(error.message);
    }
  };

  if (user?.role !== 'master_admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-red-600">Access denied. Master admin only.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{ borderColor: BRAND_ORANGE }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: BRAND_ORANGE }}>
                <StoreIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Stores Management</h1>
                <p className="text-sm text-gray-600">{stores.length} stores</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: BRAND_ORANGE }}
            >
              <Plus className="w-5 h-5" />
              Add Store
            </button>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {stores.map((store) => (
          <div key={store.id} className="bg-white rounded-xl shadow-sm p-4">
            {editingStore?.id === store.id ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={editingStore.name}
                  onChange={(e) => setEditingStore({ ...editingStore, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="Store name"
                />
                <input
                  type="text"
                  value={editingStore.etsy_shop_name || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, etsy_shop_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="Etsy shop name"
                />
                <textarea
                  value={editingStore.description || ''}
                  onChange={(e) => setEditingStore({ ...editingStore, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="Description"
                  rows={2}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      handleUpdate(editingStore.id, {
                        name: editingStore.name,
                        etsy_shop_name: editingStore.etsy_shop_name,
                        description: editingStore.description,
                      });
                      setEditingStore(null);
                    }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-white"
                    style={{ backgroundColor: BRAND_ORANGE }}
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={() => setEditingStore(null)}
                    className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{store.name}</h3>
                  {store.etsy_shop_name && (
                    <p className="text-sm text-gray-600">Etsy: {store.etsy_shop_name}</p>
                  )}
                  {store.description && (
                    <p className="text-sm text-gray-500 mt-1">{store.description}</p>
                  )}
                  <span className={`inline-block mt-2 px-2 py-1 rounded text-xs font-medium ${
                    store.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                  }`}>
                    {store.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleUpdate(store.id, { is_active: !store.is_active })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
                      store.is_active
                        ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {store.is_active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    onClick={() => setEditingStore(store)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleDelete(store.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New Store</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Store Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  placeholder="e.g., TerraLoomz"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Etsy Shop Name</label>
                <input
                  type="text"
                  value={formData.etsy_shop_name}
                  onChange={(e) => setFormData({ ...formData, etsy_shop_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  rows={2}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!formData.name}
                className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: BRAND_ORANGE }}
              >
                Add Store
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
