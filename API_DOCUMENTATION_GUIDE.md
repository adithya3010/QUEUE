# API Documentation with Swagger

This document explains the API documentation setup for Smart Queue using Swagger/OpenAPI 3.0.

## Overview

Smart Queue now includes interactive API documentation powered by Swagger UI. This provides:

- **Interactive Testing**: Test API endpoints directly from the browser
- **Auto-generated Documentation**: Documentation generated from code annotations
- **Schema Validation**: Clear request/response schemas for all endpoints
- **Authentication Support**: Built-in support for cookie-based authentication

## Accessing the Documentation

### Development
```
http://localhost:5000/api-docs
```

### Production
```
https://your-domain.com/api-docs
```

## Implementation Details

### Packages Installed

```bash
npm install swagger-jsdoc swagger-ui-express
```

- **swagger-jsdoc**: Generates OpenAPI specification from JSDoc comments
- **swagger-ui-express**: Serves interactive Swagger UI

### Configuration (`backend/config/swagger.js`)

The Swagger configuration defines:

**API Information**:
- Title: Smart Queue API
- Version: 1.0.0
- Description and contact information

**Servers**:
- Development: `http://localhost:5000/api`
- Production: `https://api.smartqueue.com/api`

**Security Schemes**:
- cookieAuth: JWT token in httpOnly cookie

**Component Schemas**:
- Doctor: Doctor account information
- Patient: Patient/queue entry information
- Error: Standard error response format

**Tags**:
- Authentication: Doctor authentication endpoints
- Queue Management: Patient queue operations
- Doctors: Doctor profile management

### Server Setup (`backend/server.js`)

Swagger UI is mounted at `/api-docs`:

```javascript
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Smart Queue API Documentation'
}));
```

Configuration options:
- **customCss**: Hides the default Swagger topbar
- **customSiteTitle**: Sets page title

## Documented Endpoints

### Authentication Endpoints

#### POST /api/auth/signup
- **Summary**: Register a new doctor
- **Security**: None (public endpoint)
- **Request Body**: name, specialization, email, password
- **Responses**: 200 (success), 400 (validation error), 429 (rate limit), 500 (server error)

#### POST /api/auth/login
- **Summary**: Login as a doctor
- **Security**: None (public endpoint)
- **Request Body**: email, password
- **Responses**: 200 (success with cookies), 401 (invalid credentials), 429 (rate limit)
- **Sets Cookies**: token (15 min), refreshToken (7 days)

#### POST /api/auth/logout
- **Summary**: Logout and clear tokens
- **Security**: Requires cookie authentication
- **Responses**: 200 (success), 500 (server error)

#### POST /api/auth/refresh
- **Summary**: Refresh access token
- **Security**: Requires refresh token in cookie
- **Description**: Issues new access token and rotates refresh token
- **Responses**: 200 (success with new cookies), 401 (invalid token)

#### POST /api/auth/forgot-password
- **Summary**: Request password reset link
- **Security**: None (public endpoint)
- **Request Body**: email
- **Responses**: 200 (always, prevents enumeration), 400 (missing email), 429 (rate limit)
- **Security Note**: Returns same message for existing and non-existing emails

#### POST /api/auth/reset-password/{token}
- **Summary**: Reset password using token
- **Security**: None (token-based)
- **Parameters**: token (path parameter)
- **Request Body**: password (min 8 characters)
- **Responses**: 200 (success), 400 (invalid token or weak password), 429 (rate limit)

### Queue Management Endpoints

#### POST /api/queue/add
- **Summary**: Add new patient to queue
- **Security**: Requires cookie authentication
- **Request Body**: name, age, phoneNumber, doctor ID
- **Responses**: 201 (patient added), 400 (validation error), 401 (unauthorized)

#### GET /api/queue/{doctorId}
- **Summary**: Get waiting queue for a doctor
- **Security**: Requires cookie authentication
- **Parameters**: doctorId (path parameter)
- **Returns**: Array of waiting patients with estimated wait times
- **Responses**: 200 (queue data), 401 (unauthorized), 404 (doctor not found)

