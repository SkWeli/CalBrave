import { createContext, useEffect } from "react";
import { useAsgardeo } from "@asgardeo/react";
import { setAccessTokenGetter } from "../services/api";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const {
    isSignedIn,
    user,
    signIn,
    signOut,
    loading,
    error,
    getAccessToken
  } = useAsgardeo();

  // Register the token getter with the Axios instance so every API request
  // automatically receives the Asgardeo JWT in the Authorization header.
  useEffect(() => {
    setAccessTokenGetter(getAccessToken);
  }, [getAccessToken]);

  const value = {
    isAuthenticated: isSignedIn,
    user,
    login:          signIn,
    logout:         signOut,
    loading,
    error,
    getAccessToken
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}