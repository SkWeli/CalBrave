import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import useAuth from "../context/useAuth";
import userService from "../services/userService";
import LoadingScreen from "../components/LoadingScreen";

function AuthCallbackPage() {
  const { isAuthenticated, loading, getAccessToken } = useAuth();
  const navigate = useNavigate();

  const [message, setMessage] = useState("Completing sign in…");

  useEffect(() => {
    // Keep showing the spinner while Asgardeo is still initialising.
    // The effect will re-run automatically once `loading` becomes false.
    if (loading) return;

    let cancelled = false;

    async function decideWhereToGo() {
      try {
        // If the SDK says we're not signed in, try fetching the token
        // directly as a fallback (handles edge-cases with SDK timing).
        if (!isAuthenticated) {
          let token = null;

          try {
            token = await getAccessToken();
          } catch (_) {
            // swallow — we'll handle the null case below
          }

          if (!token) {
            if (!cancelled) navigate("/login", { replace: true });
            return;
          }
        }

        setMessage("Checking your profile…");

        try {
          await userService.getProfile();

          // Profile found → existing user
          if (!cancelled) navigate("/dashboard", { replace: true });
        } catch (error) {
          if (cancelled) return;

          if (error.response?.status === 404) {
            // No profile yet → new user, go to setup
            navigate("/setup", { replace: true });
            return;
          }

          if (error.response?.status === 401) {
            // Backend rejected the token — surface the error instead of looping
            console.error("Backend rejected token:", error);
            setMessage("Authentication failed. Please sign in again.");
            return;
          }

          console.error("Profile check failed:", error);
          // Treat unknown errors as a new-user case (safest fallback)
          navigate("/setup", { replace: true });
        }
      } catch (error) {
        console.error("Auth callback error:", error);
        if (!cancelled) navigate("/login", { replace: true });
      }
    }

    decideWhereToGo();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, getAccessToken, navigate]);

  return (
    <div style={{ textAlign: "center" }}>
      <LoadingScreen />
      <p style={{ marginTop: "16px", color: "#6b7280", fontSize: "14px" }}>
        {message}
      </p>
    </div>
  );
}

export default AuthCallbackPage;