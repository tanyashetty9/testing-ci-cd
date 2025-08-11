import https from 'https';
import http from 'http';
import fs from 'fs';
import dotenv from 'dotenv';
import app from './app';
import { logger } from './utils/logger.util';
import { sequelize, createDatabaseIfNotExist } from './config/postgres.config';
import transporter from './config/mail.config';
import startCronJobs from './config/cron.config';

dotenv.config();

const isProduction = process.env.NODE_ENV === 'production';

const HTTPS_PORT = 443;
const HTTP_DEV_PORT = process.env.PORT;

const startServer = async (): Promise<void> => {
  try {
    logger.info('[startServer] Starting initialization....');

    await createDatabaseIfNotExist();
    logger.info('[startServer] PostgreSQL database checked successfully.');

    await sequelize.authenticate();
    logger.info(
      '[startServer] PostgreSQL connection established successfully.',
    );

    await transporter.verify(error => {
      if (error as Error) {
        logger.error(`[SMTP] Error verifying SMTP configuration: ${error}`);
      } else {
        logger.info('[SMTP] SMTP configuration verified successfully...');
      }
    });

    await startCronJobs();

    if (isProduction) {
      const SSL_OPTIONS = {
        key: fs.readFileSync(
          '/etc/letsencrypt/live/food-portal.invenger.in/privkey.pem',
        ),
        cert: fs.readFileSync(
          '/etc/letsencrypt/live/food-portal.invenger.in/fullchain.pem',
        ),
      };

      // Start HTTPS
      https.createServer(SSL_OPTIONS, app).listen(HTTPS_PORT, () => {
        logger.info(
          `[startServer] ✅ HTTPS server is running on port ${HTTPS_PORT}`,
        );
      });

      // // HTTP → HTTPS redirect
      // http
      //   .createServer((req, res) => {
      //     res.writeHead(301, {
      //       Location: `https://${req.headers.host}${req.url}`,
      //     });
      //     res.end();
      //   })
      //   .listen(HTTP_PORT, () => {
      //     logger.info('[startServer] 🔁 Redirect HTTP to HTTPS on port 80');
      //   });
    } else {
      // Local HTTP only
      http.createServer(app).listen(HTTP_DEV_PORT, () => {
        logger.info(
          `[startServer] 🧪 Local HTTP server running on port ${HTTP_DEV_PORT}`,
        );
      });
    }
  } catch (error) {
    logger.error(
      '[startServer] ❌ Error starting the server:',
      error as Record<string, unknown>,
    );
  }
};

startServer().catch(error => {
  logger.error(
    '[startServer] ❌ Unhandled error:',
    error as Record<string, unknown>,
  );
});
