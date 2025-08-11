import { NextFunction, Request, Response } from 'express';
import { sendResponse } from '../utils/response.util';
import { statusCode, statusMessage } from '../constants';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.util';
import { generateAccessToken, getCurrentUser } from '../utils/auth.util';
import moment from 'moment';

dotenv.config();

/**
 * Middleware to check if the user is authenticated.
 *
 * This middleware verifies the presence and validity of the refresh token and access token
 * in the request. It ensures that the user is authenticated and authorized to access
 * protected routes. If the tokens are invalid, expired, or missing, an appropriate
 * response is sent back to the client.
 *
 * @param req - The HTTP request object.
 * @param res - The HTTP response object.
 * @param next - The next middleware function in the request-response cycle.
 *
 * @throws {Error} If an unexpected error occurs during authentication.
 *
 * Workflow:
 * 1. Logs the start of the authentication process.
 * 2. Checks for the presence of the refresh token in cookies.
 * 3. Verifies the refresh token using the secret key.
 * 4. Retrieves the current user from the database.
 * 5. Ensures the user is not marked as deleted.
 * 6. Verifies the access token using the secret key.
 * 7. Checks the expiration dates of the access and refresh tokens.
 * 8. Generates a new access token if the access token is expired but the refresh token is still valid.
 * 9. Sends an unauthorized response if the refresh token is expired.
 * 10. Proceeds to the next middleware if the user is authenticated successfully.
 *
 * Response Codes:
 * - 401 UNAUTHORIZED: If the refresh token or access token is invalid, expired, or missing.
 * - 500 INTERNAL_SERVER_ERROR: If an unexpected error occurs during the process.
 */
export const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    logger.info(
      `[middlewares/auth.middleware]-[isAuthenticated]-Checking authentication for user`,
    );
    const refreshToken = req.cookies.refresh_token;
    if (!refreshToken) {
      sendResponse(
        res,
        statusCode.UNAUTHORIZED,
        statusMessage.UNAUTHORIZED,
        null,
      );
      return;
    }
    logger.info(
      `[middlewares/auth.middleware]-[isAuthenticated]-Refresh token found`,
    );
    const decoded: any = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET as string,
    );
    if (!decoded) {
      sendResponse(
        res,
        statusCode.UNAUTHORIZED,
        statusMessage.UNAUTHORIZED,
        null,
      );
      return;
    }
    logger.info(
      `[middlewares/auth.middleware]-[isAuthenticated]-User authenticated successfully`,
    );
    const user = await getCurrentUser(req);
    if (!user) {
      sendResponse(
        res,
        statusCode.UNAUTHORIZED,
        statusMessage.UNAUTHORIZED,
        null,
      );
      return;
    }
    logger.info(
      `[middlewares/auth.middleware]-[isAuthenticated]-User found in database`,
    );

    if (user.is_deleted) {
      sendResponse(
        res,
        statusCode.UNAUTHORIZED,
        statusMessage.UNAUTHORIZED,
        null,
      );
      return;
    }

    const accessTokenDecoded = jwt.verify(
      user.access_token as string,
      process.env.JWT_SECRET as string,
    );

    logger.info(
      `[middlewares/auth.middleware]-[isAuthenticated]-Access token found`,
    );
    if (!accessTokenDecoded) {
      sendResponse(
        res,
        statusCode.UNAUTHORIZED,
        statusMessage.UNAUTHORIZED,
        null,
      );
      return;
    }
    logger.info(
      `[middlewares/auth.middleware]-[isAuthenticated]-Access token verified successfully`,
    );

    const currentDate = moment().unix();
    logger.info(
      `[middlewares/auth.middleware]-[isAuthenticated]-Current date: ${currentDate}`,
    );
    const refreshTokenExpiryDate = decoded.exp;
    logger.info(
      `[middlewares/auth.middleware]-[isAuthenticated]-Refresh token expiry date: ${refreshTokenExpiryDate}`,
    );
    let accessTokenExpiryDate: number = 0;
    logger.info(
      `[middlewares/auth.middleware]-[isAuthenticated]-Access token expiry date: ${accessTokenExpiryDate}`,
    );
    if (typeof accessTokenDecoded === 'object' && 'exp' in accessTokenDecoded) {
      logger.info(
        `[middlewares/auth.middleware]-[isAuthenticated]-Access token decoded successfully`,
      );
      accessTokenExpiryDate = accessTokenDecoded.exp as number;
      logger.info(
        `[middlewares/auth.middleware]-[isAuthenticated]-Access token expiry date: ${accessTokenExpiryDate}`,
      );
    } else {
      logger.error(
        `[middlewares/auth.middleware]-[isAuthenticated]-Access token decoding failed`,
      );
      sendResponse(
        res,
        statusCode.UNAUTHORIZED,
        statusMessage.UNAUTHORIZED,
        null,
      );
      return;
    }

    if (
      currentDate > accessTokenExpiryDate &&
      currentDate < refreshTokenExpiryDate
    ) {
      logger.info(
        `[middlewares/auth.middleware]-[isAuthenticated]-Access token expired, generating new access token`,
      );
      await generateAccessToken(user as any);
    } else if (currentDate > refreshTokenExpiryDate) {
      logger.error(
        `[middlewares/auth.middleware]-[isAuthenticated]-Refresh token expired`,
      );
      sendResponse(
        res,
        statusCode.UNAUTHORIZED,
        statusMessage.UNAUTHORIZED,
        null,
      );
      return;
    }
    logger.info(
      `[middlewares/auth.middleware]-[isAuthenticated]-User authenticated successfully`,
    );
    next();
  } catch (error) {
    console.error(
      `[middlewares/auth.middleware]-[isAuthenticated]-Error: ${error}`,
    );
    sendResponse(
      res,
      statusCode.INTERNAL_SERVER_ERROR,
      statusMessage.INTERNAL_SERVER_ERROR,
      null,
    );
  }
};

