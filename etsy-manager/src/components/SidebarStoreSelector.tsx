'use client';

import { useAuth } from '@/lib/auth';
import { Store } from 'lucide-react';

interface SidebarStoreSelectorProps {
  collapsed?: boolean;
}

export default function SidebarStoreSelector({ collapsed = false }: SidebarStoreSelectorProps) {
  const { selectedStore, availableStores, selectStore, canSelectStore } = useAuth();

  if (!canSelectStore || !selectedStore) return null;
  if (availableStores.length <= 1) {
    if (collapsed) {
      return (
        <div className="mx-2 flex justify-center py-2" title={selectedStore.name}>
          <Store className="w-5 h-5 text-gray-400" />
        </div>
      );
    }
    return (
      <div className="mx-3 mb-2 px-3 py-2 bg-gray-800 rounded-lg flex items-center gap-2">
        <Store className="w-4 h-4 text-gray-400" />
        <span className="text-sm text-gray-300 truncate">{selectedStore.name}</span>
      </div>
    );
  }

  if (collapsed) {
    return (
      <div className="mx-2 flex justify-center py-2" title={selectedStore.name}>
        <Store className="w-5 h-5 text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mx-3 mb-2">
      <label className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1 block px-1">Store</label>
      <select
        value={selectedStore.id}
        onChange={(e) => selectStore(e.target.value)}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-[#d96f36] focus:border-[#d96f36] cursor-pointer appearance-none"
      >
        {availableStores.map((store) => (
          <option key={store.id} value={store.id}>{store.name}</option>
        ))}
      </select>
    </div>
  );
}
