'use client';

import { useAuth } from '@/lib/auth';
import { Store } from 'lucide-react';

const BRAND_ORANGE = '#d96f36';

export default function StoreSelector() {
  const { user, selectedStore, availableStores, selectStore, canSelectStore } = useAuth();

  // Don't show selector if user can't select stores
  if (!canSelectStore || !selectedStore) {
    return null;
  }

  // Don't show if only one store available
  if (availableStores.length <= 1) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
        <Store className="w-4 h-4 text-gray-600" />
        <span className="text-sm font-medium text-gray-900">{selectedStore.name}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Store className="w-4 h-4 text-gray-600" />
      <select
        value={selectedStore.id}
        onChange={(e) => selectStore(e.target.value)}
        className="px-3 py-1.5 border rounded-lg text-sm font-medium text-gray-900 bg-white focus:ring-2 focus:ring-orange-500 cursor-pointer"
        style={{ borderColor: BRAND_ORANGE }}
      >
        {availableStores.map((store) => (
          <option key={store.id} value={store.id}>
            {store.name}
          </option>
        ))}
      </select>
    </div>
  );
}
