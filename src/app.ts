import express, { Application } from 'express';
import { morganMiddleware } from './utils/logger.util';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import indexRoutes from './routes/index.route';
import rateLimit from 'express-rate-limit';

const app: Application = express();
dotenv.config();

// Enable CORS with strict settings
app.use(
  cors({
    origin: [
      process.env.APP_URL || 'http://localhost:3000',
      'https://food-portal.vercel.app',
      'https://food-flow-eta.vercel.app',
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://localhost:5174',
      'http://localhost:5173',
      'https://food-portal.vercel.app',
      'https://food-flow-eta.vercel.app',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  }),
);

// Use Helmet with enhanced security configurations
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        connectSrc: ["'self'", 'http:', 'https:'],
        imgSrc: ["'self'", 'data:', 'http:', 'https:'],
        styleSrc: ["'self'", "'unsafe-inline'", 'http:', 'https:'],
        fontSrc: ["'self'", 'http:', 'https:'],
      },
    },
    xFrameOptions: {
      action: 'sameorigin', // Prevents clickjacking by disallowing framing
    },
    strictTransportSecurity: {
      maxAge: 31536000, // 1 year in seconds
      includeSubDomains: true, // Apply to all subdomains
      preload: true, // Allow preloading of HSTS
    },
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin', // Restrict referrer information
    },
    xContentTypeOptions: true, // Prevent MIME type sniffing
  }),
);

// Disable X-Powered-By header
app.disable('x-powered-by');

// Limit request body size
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Use secure cookies
app.use(cookieParser(process.env.COOKIE_SECRET));

// Log requests
app.use(morganMiddleware);

// Rate limiting to prevent brute force and DDoS attacks
const limiter = rateLimit({
  windowMs: 45 * 60 * 1000, // 15 minutes
  max: 1000000000000000000000000000, // Limit each IP to 100 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});
//app.use(limiter);

// Define routes
app.use('/api', indexRoutes);

// Health check route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the API',
    data: null,
  });
});

export default app;