/**
 * Middleware to restrict access to specific roles.
 *
 * This function checks if the current user has one of the specified roles
 * to access a particular route. If the user is not authenticated or does
 * not have the required role, an appropriate response is sent, and the
 * request is terminated.
 *
 * @param {...string[]} roles - The list of roles that are allowed to access the route.
 * @returns {Function} An Express middleware function that validates the user's role.
 *
 * @example
 * // Allow access only to users with 'admin' or 'editor' roles
 * app.use('/admin', rolesToAccess('admin', 'editor'));
 *
 * @throws {Error} If the user is not authenticated or does not have the required role.
 */
export const rolesToAccess = (...roles: string[]) => {
  logger.info(
    `[middlewares/auth.middleware]-[rolesToAccess]-Checking user roles`,
  );
  return async (req: Request, res: Response, next: NextFunction) => {
    logger.info(
      `[middlewares/auth.middleware]-[rolesToAccess]-Checking user roles`,
    );
    const user = await getCurrentUser(req);
    if (!user) {
      sendResponse(
        res,
        statusCode.UNAUTHORIZED,
        statusMessage.UNAUTHORIZED,
        null,
      );
      return;
    }
    logger.info(
      `[middlewares/auth.middleware]-[rolesToAccess]-User found in database`,
    );
    if (!user) {
      logger.error(
        `[middlewares/auth.middleware]-[rolesToAccess]-User not found`,
      );
      sendResponse(
        res,
        statusCode.UNAUTHORIZED,
        statusMessage.UNAUTHORIZED,
        null,
      );
      return;
    }
    if (!roles.includes(user.role as string)) {
      logger.error(
        `[middlewares/auth.middleware]-[rolesToAccess]-User does not have access to this route`,
      );
      sendResponse(res, statusCode.FORBIDDEN, statusMessage.FORBIDDEN, null);
      return;
    }
    next();
  };
};
