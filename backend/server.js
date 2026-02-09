const express = require('express');
const http = require('http');
const cors = require('cors');
const dotenv = require('dotenv');
const swaggerUi = require('swagger-ui-express');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const logger = require('./utils/logger');
const { requestLogger, errorLogger } = require('./middleware/requestLogger');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');
const queueRoutes = require('./routes/queueRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const authRoutes = require('./routes/authRoutes');
const sentry = require('./config/sentry');
const swaggerSpec = require('./config/swagger');

dotenv.config();
connectDB();

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
  : 'http://localhost:5173';

app.use(cors({
  origin: corsOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Security Middleware (after CORS)
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(mongoSanitize());
app.use(cookieParser());
app.use(express.json());

// Request logging middleware
app.use(requestLogger);

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Smart Queue API Documentation'
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/doctors', doctorRoutes);
app.use('/api/queue', queueRoutes);

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
