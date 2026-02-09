# Refresh Token Implementation

This document explains the refresh token authentication system implemented in Smart Queue for enhanced security.

## Overview

The application uses a **dual-token authentication system**:
- **Access Token**: Short-lived (15 minutes), used for API requests
- **Refresh Token**: Long-lived (7 days), used to get new access tokens

This approach provides better security by:
- Limiting the exposure time of access tokens
- Allowing token revocation through the database
- Implementing automatic token rotation on refresh

## How It Works

### 1. Login Flow

When a doctor logs in:
1. Backend validates credentials
2. Generates both access and refresh tokens
3. Stores refresh token in database (for validation)
4. Sends both tokens as httpOnly cookies
5. Frontend stores user info in localStorage

**Access Token Cookie**: `token` (15 min expiry)
**Refresh Token Cookie**: `refreshToken` (7 days expiry, only sent to `/api/auth/refresh`)

### 2. API Requests

All API requests include the access token cookie automatically:
1. Frontend makes API request
2. Access token is sent via cookie
3. Backend validates the token
4. Request is processed

### 3. Token Refresh Flow

When an access token expires:
1. API request returns 401 Unauthorized
2. Frontend axios interceptor catches the error
3. Automatically calls `/api/auth/refresh` endpoint
4. Backend:
   - Validates refresh token from cookie
   - Checks token against database
   - Generates new tokens (rotation)
   - Updates database with new refresh token
   - Returns new tokens
5. Frontend retries the original request with new token
6. Process is transparent to the user

### 4. Logout Flow

When a doctor logs out:
1. Frontend calls `/api/auth/logout`
2. Backend clears refresh token from database
3. Both cookies are cleared
4. User is redirected to login

## Security Features

### Token Rotation
Every time a refresh token is used, a new one is generated. This prevents token reuse attacks.

### Database Validation
Refresh tokens are stored in the database and validated on every use. This allows immediate revocation.

### httpOnly Cookies
Tokens are stored in httpOnly cookies, preventing JavaScript access and XSS attacks.

### Separate Paths
Refresh token cookie is only sent to `/api/auth/refresh`, limiting exposure.

### Short Access Token Lifetime
Access tokens expire after 15 minutes, limiting the window for token theft.

## Backend Implementation

### Token Utilities (`backend/utils/tokenUtils.js`)

```javascript
const { generateTokenPair } = require('../utils/tokenUtils');

// Generate both tokens
const { accessToken, refreshToken, refreshTokenExpiry } = generateTokenPair({
  doctorId: doctor._id
});
```

### Doctor Model Updates

Added fields to store refresh token:
```javascript
refreshToken: { type: String },
refreshTokenExpiry: { type: Date }
```

### Endpoints

**POST `/api/auth/login`**
- Validates credentials
- Generates token pair
- Stores refresh token in DB
- Sets both cookies

**POST `/api/auth/refresh`**
- Validates refresh token from cookie
- Checks database for token match
- Generates new token pair (rotation)
- Updates database
- Sets new cookies

**POST `/api/auth/logout`**
- Clears refresh token from database
- Clears both cookies

## Frontend Implementation

### Axios Interceptor (`frontend/vite-project/src/services/api.js`)

Automatically handles token refresh:

```javascript
// Intercepts 401 errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Attempt token refresh
      await refreshToken();
      // Retry original request
      return api(originalRequest);
    }
    return Promise.reject(error);
  }
);
```

Features:
- **Request Queuing**: Multiple 401s trigger only one refresh
- **Automatic Retry**: Original requests are retried after refresh
- **Graceful Failure**: Redirects to login if refresh fails
- **Endpoint Exclusion**: Doesn't retry auth endpoints

## Environment Variables

Add to `backend/.env`:

```bash
# Required
JWT_SECRET=your_strong_jwt_secret_here

# Optional - uses JWT_SECRET if not provided
JWT_REFRESH_SECRET=your_strong_refresh_secret_here
```

