# Password Reset Implementation

This document explains the password reset feature implemented in Smart Queue for enhanced user experience and security.

## Overview

The password reset system allows doctors to securely reset their passwords when they forget them. The implementation includes:

- **Secure Token Generation**: Cryptographically secure tokens with expiry
- **Email Delivery**: HTML-formatted emails with reset links
- **Time-Limited Access**: Reset links expire after 1 hour
- **Password Validation**: Minimum 8 characters required
- **Email Enumeration Prevention**: Consistent responses for both existing and non-existing emails
- **Confirmation Emails**: Users receive confirmation after successful password change

## How It Works

### 1. Forgot Password Flow

When a doctor forgets their password:

1. Doctor clicks "Forgot Password?" on login page
2. Enters their email address
3. Backend:
   - Generates a secure reset token using `crypto.randomBytes(32)`
   - Hashes the token with SHA-256 before storing
   - Sets expiry to 1 hour from now
   - Stores hashed token and expiry in database
   - Sends email with reset link containing the **unhashed** token
4. Doctor receives email with reset link
5. Link remains valid for 1 hour

**Security Note**: The system returns the same message whether the email exists or not, preventing email enumeration attacks.

### 2. Reset Password Flow

When a doctor clicks the reset link:

1. Frontend extracts token from URL parameter
2. Doctor enters new password (min 8 characters)
3. Backend:
   - Hashes the token from URL
   - Finds doctor with matching hashed token
   - Verifies token hasn't expired
   - Updates password with bcrypt hash
   - Clears reset token fields from database
   - Sends confirmation email
4. Doctor is redirected to login page
5. Old password no longer works

## Security Features

### Token Hashing
Reset tokens are hashed before storage, so even if the database is compromised, tokens cannot be used.

```javascript
// Generate token
const resetToken = crypto.randomBytes(32).toString('hex');
const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

// Store hashed version
doctor.resetPasswordToken = hashedToken;
```

### Time-Limited Access
Tokens expire after 1 hour, limiting the window for potential abuse.

### Email Enumeration Prevention
Always returns the same message regardless of whether email exists:

```javascript
// Same response for both cases
"If an account exists with this email, a password reset link has been sent"
```

### Single-Use Tokens
After successful password reset, the token is cleared from the database and cannot be reused.

### Password Strength
Minimum 8 characters required for new passwords.

## Backend Implementation

### Doctor Model Updates (`backend/models/Doctor.js`)

Added fields for password reset:

```javascript
resetPasswordToken: {
  type: String,
  default: undefined
},
resetPasswordExpiry: {
  type: Date,
  default: undefined
}
```

### Email Service (`backend/utils/emailService.js`)

Two email functions:

**1. Password Reset Email**
```javascript
sendPasswordResetEmail(email, resetToken, doctorName)
```
- Sends HTML email with reset link
- Link format: `${FRONTEND_URL}/reset-password/${resetToken}`
- Includes security warnings and expiry notice

**2. Password Change Confirmation**
```javascript
sendPasswordChangeConfirmation(email, doctorName)
```
- Confirms successful password change
- Alerts user to contact support if they didn't make the change

### API Endpoints

#### POST `/api/auth/forgot-password`

Request a password reset link.

**Request:**
```json
{
  "email": "doctor@example.com"
}
```

**Response (200):**
```json
{
  "message": "If an account exists with this email, a password reset link has been sent"
}
```

**Error (400):**
```json
{
  "message": "Email is required"
}
```

#### POST `/api/auth/reset-password/:token`

Reset password using the token.

**URL Parameter:**
- `token`: The reset token from the email link

**Request:**
```json
{
  "password": "NewPassword123"
}
```

**Response (200):**
```json
{
  "message": "Password has been reset successfully"
}
```

**Error (400):**
```json
{
  "message": "Invalid or expired reset token"
}
```

or

```json
{
  "message": "Password must be at least 8 characters long"
}
```

## Frontend Implementation

