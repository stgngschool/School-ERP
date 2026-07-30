import { useState, useRef, useEffect, useCallback } from "react";
import { MockUser, Role, AuthStage } from "../context/AuthContext";

export function useAuthLogic(refreshData: (user?: MockUser | null) => Promise<void> | void) {
  const refreshDataRef = useRef(refreshData);
  useEffect(() => {
    refreshDataRef.current = refreshData;
  }, [refreshData]);

  const [user, setUser] = useState<MockUser | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("gng_user");
        return stored ? JSON.parse(stored) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [activeRole, setActiveRole] = useState<Role | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("gng_active_role");
        return (stored as Role) || null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [authLoading, setAuthLoading] = useState(true);
  const [currentStage, setCurrentStage] = useState<AuthStage>("APP STARTED");
  const [stageError, setStageError] = useState<string | null>(null);

  const isInitSessionActiveRef = useRef(false);
  const sessionVersionRef = useRef(0);

  const initSession = useCallback(async () => {
    if (isInitSessionActiveRef.current) {
      return;
    }
    isInitSessionActiveRef.current = true;
    const currentVersion = ++sessionVersionRef.current;

    setAuthLoading(true);
    setStageError(null);
    setCurrentStage("APP STARTED");

    const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

    if (!isOnline) {
      if (currentVersion === sessionVersionRef.current) {
        setStageError("Device is offline. Waiting for network connection...");
        setCurrentStage("CHECKING SESSION");
        setAuthLoading(false);
      }
      isInitSessionActiveRef.current = false;
      return;
    }

    setCurrentStage("SUPABASE CLIENT CREATED");

    const MAX_ATTEMPTS = 3;
    const RETRY_DELAY_MS = 1500;
    const ATTEMPT_TIMEOUT_MS = 8000;

    let lastError: string | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        if (attempt > 1) {
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        }

        if (currentVersion !== sessionVersionRef.current) {
          isInitSessionActiveRef.current = false;
          return;
        }

        setCurrentStage("CHECKING SESSION");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), ATTEMPT_TIMEOUT_MS);

        let res: Response;
        try {
          res = await fetch("/api/auth/me", {
            credentials: "include",
            cache: "no-store",
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (currentVersion !== sessionVersionRef.current) {
          isInitSessionActiveRef.current = false;
          return;
        }

        if (res.ok) {
          const data = await res.json();
          setCurrentStage("SESSION FOUND");
          setUser(data.user);
          setCurrentStage("AUTH USER LOADED");
          setCurrentStage("PROFILE LOADED");
          setActiveRole(data.user.role);
          setCurrentStage("ADMIN LOADED");
          try {
            localStorage.setItem("gng_user", JSON.stringify(data.user));
            localStorage.setItem("gng_active_role", data.user.role);
          } catch (e) {}
          setAuthLoading(false);
          
          refreshDataRef.current(data.user);
          isInitSessionActiveRef.current = false;
          return;
        } else if (res.status === 401 || res.status === 403) {
          const errBody = await res.json().catch(() => ({}));
          if (res.status === 403) {
            setStageError(errBody?.error || "Account is locked by administrator.");
          }
          try {
            localStorage.removeItem("gng_user");
            localStorage.removeItem("gng_active_role");
          } catch (e) {}
          setUser(null);
          setActiveRole(null);
          setAuthLoading(false);
          isInitSessionActiveRef.current = false;
          return;
        } else {
          lastError = `Server returned HTTP ${res.status} ${res.statusText}`;
          continue;
        }
      } catch (err: any) {
        const isAbort = err.name === "AbortError";
        lastError = isAbort
          ? `Request timed out after ${ATTEMPT_TIMEOUT_MS / 1000}s (attempt ${attempt}/${MAX_ATTEMPTS})`
          : err.message || "Network error";
      }
    }

    if (currentVersion === sessionVersionRef.current) {
      setStageError(lastError || "Authentication failed after multiple attempts.");
      setAuthLoading(false);
    }
    isInitSessionActiveRef.current = false;
  }, []);

  const login = useCallback(async (usernameVal: string, passwordVal: string, portalVal?: "STAFF" | "PARENT") => {
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: usernameVal, password: passwordVal, portal: portalVal }),
      });

      const data = await res.json();

      if (!res.ok) {
        return { success: false, error: data.error || "Invalid username/phone or password." };
      }

      sessionVersionRef.current++;
      setUser(data.user);
      setActiveRole(data.user.role);
      setAuthLoading(false);
      try {
        localStorage.setItem("gng_user", JSON.stringify(data.user));
        localStorage.setItem("gng_active_role", data.user.role);
      } catch (e) {}
      
      refreshDataRef.current(data.user);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Login failed. Please try again." };
    }
  }, []);

  const logout = useCallback(async () => {
    sessionVersionRef.current++;
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include", cache: "no-store" });
      try {
        localStorage.removeItem("gng_user");
        localStorage.removeItem("gng_active_role");
      } catch (e) {}
      setUser(null);
      setActiveRole(null);
      setAuthLoading(false);
      window.location.href = "/login";
    } catch (err) {
      try {
        localStorage.removeItem("gng_user");
        localStorage.removeItem("gng_active_role");
      } catch (e) {}
      setUser(null);
      setActiveRole(null);
      setAuthLoading(false);
      window.location.href = "/login";
    }
  }, []);

  const switchRole = useCallback(async (role: Role) => {
    try {
      const res = await fetch("/api/auth/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });

      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setActiveRole(role);
        window.location.reload();
      }
    } catch (err) {
      console.error("Switch role failed:", err);
    }
  }, []);

  useEffect(() => {
    initSession();
  }, [initSession]);

  useEffect(() => {
    let visibilityDebounce: NodeJS.Timeout;
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        clearTimeout(visibilityDebounce);
        visibilityDebounce = setTimeout(() => {
          if (user) {
            fetch("/api/auth/me", { credentials: "include", cache: "no-store" })
              .then((res) => {
                if (!res.ok) {
                  setUser(null);
                  setActiveRole(null);
                  if (typeof window !== "undefined") {
                    window.location.replace("/login");
                  }
                }
              })
              .catch(() => {});
          } else {
            initSession();
          }
        }, 500);
      }
    };

    const handleOnline = () => {
      if (authLoading || stageError) {
        initSession();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      clearTimeout(visibilityDebounce);
    };
  }, [initSession, user, authLoading, stageError]);

  return {
    user,
    setUser,
    activeRole,
    setActiveRole,
    authLoading,
    currentStage,
    setCurrentStage,
    stageError,
    initSession,
    login,
    logout,
    switchRole
  };
}
