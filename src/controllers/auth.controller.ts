import UserRepository from '../repositories/user.repository';
import e, { Request, Response } from 'express';
import { User } from '../types/custom.interface';
import { logger } from '../utils/logger.util';
import { sendResponse } from '../utils/response.util';
import { statusCode, statusMessage } from '../constants';
import { validateLoginData } from '../utils/validation.util';
import {
  generateAccessToken,
  generateRefreshToken,
  getCurrentUser,
} from '../utils/auth.util';
import EmployeeRepository from '../repositories/employee.repository';
import QRRepository from '../repositories/qr.repository';

const userRepo = new UserRepository();
const employeeRepo = new EmployeeRepository();

/**
 * The `AuthController` class handles authentication-related operations such as login, logout,
 * and retrieving the current authenticated user. It provides methods to manage user sessions
 * and ensure secure access to protected resources.
 */
class AuthController {
  /**
   * Handles user login by validating credentials and generating access and refresh tokens.
   * @param {Request} req - The request object containing user credentials.
   * @param {Response} res - The response object to send the response.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if there is an issue with the request or authentication process.
   */
  async login(req: Request, res: Response): Promise<void> {
    try {
      const { email, password }: User = req.body;
      logger.info(
        `[controllers/auth.controller]-[AuthController.login]-Login attempt with email: ${email}`,
      );
      const user: User | null = await userRepo.getUserByEmail(email);
      if (!user) {
        logger.warn(
          `[controllers/auth.controller]-[AuthController.login]-User not found with email: ${email}`,
        );
        sendResponse(
          res,
          Number(statusCode.UNAUTHORIZED),
          statusMessage.UNAUTHORIZED,
          null,
        );
        return;
      }

      if (user.is_deleted) {
        logger.warn(
          `[controllers/auth.controller]-[AuthController.login]-User deleted because of being absent`,
        );
        sendResponse(
          res,
          Number(statusCode.FORBIDDEN),
          "You have been logged out from the Food Service due to repeated absences. For assistance, please contact the admin at portal.admin@invenger.com.",
          null,
        );
        return;
      }

      const message = await validateLoginData(
        { email, password } as User,
        user.password as string,
      );
      if (message !== 'Success') {
        logger.warn(
          `[controllers/auth.controller]-[AuthController.login]-Invalid password for email: ${email}`,
        );
        sendResponse(res, Number(statusCode.UNAUTHORIZED), message, null);
        return;
      }
      logger.info(
        `[controllers/auth.controller]-[AuthController.login]-User authenticated successfully with email: ${email}`,
      );
      const userDetails = {
        id: user.id,
        employee_id: user.employee_id,
        email: user.email,
        role: user.role,
        is_deleted: user.is_deleted,
      };
      const isAccessTokenAdded = await generateAccessToken(userDetails as User);
      logger.info(
        `[controllers/auth.controller]-[AuthController.login]-Access token generated successfully for email: ${email}`,
      );
      if (!isAccessTokenAdded) {
        logger.error(
          `[controllers/auth.controller]-[AuthController.login]-Failed to add access token for email: ${email}`,
        );
        sendResponse(
          res,
          Number(statusCode.INTERNAL_SERVER_ERROR),
          statusMessage.INTERNAL_SERVER_ERROR,
          null,
        );
        return;
      }
      const refreshToken = await generateRefreshToken(userDetails as User);
      logger.info(
        `[controllers/auth.controller]-[AuthController.login]-Refresh token generated successfully for email: ${email}`,
      );
      logger.info(
        `[controllers/auth.controller]-[AuthController.login]-Setting refresh token in cookie for email: ${email}`,
      );
      res
        .cookie('refresh_token', refreshToken, {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
          maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
        })
        .status(200)
        .json({
          success: true,
          message: 'Login successful',
          data: null,
        });
    } catch (error) {
      logger.error(
        `[controllers/auth.controller]-[AuthController.login]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  /**
   * Handles user logout by clearing the refresh token cookie.
   * @param {Request} req - The request object.
   * @param {Response} res - The response object to send the response.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if there is an issue with the logout process.
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        logger.warn(
          `[controllers/auth.controller]-[AuthController.logout]-No user found`,
        );
        sendResponse(
          res,
          Number(statusCode.UNAUTHORIZED),
          statusMessage.UNAUTHORIZED,
          null,
        );
        return;
      }
      logger.info(
        `[controllers/auth.controller]-[AuthController.logout]-Logging out user`,
      );
      res
        .clearCookie('refresh_token', {
          httpOnly: true,
          secure: true,
          sameSite: 'none',
        })
        .status(200)
        .json({
          success: true,
          message: 'Logout successful',
          data: null,
        });
      logger.info(
        `[controllers/auth.controller]-[AuthController.logout]-User logged out successfully`,
      );
      await userRepo.updateUser({ access_token: null, id: user.id } as User);
      logger.info(
        `[controllers/auth.controller]-[AuthController.logout]-Access token cleared for user ID: ${user.id}`,
      );
    } catch (error) {
      logger.error(
        `[controllers/auth.controller]-[AuthController.logout]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  /**
   * Retrieves the current authenticated user.
   * @param {Request} req - The request object.
   * @param {Response} res - The response object to send the response.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if there is an issue with retrieving the current user.
   */
  async getCurrentUser(req: Request, res: Response): Promise<void> {
    try {
      const qrRepo = new QRRepository();
      const user = await getCurrentUser(req);
      if (!user) {
        logger.warn(
          `[controllers/auth.controller]-[AuthController.getCurrentUser]-No user found`,
        );
        sendResponse(
          res,
          Number(statusCode.UNAUTHORIZED),
          statusMessage.UNAUTHORIZED,
          null,
        );
        return;
      }
      const employee = await employeeRepo.getEmployeeById(
        user.employee_id as string,
      );
      if (!employee) {
        logger.warn(
          `[controllers/auth.controller]-[AuthController.getCurrentUser]-Employee not found with ID: ${user.employee_id}`,
        );
        sendResponse(
          res,
          Number(statusCode.UNAUTHORIZED),
          statusMessage.UNAUTHORIZED,
          null,
        );
        return;
      }

      logger.info(
        `[controllers/auth.controller]-[AuthController.getCurrentUser]-Current user data: ${JSON.stringify(
          user,
        )}`,
      );
      let opt_in_date;
      if (employee.is_wfh) {
        opt_in_date =
          (await userRepo.getLatestOptOutTempDate(user.id))[0]
            ?.opt_out_time_from ?? null;

        logger.info(
          `[controllers/auth.controller]-[AuthController.getCurrentUser]-Fetching next opt-in date for wfh employees: ${JSON.stringify(
            opt_in_date,
          )}`,
        );
      } else {
        logger.info(
          `[controllers/auth.controller]-[AuthController.getCurrentUser]-No opt-in dates for regular employees...`,
        );
        opt_in_date = null;
      }

      sendResponse(res, Number(statusCode.SUCCESS), statusMessage.SUCCESS, {
        id: user.id,
        full_name: employee.full_name,
        time_to_food: employee.time_to_food,
        employee_id: user.employee_id,
        email: user.email,
        role: user.role,
        is_deleted: user.is_deleted,
        opt_status: user.opt_status,
        opt_out_date: user.opt_out_date,
        // opt_out_notif_status: user.opt_out_notif_status,
        first_name: employee.first_name,
        last_name: employee.last_name,
        employee_number: employee.employee_number,
        is_wfh: employee.is_wfh,
        wfh_next_opt_in: opt_in_date,
        counter: user.counter,
      });
    } catch (error) {
      logger.error(
        `[controllers/auth.controller]-[AuthController.getCurrentUser]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }
}

export default AuthController;
