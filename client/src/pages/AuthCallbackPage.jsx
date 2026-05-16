import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import useAuth from "../context/useAuth";
import userService from "../services/userService";
import LoadingScreen from "../components/LoadingScreen";

function AuthCallbackPage() {
  const { isAuthenticated, loading, getAccessToken } = useAuth();
  const navigate = useNavigate();

  const [message, setMessage] = useState("Completing sign in...");

  useEffect(() => {
    let cancelled = false;

    async function waitForAccessToken() {
      for (let attempt = 1; attempt <= 10; attempt++) {
        try {
          const token = await getAccessToken();

          if (token) {
            return token;
          }
        } catch (error) {
          console.log(`Token not ready yet. Attempt ${attempt}/10`);
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      return null;
    }

    async function decideWhereToGo() {
      try {
        setMessage("Completing sign in...");

        // Let Asgardeo SDK process the authorization code first.
        await new Promise((resolve) => setTimeout(resolve, 1500));

        if (cancelled) return;

        const token = await waitForAccessToken();

        if (cancelled) return;

        if (!isAuthenticated && !token) {
          console.error("No Asgardeo session or access token found after waiting.");
          navigate("/login", { replace: true });
          return;
        }

        setMessage("Checking your CalBrave profile...");

        try {
          await userService.getProfile();

          if (!cancelled) {
            navigate("/dashboard", { replace: true });
          }
        } catch (error) {
          if (cancelled) return;

          if (error.response?.status === 404) {
            navigate("/setup", { replace: true });
            return;
          }

          if (error.response?.status === 401) {
            console.error("Backend rejected Asgardeo token:", error);
            setMessage("Login succeeded, but backend token verification failed.");
            return;
          }

          console.error("Profile check failed:", error);
          navigate("/setup", { replace: true });
        }
      } catch (error) {
        console.error("Auth callback failed:", error);

        if (!cancelled) {
          navigate("/login", { replace: true });
        }
      }
    }

    if (!loading) {
      decideWhereToGo();
    }

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, loading, getAccessToken, navigate]);

  return (
    <div>
      <LoadingScreen />
      <p style={{ textAlign: "center", marginTop: "16px" }}>{message}</p>
    </div>
  );
}

export default AuthCallbackPage;