#### GET /api/queue/status/{uniqueLinkId}
- **Summary**: Get patient status by unique link
- **Security**: None (public endpoint)
- **Parameters**: uniqueLinkId (path parameter)
- **Description**: Allows patients to check their queue status
- **Responses**: 200 (patient status), 404 (invalid link)

## Using the Swagger UI

### Testing Endpoints

**1. Open Swagger UI**
Navigate to `http://localhost:5000/api-docs`

**2. Authenticate (for protected endpoints)**
- Click the "Authorize" button at the top
- Note: Cookie authentication is automatic after login
- The UI will show which endpoints require authentication

**3. Test an Endpoint**
- Click on an endpoint to expand it
- Click "Try it out"
- Fill in the required parameters
- Click "Execute"
- View the response below

### Example: Testing Login Flow

**Step 1: Register a Doctor**
```
POST /api/auth/signup
Body:
{
  "name": "Dr. Test",
  "specialization": "General",
  "email": "test@example.com",
  "password": "testpass123"
}
```

**Step 2: Login**
```
POST /api/auth/login
Body:
{
  "email": "test@example.com",
  "password": "testpass123"
}
```
Note: Cookies are automatically set by the browser

**Step 3: Add a Patient**
```
POST /api/queue/add
Body:
{
  "name": "John Patient",
  "age": 30,
  "phoneNumber": "1234567890",
  "doctorId": "<doctor_id_from_login_response>"
}
```

**Step 4: Get Queue**
```
GET /api/queue/{doctorId}
```

## JSDoc Annotation Format

Endpoints are documented using JSDoc comments with Swagger annotations:

```javascript
/**
 * @swagger
 * /api/endpoint:
 *   post:
 *     summary: Brief description
 *     description: Detailed description
 *     tags: [Tag Name]
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: paramName
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               field:
 *                 type: string
 *     responses:
 *       200:
 *         description: Success
 *       400:
 *         description: Error
 */
router.post("/endpoint", middleware, handler);
```

## Schema Definitions

### Doctor Schema
```javascript
{
  id: string,
  name: string,
  specialization: string,
  email: string,
  status: enum['Available', 'Not Available', 'Break'],
  avgConsultationTime: number
}
```

### Patient Schema
```javascript
{
  id: string,
  name: string,
  age: number,
  phoneNumber: string,
  tokenNumber: number,
  status: enum['waiting', 'completed', 'cancelled'],
  doctorId: string,
  uniqueLinkId: string,
  arrivalTime: datetime,
  completionTime: datetime,
  estimatedWaitTime: number,
  waitingAhead: number
}
```

### Error Schema
```javascript
{
  message: string,
  errors: [
    {
      field: string,
      message: string
    }
  ]
}
```

## Adding Documentation to New Endpoints

When adding new endpoints, follow this process:

**1. Add JSDoc Comment Above Route Handler**
```javascript
/**
 * @swagger
 * /api/your-endpoint:
 *   method:
 *     summary: Brief description
 *     tags: [Category]
 *     ...
 */
router.method("/path", handler);
```

**2. Document Request Parameters**
- Path parameters
- Query parameters
- Request body

**3. Document Responses**
- Success responses (200, 201, etc.)
- Error responses (400, 401, 404, 500, etc.)
- Include example responses

**4. Test Documentation**
- Start server: `npm run dev`
- Open: `http://localhost:5000/api-docs`
- Verify endpoint appears correctly
- Test the endpoint using Swagger UI

## Best Practices

### Documentation Quality

1. **Clear Summaries**: Write concise, descriptive summaries
2. **Detailed Descriptions**: Add context and usage notes
3. **Complete Schemas**: Document all fields with types and examples
4. **Error Scenarios**: Document all possible error responses
5. **Examples**: Provide realistic example values

### Security Documentation

1. **Mark Protected Endpoints**: Use `security: [{ cookieAuth: [] }]`
2. **Document Auth Requirements**: Specify which role/permission needed
3. **Explain Token Flow**: Document refresh token behavior

