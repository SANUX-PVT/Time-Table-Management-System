import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Users } from '../api/client';
import type { User } from '../types';

interface AuthCtx {
  users: User[];
  currentUser: User | null;
  setCurrentUser: (u: User) => void;
  loading: boolean;
}

const Ctx = createContext<AuthCtx>({ users: [], currentUser: null, setCurrentUser: () => {}, loading: true });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<User[]>([]);
  const [currentUser, setCurrentUserState] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Users.list().then((list) => {
      setUsers(list);
      const savedId = localStorage.getItem('currentUserId');
      const found = list.find((u) => u.id === savedId);
      setCurrentUserState(found ?? list[0] ?? null);
      setLoading(false);
    });
  }, []);

  const setCurrentUser = (u: User) => {
    setCurrentUserState(u);
    localStorage.setItem('currentUserId', u.id);
  };

  return (
    <Ctx.Provider value={{ users, currentUser, setCurrentUser, loading }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
