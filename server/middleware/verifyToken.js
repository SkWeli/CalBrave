import { createRemoteJWKSet, jwtVerify } from "jose";

const ASGARDEO_BASE_URL = process.env.ASGARDEO_BASE_URL;

if (!ASGARDEO_BASE_URL) {
  throw new Error("ASGARDEO_BASE_URL is missing in server .env");
}

// Fetches Asgardeo's public keys and caches them; rotates automatically.
const JWKS = createRemoteJWKSet(
  new URL(`${ASGARDEO_BASE_URL}/oauth2/jwks`)
);

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "No token provided. Please log in first."
      });
    }

    const token = authHeader.split(" ")[1];

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `${ASGARDEO_BASE_URL}/oauth2/token`
    });

    // Expose consistent aliases so route handlers always use req.user.uid
    req.user = {
      ...payload,
      uid:      payload.sub,   // primary identifier used as Firestore doc ID
      id:       payload.sub,
      email:    payload.email    ?? null,
      username: payload.username ?? null
    };

    next();
  } catch (error) {
    console.error("Token verification failed:", error.message);
    return res.status(401).json({
      error: "Invalid or expired token. Please log in again."
    });
  }
};

export default verifyToken;