### Schema Consistency

1. **Reuse Schemas**: Use `$ref` to reference common schemas
2. **Consistent Naming**: Use camelCase for fields
3. **Validation Rules**: Document min/max, patterns, enums

## Health Check Endpoint

A health check endpoint is available for monitoring:

```
GET /health
Response: { status: 'ok', timestamp: '2024-01-15T10:30:00.000Z' }
```

## Customization

### Changing UI Theme

Modify `server.js`:

```javascript
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customCssUrl: 'https://your-custom-theme.css',
  customSiteTitle: 'Your Custom Title'
}));
```

### Adding More Servers

Edit `config/swagger.js`:

```javascript
servers: [
  {
    url: 'http://localhost:5000/api',
    description: 'Local development'
  },
  {
    url: 'https://staging.smartqueue.com/api',
    description: 'Staging environment'
  },
  {
    url: 'https://api.smartqueue.com/api',
    description: 'Production'
  }
]
```

### Adding Authentication Schemes

For additional auth methods:

```javascript
securitySchemes: {
  cookieAuth: {
    type: 'apiKey',
    in: 'cookie',
    name: 'token'
  },
  bearerAuth: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT'
  }
}
```

## Troubleshooting

### Documentation Not Appearing

**Issue**: Endpoint doesn't show in Swagger UI

**Solutions**:
1. Check JSDoc comment format
2. Verify file path in `swagger.js` apis array
3. Restart server to reload documentation
4. Check for syntax errors in JSDoc

### Schema Not Rendering

**Issue**: Schema shows as empty object

**Solutions**:
1. Verify schema definition in `config/swagger.js`
2. Check `$ref` path is correct
3. Ensure all required fields are defined

### Authentication Not Working

**Issue**: Can't test protected endpoints

**Solutions**:
1. Login using the login endpoint first
2. Cookies should be set automatically
3. Check browser developer tools > Application > Cookies
4. Verify `withCredentials: true` in axios config

### Swagger UI Not Loading

**Issue**: `/api-docs` returns 404 or error

**Solutions**:
1. Check `swagger-ui-express` is installed
2. Verify route is registered before other routes
3. Check for middleware conflicts
4. Look for errors in server console

## Production Considerations

### Security

1. **Rate Limiting**: Already implemented on auth endpoints
2. **HTTPS Only**: Use secure cookies in production
3. **Access Control**: Consider restricting `/api-docs` in production
4. **Sensitive Data**: Don't expose sensitive fields in examples

### Performance

1. **Caching**: Swagger spec is generated once at startup
2. **CDN**: Consider using CDN for Swagger UI assets
3. **Lazy Loading**: UI loads resources on demand

### Monitoring

Monitor API documentation access:
```javascript
app.use('/api-docs', (req, res, next) => {
  logger.info('API docs accessed', { ip: req.ip });
  next();
}, swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

## Future Enhancements

Potential improvements:

- [ ] Auto-generate Postman collection
- [ ] Add request/response examples for all endpoints
- [ ] Document WebSocket events
- [ ] Add API versioning support
- [ ] Generate client SDKs
- [ ] Add more detailed error code documentation
- [ ] Include rate limiting information
- [ ] Add request/response size limits documentation

## References

- [Swagger Official Documentation](https://swagger.io/docs/)
- [OpenAPI 3.0 Specification](https://swagger.io/specification/)
- [swagger-jsdoc GitHub](https://github.com/Surnet/swagger-jsdoc)
- [swagger-ui-express GitHub](https://github.com/scottie1984/swagger-ui-express)

## Summary

The API documentation system provides:
- ✅ Interactive testing interface
- ✅ Comprehensive endpoint documentation
- ✅ Schema definitions and validation
- ✅ Authentication support
- ✅ Easy maintenance with JSDoc annotations
- ✅ Professional presentation for API consumers

Access the documentation at `http://localhost:5000/api-docs` and explore all available endpoints!
