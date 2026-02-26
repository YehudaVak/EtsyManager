'use client';

import { useState, useEffect } from 'react';
import { supabase, User, PublicUser, UserRole, Store } from '@/lib/supabase';
import { useAuth } from '@/lib/auth';
import { Users, Plus, Edit2, Trash2, X, Save, Key } from 'lucide-react';
import bcrypt from 'bcryptjs';

const BRAND_ORANGE = '#d96f36';

export default function UsersManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    role: 'store_admin' as UserRole,
    store_id: '',
  });

  useEffect(() => {
    if (currentUser?.role === 'master_admin') {
      fetchUsers();
      fetchStores();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, username, email, role, store_id, full_name, is_active')
        .order('username');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setStores(data || []);

      if (data && data.length > 0 && !formData.store_id) {
        setFormData((prev) => ({ ...prev, store_id: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    }
  };

  const handleAdd = async () => {
    if (!formData.username || !formData.password) {
      alert('Username and password are required');
      return;
    }

    if (formData.role !== 'master_admin' && !formData.store_id) {
      alert('Store is required for non-master admin users');
      return;
    }

    try {
      const passwordHash = await bcrypt.hash(formData.password, 10);

      const { error } = await supabase.from('users').insert({
        username: formData.username,
        password_hash: passwordHash,
        email: formData.email || null,
        full_name: formData.full_name || null,
        role: formData.role,
        store_id: formData.role === 'master_admin' ? null : formData.store_id,
        is_active: true,
      });

      if (error) throw error;

      setFormData({
        username: '',
        password: '',
        email: '',
        full_name: '',
        role: 'store_admin',
        store_id: stores[0]?.id || '',
      });
      setShowAddModal(false);
      fetchUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_active: !currentStatus })
        .eq('id', userId);

      if (error) throw error;
      fetchUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;

    try {
      const { error } = await supabase.from('users').delete().eq('id', userId);
      if (error) throw error;
      fetchUsers();
    } catch (error: any) {
      alert(error.message);
    }
  };

  const getStoreName = (storeId?: string) => {
    if (!storeId) return '-';
    const store = stores.find((s) => s.id === storeId);
    return store?.name || 'Unknown';
  };

  if (currentUser?.role !== 'master_admin') {
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
        <div className="px-4 py-4 pl-14 lg:pl-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 flex-1 justify-center lg:justify-start">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: BRAND_ORANGE }}>
                <Users className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Users Management</h1>
                <p className="text-sm text-gray-600">{users.length} users</p>
              </div>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium"
              style={{ backgroundColor: BRAND_ORANGE }}
            >
              <Plus className="w-5 h-5" />
              Add User
            </button>
          </div>
        </div>
      </header>

      <div className="p-4">
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Username</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Full Name</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Role</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Store</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase">Status</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{user.username}</div>
                    {user.email && <div className="text-sm text-gray-500">{user.email}</div>}
                  </td>
                  <td className="px-4 py-3 text-gray-900">{user.full_name || '-'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      user.role === 'master_admin'
                        ? 'bg-purple-100 text-purple-700'
                        : user.role === 'store_admin'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    }`}>
                      {user.role.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-900">{getStoreName(user.store_id)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded text-xs font-medium ${
                      user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleToggleActive(user.id, user.is_active)}
                        className={`px-3 py-1 rounded text-sm font-medium ${
                          user.is_active
                            ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {user.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Add New User</h2>
              <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Password *</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1">Role *</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border rounded-lg text-gray-900"
                >
                  <option value="master_admin">Master Admin</option>
                  <option value="store_admin">Store Admin</option>
                  <option value="supplier">Supplier</option>
                </select>
              </div>
              {formData.role !== 'master_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-900 mb-1">Store *</label>
                  <select
                    value={formData.store_id}
                    onChange={(e) => setFormData({ ...formData, store_id: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-gray-900"
                  >
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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
                disabled={!formData.username || !formData.password}
                className="px-4 py-2 rounded-lg text-white font-medium disabled:opacity-50"
                style={{ backgroundColor: BRAND_ORANGE }}
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
