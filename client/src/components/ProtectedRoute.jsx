import { Navigate, useLocation } from "react-router-dom";
import useAuth from "../context/useAuth";
import LoadingScreen from "../components/LoadingScreen";

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Show the app's own loading UI while Asgardeo is initialising
  if (loading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}

export default ProtectedRoute;