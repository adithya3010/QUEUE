# Sentry Error Tracking Setup Guide

This guide explains how to set up Sentry error tracking for the Smart Queue application.

## What is Sentry?

Sentry is a real-time error tracking and monitoring platform that helps you:
- Track and diagnose production errors
- Monitor application performance
- View user sessions with errors
- Get detailed stack traces and context
- Set up alerts for critical issues

## Setup Instructions

### 1. Create a Sentry Account

1. Go to [https://sentry.io](https://sentry.io) and sign up for a free account
2. Create a new organization (or use an existing one)

### 2. Create Projects

You need to create **two separate projects** in Sentry:

#### Backend Project (Node.js)
1. Click "Create Project"
2. Select **Node.js** as the platform
3. Name it: `smart-queue-backend` (or your preferred name)
4. Click "Create Project"
5. **Copy the DSN** - it looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

#### Frontend Project (React)
1. Click "Create Project" again
2. Select **React** as the platform
3. Name it: `smart-queue-frontend` (or your preferred name)
4. Click "Create Project"
5. **Copy the DSN** - it looks like: `https://xxxxx@xxxxx.ingest.sentry.io/xxxxx`

### 3. Configure Environment Variables

#### Backend Configuration

Edit your `backend/.env` file and add:

```bash
# Sentry Error Tracking (Optional)
# Get your DSN from https://sentry.io after creating a project
# Leave empty to disable Sentry
SENTRY_DSN=https://your-backend-dsn@xxxxx.ingest.sentry.io/xxxxx
```

#### Frontend Configuration

Edit your `frontend/vite-project/.env` file and add:

```bash
# Sentry Error Tracking (Optional)
# Get your frontend DSN from https://sentry.io after creating a project
# Leave empty to disable Sentry
VITE_SENTRY_DSN=https://your-frontend-dsn@xxxxx.ingest.sentry.io/xxxxx
```

**Note:** The backend and frontend should have **different DSN values** from their respective Sentry projects.

### 4. Verify Installation

The necessary packages are already installed:
- Backend: `@sentry/node` and `@sentry/profiling-node`
- Frontend: `@sentry/react`

## How It Works

### Backend Error Tracking

The backend automatically captures:
- **Server errors** (5xx status codes)
- **Unhandled exceptions**
- **Database errors**
- **API request traces** (performance monitoring)

Features:
- Filters out sensitive data (passwords, tokens, cookies)
- Includes request context (method, URL, headers)
- Performance tracing at 10% sample rate in production
- Only enabled when `SENTRY_DSN` is configured

### Frontend Error Tracking

The frontend automatically captures:
- **JavaScript errors and exceptions**
- **Unhandled promise rejections**
- **React component errors**
- **API call failures**
- **Session replays** (10% of sessions, 100% of error sessions)

Features:
- Filters out sensitive data (passwords, tokens)
- User context tracking (after login)
- Performance monitoring
- Session replay for debugging
- Only enabled when `VITE_SENTRY_DSN` is configured

## User Context Tracking

When a doctor logs in, their information is automatically attached to Sentry events:
```javascript
// Automatically called on login
setUser({
  id: doctor.id,
  email: doctor.email,
  username: doctor.name
});

// Automatically cleared on logout
setUser(null);
```

This helps you identify which users are experiencing issues.

## Manual Error Tracking

### Backend

You can manually capture errors in your backend code:

```javascript
const { captureException, captureMessage } = require('../config/sentry');

// Capture an exception
try {
  // your code
} catch (error) {
  captureException(error, {
    extra: {
      userId: user.id,
      context: 'payment processing'
    }
  });
}

// Capture a message
captureMessage('Something important happened', 'info', {
  userId: user.id,
  action: 'critical_operation'
});
```

### Frontend

You can manually capture errors in your frontend code:

```javascript
import { captureException, captureMessage, addBreadcrumb } from '../utils/sentry';

// Capture an exception
try {
  // your code
} catch (error) {
  captureException(error, {
    extra: {
      userId: localStorage.getItem('doctorId'),
      context: 'file upload'
    }
  });
}

// Capture a message
captureMessage('User performed critical action', 'info', {
  action: 'data_export'
});

// Add debugging breadcrumbs
addBreadcrumb('User clicked export button', {
  category: 'user-action',
  level: 'info'
});
```

## Testing Sentry Integration

### Backend Test

Add this temporary test endpoint to `backend/routes/queueRoutes.js`:

```javascript
// TEST ONLY - Remove after verifying Sentry works
router.get('/test-sentry', (req, res) => {
  throw new Error('Test error for Sentry - Backend');
});
```

Then visit: `http://localhost:5000/api/queue/test-sentry`

Check your Sentry dashboard - you should see the error appear within seconds.

### Frontend Test

Add this temporary button to any component:

```javascript
// TEST ONLY - Remove after verifying Sentry works
<button onClick={() => { throw new Error('Test error for Sentry - Frontend'); }}>
  Test Sentry
</button>
```

Click the button and check your Sentry dashboard.

## Viewing Errors in Sentry

1. Log in to [sentry.io](https://sentry.io)
2. Select your project (backend or frontend)
3. Click on **Issues** to see all errors
4. Click on any issue to see:
   - Stack trace
   - Request details
   - User information
   - Breadcrumbs (event history)
   - Similar errors

## Performance Monitoring

Sentry automatically tracks:
- API endpoint response times
- Database query performance
- Frontend page load times
- User interactions

View performance data:
1. Go to your Sentry project
2. Click **Performance** in the sidebar
3. View transaction summaries and trends

## Best Practices

1. **Don't log sensitive data**: The configuration already filters passwords and tokens
2. **Use appropriate log levels**:
   - `error` - Critical errors that need immediate attention
   - `warning` - Issues that should be reviewed
   - `info` - Important events
3. **Add context**: Include relevant data when manually capturing errors
4. **Set up alerts**: Configure Sentry to notify your team of critical errors
5. **Review regularly**: Check Sentry dashboard weekly to catch trends

## Disabling Sentry

To disable Sentry tracking:

**Backend**: Remove or leave empty the `SENTRY_DSN` variable in `backend/.env`
```bash
SENTRY_DSN=
```

**Frontend**: Remove or leave empty the `VITE_SENTRY_DSN` variable in `frontend/vite-project/.env`
```bash
VITE_SENTRY_DSN=
```

The application will work normally without Sentry - all Sentry calls are safely ignored when not configured.

## Cost Considerations

Sentry's free tier includes:
- 5,000 errors/month
- 10,000 performance transactions/month
- 50 replays/month
- 1 team member

This is usually sufficient for small to medium projects. Monitor your usage in the Sentry dashboard.

## Troubleshooting

### Errors not appearing in Sentry

1. **Check DSN configuration**: Ensure the DSN is correctly set in `.env` files
2. **Restart servers**: Restart both backend and frontend after updating `.env`
3. **Check console**: Look for "Sentry initialized" message in console logs
4. **Verify test environment**: Sentry is automatically disabled in test environment

### Too many errors being logged

1. Add problematic errors to `ignoreErrors` list in:
   - Backend: `backend/config/sentry.js`
   - Frontend: `frontend/vite-project/src/utils/sentry.js`

### Performance impact

- Sentry has minimal performance impact
- Sample rates are configured at 10% in production
- You can adjust sample rates in the configuration files

## Additional Resources

- [Sentry Node.js Documentation](https://docs.sentry.io/platforms/node/)
- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)

## Support

If you encounter issues with Sentry integration:
1. Check the [Sentry Documentation](https://docs.sentry.io/)
2. Review error logs in your application
3. Verify environment variables are correctly set
