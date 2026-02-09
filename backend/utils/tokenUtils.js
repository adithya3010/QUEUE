const jwt = require('jsonwebtoken');
const crypto = require('crypto');

/**
 * Generate an access token (short-lived)
 * @param {Object} payload - Data to encode in the token
 * @returns {string} JWT access token
 */
const generateAccessToken = (payload) => {
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: '15m' // 15 minutes
  });
};

/**
 * Generate a refresh token (long-lived)
 * @param {Object} payload - Data to encode in the token
 * @returns {Object} { token, expiry }
 */
const generateRefreshToken = (payload) => {
  // Create a unique refresh token
  const token = jwt.sign(
    { ...payload, tokenId: crypto.randomBytes(32).toString('hex') },
    process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET,
    { expiresIn: '7d' } // 7 days
  );

  // Calculate expiry date
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + 7);

  return { token, expiry };
};

/**
 * Verify an access token
 * @param {string} token - JWT token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyAccessToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired access token');
  }
};

/**
 * Verify a refresh token
 * @param {string} token - JWT refresh token to verify
 * @returns {Object} Decoded token payload
 * @throws {Error} If token is invalid or expired
 */
const verifyRefreshToken = (token) => {
  try {
    return jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );
  } catch (error) {
    throw new Error('Invalid or expired refresh token');
  }
};

/**
 * Generate token pair (access + refresh)
 * @param {Object} payload - User data to encode
 * @returns {Object} { accessToken, refreshToken, refreshTokenExpiry }
 */
const generateTokenPair = (payload) => {
  const accessToken = generateAccessToken(payload);
  const { token: refreshToken, expiry: refreshTokenExpiry } = generateRefreshToken(payload);

  return {
    accessToken,
    refreshToken,
    refreshTokenExpiry
  };
};

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateTokenPair
};
