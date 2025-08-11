import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.util';

dotenv.config();

logger.info(
  '[/src/config/mail.config]-[dotenv.config()]-Loading environment variables for mail configuration',
);
/**
 * Configuration object for the mail service.
 *
 * This object retrieves its values from environment variables to configure
 * the SMTP (Simple Mail Transfer Protocol) settings for sending emails.
 *
 * @property {string | undefined} host - The SMTP server hostname or IP address.
 *   Retrieved from the `SMTP_HOST` environment variable.
 *
 * @property {number} port - The port number to connect to the SMTP server.
 *   Defaults to 587 if `SMTP_PORT` is not defined. Parsed as an integer.
 *
 * @property {boolean} secure - Indicates whether to use a secure connection (TLS).
 *   Retrieved from the `SMTP_SECURE` environment variable and converted to a boolean.
 *
 * @property {Object} auth - Authentication credentials for the SMTP server.
 *
 * @property {string | undefined} auth.user - The username for SMTP authentication.
 *   Retrieved from the `SMTP_USER` environment variable.
 *
 * @property {string | undefined} auth.pass - The password for SMTP authentication.
 *   Retrieved from the `SMTP_PASS` environment variable.
 */
const mailConfig = {
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587', 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
};

if (
  !mailConfig.host ||
  !mailConfig.port ||
  !mailConfig.auth.user ||
  !mailConfig.auth.pass
) {
  logger.error(
    '[/src/config/mail.config]-[if(!mailConfig.host || !mailConfig.port || !mailConfig.auth.user || !mailConfig.auth.pass)]-Mail configuration environment variables are not properly defined',
  );
  throw new Error(
    'Mail configuration environment variables are not properly defined',
  );
}
logger.info(
  '[/src/config/mail.config]-[mailConfig]-Mail configuration loaded successfully',
);
const transporter = nodemailer.createTransport(mailConfig);
logger.info(
  '[/src/config/mail.config]-[transporter]-Nodemailer transporter created successfully',
);

export default transporter;