Generate strong secrets:
```bash
# Generate JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Generate JWT_REFRESH_SECRET (use a different value)
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Token Lifetimes

### Access Token
- **Duration**: 15 minutes
- **Purpose**: API authentication
- **Storage**: httpOnly cookie named `token`
- **Scope**: Sent to all `/api/*` endpoints

### Refresh Token
- **Duration**: 7 days
- **Purpose**: Get new access tokens
- **Storage**: httpOnly cookie named `refreshToken`
- **Scope**: Only sent to `/api/auth/refresh`

These can be adjusted in `backend/routes/authRoutes.js`:
```javascript
const accessTokenCookieOptions = {
  maxAge: 15 * 60 * 1000  // Change here
};

const refreshTokenCookieOptions = {
  maxAge: 7 * 24 * 60 * 60 * 1000  // Change here
};
```

## User Experience

From the user's perspective:
- ✅ **Seamless**: Token refresh happens automatically
- ✅ **Fast**: No visible delays or interruptions
- ✅ **Secure**: Tokens stored in httpOnly cookies
- ✅ **Reliable**: Request queuing prevents race conditions
- ✅ **Graceful**: Clear feedback on auth failure

## Testing

### Manual Testing

1. **Login and Check Cookies**:
   ```javascript
   // Open browser DevTools > Application > Cookies
   // Should see: token (15 min) and refreshToken (7 days)
   ```

2. **Wait for Token Expiry**:
   ```javascript
   // Wait 15+ minutes
   // Make an API request
   // Should automatically refresh and succeed
   ```

3. **Check Network Tab**:
   ```javascript
   // DevTools > Network
   // Failed request with 401
   // Automatic /api/auth/refresh call
   // Original request retry (success)
   ```

### Unit Testing

Tests handle both authentication approaches:
```javascript
// Old tests still work - backward compatible
await request(app)
  .post('/api/auth/login')
  .send({ email, password })
  .expect(200);
```

## Troubleshooting

### Issue: "Refresh token not found"
**Cause**: Cookie not being sent
**Solution**: Ensure `withCredentials: true` in axios config

### Issue: "Invalid refresh token"
**Cause**: Token doesn't match database
**Solution**: Clear cookies and login again

### Issue: Infinite refresh loop
**Cause**: Refresh endpoint returning 401
**Solution**: Check JWT_SECRET is set correctly

### Issue: Token not refreshing automatically
**Cause**: Axios interceptor not catching 401
**Solution**: Verify api.js interceptor is configured

## Migration from Old System

The implementation is **backward compatible**. Old code continues to work:

**Before** (using long-lived token):
```javascript
// Still works - login sets both tokens
const response = await api.post('/auth/login', credentials);
```

**After** (automatic refresh):
```javascript
// Exactly the same - refresh happens automatically
const response = await api.post('/auth/login', credentials);
```

No frontend code changes required! The axios interceptor handles everything.

## Security Best Practices

1. **Use HTTPS**: Always use HTTPS in production
2. **Secure Cookies**: Set `secure: true` in production
3. **Rotate Secrets**: Change JWT secrets periodically
4. **Monitor Failed Refreshes**: Log and alert on refresh failures
5. **Implement Rate Limiting**: Limit refresh endpoint calls
6. **Use Different Secrets**: Use separate secrets for access and refresh tokens

## Monitoring

Log important events:
```javascript
// Login
logger.info("Doctor logged in successfully", { doctorId });

// Token refresh
logger.info("Access token refreshed successfully", { doctorId });

// Logout
logger.info("Doctor logged out successfully", { doctorId });

// Failed refresh
logger.error("Refresh token validation failed", { error });
```

## Performance Impact

- **Minimal overhead**: Token generation is fast (~1ms)
- **Database queries**: One extra query per refresh (cached)
- **Network**: No additional round trips for users
- **Storage**: Minimal database space for refresh tokens

## Future Enhancements

Potential improvements:
- [ ] Multiple device support (store multiple refresh tokens)
- [ ] Token fingerprinting (bind to device/IP)
- [ ] Suspicious activity detection
- [ ] Admin panel for token management
- [ ] Refresh token expiry notifications

## References

- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Token Storage](https://cheatsheetseries.owasp.org/cheatsheets/JSON_Web_Token_for_Java_Cheat_Sheet.html)
- [Refresh Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
