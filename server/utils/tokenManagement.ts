// When a user first creates content (their first board)
// TackPad/server/utils/tokenManagement.ts
import { nanoid } from "nanoid";
import { createHash } from "node:crypto";
import type { H3Event } from "h3"; // Import H3Event type

// Maximum cookie age (400 days in seconds)
const MAX_COOKIE_AGE = 34560000; // 60 * 60 * 24 * 400

// Cookie options for consistent settings
const getCookieOptions = () => ({
  maxAge: MAX_COOKIE_AGE,
  path: "/",
  httpOnly: true, // Keep httpOnly for security
  secure: process.env.NODE_ENV === "production", // Use Secure in production
  sameSite: "lax", // Lax is generally good for OAuth redirects
});

// Renamed to indicate it returns the HASHED token for DB storage/lookup
export const setupAndGetHashedUserToken = (event: H3Event): string | null => {
  let userToken = getCookie(event, "user-token");
  let needsToSetCookie = false;

  if (!userToken) {
    userToken = nanoid();
    needsToSetCookie = true;
  }

  // Always refresh/set the cookie to extend its life on interaction
  // Or set it for the first time
  setCookie(event, "user-token", userToken, getCookieOptions());

  // Return the HASHED version for DB operations
  return hashToken(userToken);
};

// Function to simply get the raw token from the cookie
export const getRawUserToken = (event: H3Event): string | undefined => {
  return getCookie(event, "user-token");
};

// Export the hashing function separately for use in auth flow
export const hashToken = (token: string): string => {
  if (!token) return ""; // Handle empty token case
  return createHash("sha256").update(token).digest("hex");
};

// Verification remains the same
export const verifyUserToken = (event: H3Event, hash: string): boolean => {
  const token = getCookie(event, "user-token");
  if (!token || !hash) return false;
  return hash === hashToken(token);
};
