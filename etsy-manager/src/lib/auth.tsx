'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, PublicUser, UserRole, Store } from './supabase';

interface AuthContextType {
  user: PublicUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;

  // Store management (for master_admin)
  selectedStore: Store | null;
  availableStores: Store[];
  selectStore: (storeId: string) => void;
  canSelectStore: boolean; // true for master_admin
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [availableStores, setAvailableStores] = useState<Store[]>([]);
  const router = useRouter();

  // Check for existing session on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const savedUser = localStorage.getItem('user');
        if (savedUser) {
          const parsedUser: PublicUser = JSON.parse(savedUser);
          setUser(parsedUser);

          // Load stores
          await loadStores(parsedUser);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
        localStorage.removeItem('user');
        localStorage.removeItem('selectedStoreId');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  const loadStores = async (currentUser: PublicUser) => {
    try {
      // Fetch all active stores
      const { data: stores, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;

      setAvailableStores(stores || []);

      // Set selected store based on user role
      if (currentUser.role === 'master_admin') {
        // Master admin can select any store
        const savedStoreId = localStorage.getItem('selectedStoreId');
        if (savedStoreId && stores) {
          const store = stores.find(s => s.id === savedStoreId);
          if (store) {
            setSelectedStore(store);
          } else if (stores.length > 0) {
            setSelectedStore(stores[0]);
            localStorage.setItem('selectedStoreId', stores[0].id);
          }
        } else if (stores && stores.length > 0) {
          setSelectedStore(stores[0]);
          localStorage.setItem('selectedStoreId', stores[0].id);
        }
      } else {
        // Store admin or supplier: auto-select their store
        if (currentUser.store_id && stores) {
          const userStore = stores.find(s => s.id === currentUser.store_id);
          if (userStore) {
            setSelectedStore(userStore);
          }
        }
      }
    } catch (error) {
      console.error('Error loading stores:', error);
    }
  };

  const selectStore = (storeId: string) => {
    if (user?.role !== 'master_admin') {
      console.warn('Only master admin can select stores');
      return;
    }

    const store = availableStores.find(s => s.id === storeId);
    if (store) {
      setSelectedStore(store);
      localStorage.setItem('selectedStoreId', storeId);
    }
  };

  const login = async (username: string, password: string) => {
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success && data.user) {
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Load stores for the user
        await loadStores(data.user);

        return { success: true };
      } else {
        return { success: false, error: data.error || 'Login failed' };
      }
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Failed to connect to server' };
    }
  };

  const logout = () => {
    setUser(null);
    setSelectedStore(null);
    setAvailableStores([]);
    localStorage.removeItem('user');
    localStorage.removeItem('selectedStoreId');
    router.push('/');
  };

  const canSelectStore = user?.role === 'master_admin';

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        logout,
        selectedStore,
        availableStores,
        selectStore,
        canSelectStore
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
