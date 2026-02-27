const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const logger = require('./utils/logger');
const { requestLogger, errorLogger } = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const { initScheduleCron } = require('./cron/scheduleCron');
const { initReminderCron } = require('./cron/reminderCron');
const queueRoutes       = require('./routes/queueRoutes');
const agentRoutes       = require('./routes/agentRoutes');
const orgRoutes         = require('./routes/orgRoutes');
const authRoutes        = require('./routes/authRoutes');
const kioskRoutes       = require('./routes/kioskRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const apiV2Routes        = require('./routes/apiV2Routes');
const sentry = require('./config/sentry');

dotenv.config();
connectDB();

// Initialize automated scheduled jobs
if (process.env.NODE_ENV !== 'test') {
  initScheduleCron();
  initReminderCron();
}

const app = express();

// Initialize Sentry (must be before any other middleware)
sentry.initSentry(app);

// Sentry request handler (must be first middleware)
app.use(sentry.requestHandler());

// Sentry tracing handler
app.use(sentry.tracingHandler());

// CORS Configuration (must come before other middleware)
const corsOrigin = process.env.NODE_ENV === 'production'
  ? process.env.FRONTEND_URL
  : 'https://www.flow-q.online';

app.use(cors({
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  // Explicitly allowing common headers to prevent Axios Network Errors on preflight
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key", "Idempotency-Key", "Accept", "X-Requested-With", "Cache-Control", "sentry-trace", "baggage", "origin"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// API Documentation (before helmet to allow iframe embedding)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Smart Queue API Documentation'
}));

// Security Middleware (after API Docs)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: {
    directives: {
      ...helmet.contentSecurityPolicy.getDefaultDirectives(),
      "frame-ancestors": ["'self'", "http://localhost:3000", process.env.FRONTEND_URL].filter(Boolean)
    }
  },
  xFrameOptions: false
}));
app.use(mongoSanitize());
app.use(cookieParser());
app.use(express.json());

// Request logging middleware
app.use(requestLogger);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── Core routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/org',          orgRoutes);
app.use('/api/agents',       agentRoutes);
app.use('/api/queue',        queueRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/kiosk',        kioskRoutes);

// ── B2B External API ──────────────────────────────────────────────────────────
app.use('/api/v2', apiV2Routes);

// Error handling middleware (must be after all routes)
app.use(notFoundHandler);
app.use(errorLogger);

// Sentry error handler (must be before other error handlers)
app.use(sentry.errorHandler());

app.use(errorHandler);

const server = http.createServer(app);

// SOCKET IO
const { Server } = require('socket.io');
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    methods: ["GET", "POST", "PUT"],
    credentials: true
  }
});


global.io = io;
require("./socket/queueSocket")(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server started successfully`, {
    port: PORT,
    environment: process.env.NODE_ENV || 'development',
    nodeVersion: process.version
  });
});
