import { useCallback, useEffect, useMemo, useState } from "react";

import { ApiError } from "../api/apiClient";
import { getCurrentSession, login, logout } from "../api/authApi";
import { AuthContext } from "./authContext";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState("");

  const refreshSession = useCallback(async () => {
    setStatus("loading");
    setError("");

    try {
      const result = await getCurrentSession();
      setUser(result.user);
      setStatus("authenticated");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setUser(null);
        setStatus("anonymous");
      } else {
        setUser(null);
        setStatus("error");
        setError(err.message);
      }
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      try {
        const result = await getCurrentSession();

        if (active) {
          setUser(result.user);
          setStatus("authenticated");
          setError("");
        }
      } catch (err) {
        if (!active) {
          return;
        }

        if (err instanceof ApiError && err.status === 401) {
          setUser(null);
          setStatus("anonymous");
        } else {
          setUser(null);
          setStatus("error");
          setError(err.message);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const loginUser = useCallback(async (username, password) => {
    setError("");
    const result = await login(username, password);
    setUser(result.user);
    setStatus("authenticated");
    return result.user;
  }, []);

  const logoutUser = useCallback(async () => {
    await logout();
    setUser(null);
    setStatus("anonymous");
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      error,
      isAuthenticated: status === "authenticated",
      loginUser,
      logoutUser,
      refreshSession,
    }),
    [user, status, error, loginUser, logoutUser, refreshSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