### Pages Created

**1. ForgotPassword.jsx (`/forgot-password`)**
- Email input form
- Success message display
- Link back to login
- Loading states and error handling

**2. ResetPassword.jsx (`/reset-password/:token`)**
- New password input (with confirmation)
- Show/hide password toggle
- Password validation
- Success message with auto-redirect
- Link back to login

### Routing (`frontend/vite-project/src/App.jsx`)

```javascript
<Route path="/forgot-password" element={<ForgotPassword />} />
<Route path="/reset-password/:token" element={<ResetPassword />} />
```

### Login Page Update

Added "Forgot Password?" link to DoctorLogin.jsx:

```jsx
<Link to="/forgot-password" className="text-sm text-cyan-300 hover:text-cyan-200 underline">
  Forgot Password?
</Link>
```

## Email Configuration

### Environment Variables

Add to `backend/.env`:

```bash
# Email Service Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=Smart Queue <noreply@smartqueue.com>

# Frontend URL for reset links
FRONTEND_URL=http://localhost:5173
```

### Gmail Setup (Example)

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password:
   - Go to Google Account Settings
   - Security → App Passwords
   - Create new app password for "Mail"
3. Use the app password in `EMAIL_PASSWORD`

### Development Mode

If no email configuration is provided:
- Emails are logged to console instead of being sent
- Reset URL is printed for testing
- Returns success to allow testing the flow

```bash
=====================================
PASSWORD RESET EMAIL (Development Mode)
=====================================
To: doctor@example.com
Reset URL: http://localhost:5173/reset-password/abc123...
=====================================
```

## User Experience

### Forgot Password Page
1. Clean, simple interface
2. Email field with validation
3. Loading spinner during submission
4. Success message with instructions
5. Clear link back to login

### Reset Password Page
1. Password and confirm password fields
2. Show/hide password toggle
3. Clear validation messages
4. Success message with auto-redirect (3 seconds)
5. Manual link to login if needed

### Email Templates
1. Professional HTML design matching app theme
2. Prominent "Reset Password" button
3. Alternative copy-paste link
4. Security warnings and expiry notice
5. Support contact information

## Testing

### Manual Testing

**1. Test Forgot Password**
```bash
curl -X POST http://localhost:5000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@example.com"}'
```

Check console for reset URL in development mode.

**2. Test Reset Password**
```bash
curl -X POST http://localhost:5000/api/auth/reset-password/TOKEN_HERE \
  -H "Content-Type: application/json" \
  -d '{"password":"NewPassword123"}'
```

**3. Verify Old Password Doesn't Work**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@example.com","password":"OldPassword123"}'
```

Should return 401 Unauthorized.

**4. Verify New Password Works**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"doctor@example.com","password":"NewPassword123"}'
```

Should return 200 with doctor data.

### Frontend Testing

1. **Navigate to Forgot Password**
   - Click "Forgot Password?" on login page
   - Should navigate to `/forgot-password`

2. **Submit Email**
   - Enter email and submit
   - Should show success message
   - Check email or console for reset link

3. **Click Reset Link**
   - Open email and click button
   - Should navigate to `/reset-password/:token`

4. **Reset Password**
   - Enter new password (twice)
   - Should show success message
   - Should auto-redirect to login after 3 seconds

5. **Login with New Password**
   - Use new password
   - Should successfully login

### Edge Cases to Test

- [ ] Token expires after 1 hour
- [ ] Token cannot be reused after successful reset
- [ ] Invalid token shows appropriate error
- [ ] Email enumeration prevention (same message for non-existent email)
- [ ] Password too short (< 8 chars) shows error
- [ ] Passwords don't match shows error
- [ ] Network errors are handled gracefully

## Database Schema

Reset token fields are added to Doctor model:

