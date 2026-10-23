import { createContext, useContext, useEffect, useState } from "react";
import { api } from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore the session on refresh if a token is stored.
  useEffect(() => {
    const token = localStorage.getItem("notewise_token");
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .me()
      .then(setUser)
      .catch(() => localStorage.removeItem("notewise_token"))
      .finally(() => setLoading(false));
  }, []);

  const saveSession = (data) => {
    localStorage.setItem("notewise_token", data.token);
    setUser({ _id: data._id, name: data.name, email: data.email });
  };

  const login = async (payload) => {
    const data = await api.login(payload);
    saveSession(data);
    return data;
  };

  const register = async (payload) => {
    const data = await api.register(payload);
    saveSession(data);
    return data;
  };

  const logout = () => {
    localStorage.removeItem("notewise_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
