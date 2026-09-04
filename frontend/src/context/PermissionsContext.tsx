import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Permissions } from '../api/client';
import { useAuth } from './AuthContext';
import type { PermissionKey, RolePermissions } from '../types';

interface PermissionsData {
  permissions: RolePermissions | null;
  labels: Record<PermissionKey, string> | null;
  loading: boolean;
  refresh: () => void;
  hasPermission: (key: PermissionKey) => boolean;
}

const Ctx = createContext<PermissionsData>({
  permissions: null,
  labels: null,
  loading: true,
  refresh: () => {},
  hasPermission: () => false,
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const [permissions, setPermissions] = useState<RolePermissions | null>(null);
  const [labels, setLabels] = useState<Record<PermissionKey, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true);
    Permissions.get().then((d) => {
      setPermissions(d.permissions);
      setLabels(d.labels);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [tick]);

  const hasPermission = (key: PermissionKey) => {
    if (!currentUser || !permissions) return false;
    return permissions[currentUser.role]?.includes(key) ?? false;
  };

  return (
    <Ctx.Provider value={{ permissions, labels, loading, refresh: () => setTick((t) => t + 1), hasPermission }}>
      {children}
    </Ctx.Provider>
  );
}

export const usePermissions = () => useContext(Ctx);