```javascript
{
  _id: ObjectId,
  name: String,
  email: String,
  password: String,  // bcrypt hash
  // ... other fields ...

  // Password Reset Fields
  resetPasswordToken: String,      // SHA-256 hash of reset token
  resetPasswordExpiry: Date,       // Expiry timestamp (1 hour)

  // Refresh Token Fields
  refreshToken: String,
  refreshTokenExpiry: Date
}
```

## Email Templates

### Reset Password Email

**Subject:** Password Reset Request - Smart Queue

**Template Features:**
- Professional gradient header
- Clear call-to-action button
- Alternative plain text link
- Security warning box
- Expiry notice (1 hour)
- Security recommendations
- Footer with year and branding

### Password Change Confirmation Email

**Subject:** Password Changed Successfully - Smart Queue

**Template Features:**
- Success indicator
- Timestamp of change
- What to do if authorized
- What to do if unauthorized
- Contact support information

## Security Best Practices

### Implemented

✅ **Token Hashing**: Tokens are hashed before database storage
✅ **Time-Limited**: 1 hour expiry on reset links
✅ **Single-Use**: Tokens cleared after use
✅ **Email Enumeration Prevention**: Consistent responses
✅ **Password Strength**: Minimum 8 characters
✅ **Confirmation Emails**: User notified of password changes
✅ **Rate Limiting**: Auth routes protected against brute force

### Recommended for Production

1. **HTTPS Only**: Ensure all traffic uses HTTPS
2. **Email Security**: Use authenticated SMTP with TLS
3. **Monitoring**: Log and alert on:
   - Multiple reset requests for same email
   - Failed reset attempts
   - Suspicious patterns
4. **Account Lockout**: Consider temporary lockout after multiple failed resets
5. **2FA Option**: Consider adding two-factor authentication
6. **Password History**: Prevent reusing recent passwords

## Troubleshooting

### Issue: No email received

**Possible Causes:**
- Email service not configured
- Incorrect SMTP credentials
- Email in spam folder
- Rate limiting

**Solution:**
1. Check backend logs for email errors
2. Verify `EMAIL_*` environment variables
3. Check spam/junk folder
4. In development, check console for reset URL

### Issue: "Invalid or expired reset token"

**Possible Causes:**
- Token expired (> 1 hour old)
- Token already used
- Token copied incorrectly

**Solution:**
1. Request new reset link
2. Use link within 1 hour
3. Ensure entire token is in URL

### Issue: Cannot reset password

**Possible Causes:**
- Password too short
- Network connectivity
- Token invalid

**Solution:**
1. Ensure password is at least 8 characters
2. Check browser console for errors
3. Request new reset link

## Monitoring and Logs

### Events Logged

**Forgot Password Request:**
```javascript
logger.info("Password reset email sent", { doctorId, email });
```

**Failed Email Send:**
```javascript
logger.error("Failed to send password reset email", { email, error });
```

**Successful Reset:**
```javascript
logger.info("Password reset successful", { doctorId });
```

**Non-existent Email:**
```javascript
logger.info("Password reset requested for non-existent email", { email });
```

### Metrics to Monitor

- Reset requests per hour
- Success rate of reset emails
- Time between request and reset
- Failed reset attempts
- Expired token usage attempts

## Future Enhancements

Potential improvements:

- [ ] SMS-based password reset option
- [ ] Security questions as alternative verification
- [ ] Password history to prevent reuse
- [ ] Account recovery with multiple verification methods
- [ ] Admin panel to view reset activity
- [ ] Customizable token expiry duration
- [ ] Email template customization via admin panel
- [ ] Multi-language support for emails

## References

- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html)
- [Node.js Crypto Documentation](https://nodejs.org/api/crypto.html)
- [Nodemailer Documentation](https://nodemailer.com/)
- [Password Reset Best Practices](https://www.troyhunt.com/everything-you-ever-wanted-to-know/)

## Summary

The password reset feature provides a secure, user-friendly way for doctors to recover their accounts. Key security measures include token hashing, time-limited access, email enumeration prevention, and confirmation emails. The implementation follows industry best practices and provides a seamless user experience.
