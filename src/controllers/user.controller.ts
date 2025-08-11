import moment from 'moment';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import UserRepository from '../repositories/user.repository';
import { OptOutData, User } from '../types/custom.interface';
import { logger } from '../utils/logger.util';
import { sendResponse } from '../utils/response.util';
import { validateUserData } from '../utils/validation.util';
import { statusCode, statusMessage } from '../constants';
import { sendmail, writeMailTemplate } from '../utils/mail.util';
import { decryptData, encryptData } from '../utils/encryption.util';
import { getCurrentUser } from '../utils/auth.util';
import EmployeeRepository from '../repositories/employee.repository';
import { parseEnvTime } from '../utils/job.util';
import path from 'path';

const userRepo = new UserRepository();
const employeeRepo = new EmployeeRepository();

// Helper function handles user-related operations
const generateAndSaveLink = async (id: string) => {
  const hash = await encryptData(id);
  const link: string = hash;
  const linkExpiry: Date = moment().add(24, 'hours').toDate();
  const user = await userRepo.addLinkToUser({ id, link, linkExpiry } as User);
  if (!user) {
    logger.error(
      `[controllers/user.controller]-[generateAndSaveLink]-User not found with ID: ${id}`,
    );
    throw new Error('User not found');
  }
  logger.info(
    `[controllers/user.controller]-[generateAndSaveLink]-Link generated successfully for user with ID: ${id}`,
  );
  return link;
};

/**
 * @class UserController
 * @description Controller class for managing user-related operations in the system.
 *
 * @method activateUser
 * @description Activates a user in the system by validating user data, generating an activation link,
 *              and sending an invitation email.
 * @param {Request} req - The request object containing user data.
 * @param {Response} res - The response object to send the response.
 * @returns {Promise<void>} - A promise that resolves to void.
 * @throws {Error} - Throws an error if there is an issue with the request or user activation.
 *
 * @method updatePassword
 * @description Updates the password for a user by validating user data, decrypting the link,
 *              and updating the user's password in the database.
 * @param {Request} req - The request object containing user data.
 * @param {Response} res - The response object to send the response.
 * @returns {Promise<void>} - A promise that resolves to void.
 * @throws {Error} - Throws an error if there is an issue with the request or password update.
 *
 * @method optOutForPeriod
 * @description Opts out a user for a specific period by validating user data and updating the user's
 *              opt-out period in the database.
 * @param {Request} req - The request object containing user data.
 * @param {Response} res - The response object to send the response.
 * @returns {Promise<void>} - A promise that resolves to void.
 * @throws {Error} - Throws an error if there is an issue with the request or opt-out process.
 *
 * @method optOutPermanent
 * @description Permanently opts out a user by validating the current user and updating the user's
 *              status in the database.
 * @param {Request} req - The request object containing user data.
 * @param {Response} res - The response object to send the response.
 * @returns {Promise<void>} - A promise that resolves to void.
 * @throws {Error} - Throws an error if there is an issue with the request or opt-out process.
 */
class UserController {
  /*
   * @description Activates a user in the system.
   * @param {Request} req - The request object containing user data.
   * @param {Response} res - The response object to send the response.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if there is an issue with the request or user activation.
   */
  async activateUser(req: Request, res: Response): Promise<void> {
    try {
      const { email, flag }: User = req.body;
      let htmlTemplate: string;
      let mailOptions: {
        from: string;
        to: string;
        subject: string;
        html: string;
      };
      const validationError = await validateUserData({ email } as User);
      if (validationError !== 'Success') {
        logger.error(
          `[controllers/user.controller]-[UserController.activateUser]-Validation error: ${validationError}`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          validationError,
          null,
        );
        return;
      }
      logger.info(
        `[controllers/user.controller]-[UserController.activateUser]- Activating user for email: ${email}`,
      );
      const user: User = (await userRepo.getUserByEmail(email)) as User;
      logger.info(
        `[controllers/user.controller]-[UserController.activateUser]- User data`,
      );

      if (!user || user.is_deleted) {
        logger.error(
          `[controllers/user.controller]-[UserController.activateUser]-User not found`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'User not found',
          null,
        );
        return;
      }

      if (flag === 'set-pass' && user.is_active) {
        logger.warn(
          `[controllers/user.controller]-[UserController.activateUser ]-User is already active: ${email}`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'User is already active',
          null,
        );
        return;
      }

      const link = await generateAndSaveLink(user.id as string);
      if (!link) {
        logger.error(
          `[controllers/user.controller]-[UserController.activateUser]-Link generation failed`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'Link generation failed',
          null,
        );
        return;
      }
      logger.info(
        `[controllers/user.controller]-[UserController.activateUser]- Link genrerated`,
      );
      if (flag === 'reset-pass') {
        logger.info(
          `[controllers/user.controller]-[UserController.activateUser]- Resetting password for user: ${email}`,
        );
        const resetPasswordLink = `${process.env.APP_URL}/user/reset-password/${link}`;
        logger.info(
          `[controllers/user.controller]-[UserController.activateUser]- Reset password link: ${resetPasswordLink}`,
        );
        htmlTemplate = await writeMailTemplate('RESET_PASSWORD', {
          username: user.email as string,
          link: resetPasswordLink,
        });
        logger.info(
          `[controllers/user.controller]-[UserController.activateUser]- HTML Template: ${htmlTemplate}`,
        );
        mailOptions = {
          from: process.env.EMAIL_USERNAME as string,
          to: email as string,
          subject: 'Reset Password',
          html: htmlTemplate,
        };
        logger.info(
          `[controllers/user.controller]-[UserController.activateUser]- Sending mail`,
        );
        await sendmail(mailOptions);
        logger.info(
          `[controllers/user.controller]-[UserController.activateUser]- Mail sent successfully`,
        );
        return sendResponse(
          res,
          Number(statusCode.SUCCESS),
          'User Password Reset Link Sent Successfully',
          null,
        );
      }
      const invitationLink = `${process.env.APP_URL}/user/activate/${link}`;
      logger.info(
        `[controllers/user.controller]-[UserController.activateUser]- Invitation link: ${invitationLink}`,
      );
      htmlTemplate = await writeMailTemplate('INVITE_USER', {
        username: user.email as string,
        link: invitationLink,
      });
      logger.info(
        `[controllers/user.controller]-[UserController.activateUser]- HTML Template: ${htmlTemplate}`,
      );
      mailOptions = {
        from: process.env.EMAIL_USERNAME as string,
        to: email as string,
        subject: 'Invitation to Join',
        html: htmlTemplate,
      };
      logger.info(
        `[controllers/user.controller]-[UserController.activateUser]- Sending mail`,
      );
      await sendmail(mailOptions);
      logger.info(
        `[controllers/user.controller]-[UserController.activateUser]- Mail sent successfully`,
      );
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        'User Added Successfully',
        null,
      );
    } catch (error) {
      logger.error(
        `[controllers/user.controller]-[UserController.activateUser]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  /*
   * @description Registers a new user in the system.
   * @param {Request} req - The request object containing user data.
   * @param {Response} res - The response object to send the response.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if there is an issue with the request or user creation.
   */
  async updatePassword(req: Request, res: Response): Promise<void> {
    logger.info(
      `[controllers/user.controller]-[UserController.updatePassword]-Registering user`,
    );
    try {
      logger.info(
        `[controllers/user.controller]-[UserController.updatePassword]- Registering user`,
      );
      const { link, password, confirmPassword }: User = req.body;

      const validationError = await validateUserData({
        link,
        password,
        confirmPassword,
      } as User);
      if (validationError !== 'Success') {
        logger.error(
          `[controllers/user.controller]-[UserController.updatePassword]-Validation error: ${validationError}`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          validationError,
          null,
        );
        return;
      }
      logger.info(
        `[controllers/user.controller]-[UserController.updatePassword]- Validating user data`,
      );
      const hashedPassword = await bcrypt.hash(password as string, 10);
      const id: string = await decryptData(link || '');
      const user = await userRepo.updateUser({
        id,
        password: hashedPassword,
        is_active: true,
      } as User);
      logger.info(
        `[controllers/user.controller]-[UserController.updatePassword]-User data: ${JSON.stringify(user)}`,
      );

      if (!user) {
        logger.error(
          `[controllers/user.controller]-[UserController.updatePassword]-User doesn't exists`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'User already exists',
          null,
        );
        return;
      }
      logger.info(
        `[controllers/user.controller]-[UserController.updatePassword]-User created successfully`,
      );
      sendResponse(
        res,
        Number(statusCode.CREATED),
        statusMessage.CREATED,
        user,
      );
    } catch (error) {
      logger.error(
        `[controllers/user.controller]-[UserController.updatePassword]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  /*
   * @description Opts out a user for a specific period.
   * @param {Request}
   * req - The request object containing user data.
   * @param {Response}
   * res - The response object to send the response.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if there is an issue with the request or user opt-out.
   */
  async optOutForPeriod(req: Request, res: Response): Promise<void> {
    try {
      const { userData } = req.body;
      const currentUserData = await getCurrentUser(req);
      const id = currentUserData?.id;

      if (!id) {
        logger.error(
          `[controllers/user.controller]-[UserController.optOutForPeriod]-User not found`,
        );
        sendResponse(
          res,
          Number(statusCode.UNAUTHORIZED),
          statusMessage.UNAUTHORIZED,
          null,
        );
        return;
      }

      if (!userData || !Array.isArray(userData) || userData.length === 0) {
        logger.error(
          `[controllers/user.controller]-[UserController.optOutForPeriod]-No opt-out date ranges provided`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'No opt-out date ranges provided',
          null,
        );
        return;
      }

      const optStatus = currentUserData.opt_status;
      logger.info(
        `[controllers/user.controller]-[UserController.optOutForPeriod]-Checking opt-out status: ${optStatus}`,
      );

      if (optStatus === 'opt-out-perm') {
        logger.error(
          `[controllers/user.controller]-[UserController.optOutForPeriod]-User already opted out permanently`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'User already opted out',
          null,
        );
        return;
      }

      // Fetch employee to get time_to_food
      const employee_id = currentUserData.employee_id;
      if (!employee_id) {
        logger.error(
          `[controllers/user.controller]-[UserController.optOutForPeriod]-Employee ID not found`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'Employee ID not found',
          null,
        );
        return;
      }
      const employee = await employeeRepo.getEmployeeById(employee_id);
      if (!employee) {
        logger.error(
          `[controllers/user.controller]-[UserController.optOutForPeriod]-Employee not found`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'Employee not found',
          null,
        );
        return;
      }
      const time_to_food = employee.time_to_food || '';

      const latestOptOutPeriods = await userRepo.getLatestOptOutTempDate(id);

      // Helper to compare periods (including opt_out_time_to for stricter match)
      const isSamePeriod = (a: any, b: any) =>
        moment(a.opt_out_time_from).isSame(moment(b.opt_out_time_from)) &&
        Number(a.meal_opted_out ?? 0) === Number(b.meal_opted_out ?? 0);

      const hasAnyMatch = userData.some(period =>
        latestOptOutPeriods.some((existing: any) =>
          isSamePeriod(period, existing),
        ),
      );

      if (hasAnyMatch) {
        logger.info(
          `[controllers/user.controller]-[UserController.optOutForPeriod]-You have already opted out for one of the days`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'At least one of the periods is already opted out',
          null,
        );
        return;
      }

      const optOutDataWithIds = userData.map(period => ({
        id,
        opt_out_time_from: moment(period.opt_out_time_from).format(
          'YYYY-MM-DD HH:mm:ss',
        ),
        opt_out_time_to: moment(period.opt_out_time_to).format(
          'YYYY-MM-DD HH:mm:ss',
        ),
        meal_opted_out: Number(period.meal_opted_out ?? 0),
      }));

      const result = await userRepo.optOutForPeriod(
        optOutDataWithIds,
        time_to_food,
      );

      if (result === 'User opted out for period') {
        logger.info(
          `[controllers/user.controller]-[UserController.optOutForPeriod]-User opted out for period successfully`,
        );
        const updatedTempDates = await userRepo.getLatestOptOutTempDate(id);
        sendResponse(res, Number(statusCode.SUCCESS), result, updatedTempDates);
        return;
      } else {
        sendResponse(res, Number(statusCode.BAD_REQUEST), result, null);
        return;
      }
    } catch (error) {
      logger.error(
        `[controllers/user.controller]-[UserController.optOutForPeriod]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  /*
   * @description Permanently opts out a user.
   * @param {Request}
   * req - The request object containing user data.
   * @param {Response}
   * res - The response object to send the response.
   * @returns {Promise<void>} - A promise that resolves to void.
   * @throws {Error} - Throws an error if there is an issue with the request or user opt-out.
   */
  async optOutPermanent(req: Request, res: Response): Promise<void> {
    let message: string;
    try {
      const currentUserData = await getCurrentUser(req);
      if (!currentUserData) {
        logger.error(
          `[controllers/user.controller]-[UserController.optOutPermanent]-User not found`,
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
        `[controllers/user.controller]-[UserController.optOutPermanent]- Opting out user permanently`,
      );
      const employee_id = currentUserData?.employee_id;
      if (!employee_id) {
        logger.error(
          `[controllers/user.controller]-[UserController.optOutPermanent]-Employee ID not found`,
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
        employee_id as string,
      );
      if (!employee) {
        logger.error(
          `[controllers/user.controller]-[UserController.optOutPermanent]-Employee not found`,
        );
        sendResponse(
          res,
          Number(statusCode.UNAUTHORIZED),
          statusMessage.UNAUTHORIZED,
          null,
        );
        return;
      }
      const { time_to_food } = employee;

      const lunchBlockFrom = parseEnvTime(process.env.ALLOWED_OPT_OUT_LUNCH!);
      const lunchBlockTo = parseEnvTime(process.env.LUNCH_END_UTC!);
      const dinnerBlockFrom = parseEnvTime(process.env.ALLOWED_OPT_OUT_DINNER!);
      const dinnerBlockTo = parseEnvTime(process.env.DINNER_END_UTC!).add(
        1,
        'day',
      );

      if (time_to_food === 'lunch') {
        if (
          time_to_food === 'lunch' &&
          moment().isBetween(lunchBlockFrom, lunchBlockTo, undefined, '[]')
        ) {
          return sendResponse(
            res,
            Number(statusCode.BAD_REQUEST),
            'You cannot opt out during This time Try after 2:30 PM',
            null,
          );
        }
      } else if (time_to_food === 'dinner') {
        if (
          time_to_food === 'dinner' &&
          moment().isBetween(dinnerBlockFrom, dinnerBlockTo, undefined, '[]')
        ) {
          return sendResponse(
            res,
            Number(statusCode.BAD_REQUEST),
            'You cannot opt out during This time Try after 1:00 AM',
            null,
          );
        }
      }
      const id = currentUserData?.id;
      if (!id) {
        logger.error(
          `[controllers/user.controller]-[UserController.optOutPermanent]-User not found`,
        );
        sendResponse(
          res,
          Number(statusCode.UNAUTHORIZED),
          statusMessage.UNAUTHORIZED,
          null,
        );
        return;
      }
      const user: User = (await userRepo.getUserById(id as string)) as User;
      logger.info(
        `[controllers/user.controller]-[UserController.optOutPermanent]- User data`,
      );
      if (!user) {
        logger.error(
          `[controllers/user.controller]-[UserController.optOutPermanent]-User not found`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'User not found',
          null,
        );
        return;
      }
      if (currentUserData.opt_status !== 'opt-in') {
        logger.error(
          `[controllers/user.controller]-[UserController.optOutForPeriod]-User already opted out`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'User already opted out',
          null,
        );
        return;
      }
      message = await userRepo.optOutPermanent(id);
      logger.info(
        `[controllers/user.controller]-[UserController.optOutPermanent]-User opted out permanently`,
      );
      sendResponse(res, Number(statusCode.SUCCESS), message, null);
    } catch (error) {
      logger.error(
        `[controllers/user.controller]-[UserController.optOutPermanent]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        (error as Error)?.message,
        null,
      );
    }
  }

  async optIn(req: Request, res: Response): Promise<void> {
    try {
      const currentUserData = await getCurrentUser(req);

      const id = currentUserData?.id;
      if (!id) {
        logger.error(
          `[controllers/user.controller]-[UserController.optIn]-User not found`,
        );
        sendResponse(
          res,
          Number(statusCode.UNAUTHORIZED),
          statusMessage.UNAUTHORIZED,
          null,
        );
        return;
      }
      const user: User = (await userRepo.getUserById(id as string)) as User;
      logger.info(
        `[controllers/user.controller]-[UserController.optIn]- User data`,
      );
      if (!user) {
        logger.error(
          `[controllers/user.controller]-[UserController.optIn]-User not found`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'User not found',
          null,
        );
        return;
      }
      if (currentUserData.opt_status === 'opt-in') {
        logger.error(
          `[controllers/user.controller]-[UserController.optOutForPeriod]-User already opted in`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'User already opted in',
          null,
        );
        return;
      }
      logger.warn(
        `[controllers/user.controller]-[UserController.optIn]- Opting in user ${JSON.stringify(
          currentUserData,
        )}, ${moment().format('YYYY-MM-DD')}`,
      );
      if (currentUserData.opt_out_date > moment().format('YYYY-MM-DD')) {
        logger.error(
          `[controllers/user.controller]-[UserController.optIn]-User Opting In is Prohibited till ${currentUserData.opt_out_date} `,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          `Opting In is Prohibited till ${currentUserData.opt_out_date} `,
          null,
        );
        return;
      }
      const message = await userRepo.optIn(id);
      if (message !== 'Success') {
        logger.error(
          `[controllers/user.controller]-[UserController.optIn]-User not found`,
        );
        sendResponse(res, Number(statusCode.BAD_REQUEST), message, null);
        return;
      }
      logger.info(
        `[controllers/user.controller]-[UserController.optIn]-User opted in`,
      );
      sendResponse(res, Number(statusCode.SUCCESS), message, null);
    } catch (error) {
      logger.error(
        `[controllers/user.controller]-[UserController.optIn]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  async getTempOPtOutDates(req: Request, res: Response): Promise<void> {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        logger.error(
          `[controllers/user.controller]-[UserController.getTempOPtOutDates]-User not found`,
        );
        sendResponse(
          res,
          Number(statusCode.UNAUTHORIZED),
          statusMessage.UNAUTHORIZED,
          null,
        );
        return;
      }
      const user_id = user?.id;
      logger.info(
        `[controllers/user.controller]-[UserController.getTempOPtOutDates]-Getting temporary opt-out dates for user_id: ${user_id}`,
      );
      if (!user_id) {
        logger.error(
          `[controllers/user.controller]-[UserController.getTempOPtOutDates]-Missing user_id`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          statusMessage.BAD_REQUEST,
          null,
        );
        return;
      }
      const tempOptOutDates = await userRepo.getLatestOptOutTempDate(user_id);
      logger.info(
        `[controllers/user.controller]-[UserController.getTempOPtOutDates]-Temporary opt-out dates: ${JSON.stringify(
          tempOptOutDates,
        )}`,
      );

      // Check if tempOptOutDates is an empty array
      if (tempOptOutDates.length === 0) {
        logger.error(
          `[controllers/user.controller]-[UserController.getTempOPtOutDates]-No temporary opt-out dates found for user_id: ${user_id}`,
        );
        sendResponse(
          res,
          Number(statusCode.NOT_FOUND),
          statusMessage.NOT_FOUND,
          null,
        );
        return;
      }

      const datePairs = tempOptOutDates.map((row: OptOutData) => [
        row.opt_out_time_from,
        row.opt_out_time_to,
        row.meal_opted_out,
      ]);
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        datePairs,
      );
    } catch (error) {
      logger.error(
        `[controllers/user.controller]-[UserController.getTempOPtOutDates]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  async temporaryOptIn(req: Request, res: Response): Promise<void> {
    try {
      logger.info(
        `[controllers/user.controller]-[UserController.temporaryOptIn]-Temporary opt-in for user
        ${JSON.stringify(req.body)}`,
      );
      const { userData } = req.body;
      const currentUserData = await getCurrentUser(req);
      const id = currentUserData?.id;
      if (!id) {
        logger.error(
          `[controllers/user.controller]-[UserController.temporaryOptIn]-User not found`,
        );
        sendResponse(
          res,
          Number(statusCode.UNAUTHORIZED),
          statusMessage.UNAUTHORIZED,
          null,
        );
        return;
      }

      if (!userData || !Array.isArray(userData) || userData.length === 0) {
        logger.error(
          `[controllers/user.controller]-[UserController.temporaryOptIn]-No opt-out date ranges provided`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'No opt-in date ranges provided',
          null,
        );
        return;
      }
      const optStatus = currentUserData.opt_status;
      logger.info(
        `[controllers/user.controller]-[UserController.temporaryOptIn]-Checking opt-out status: ${optStatus}`,
      );
      const employee = await employeeRepo.getEmployeeById(
        currentUserData.employee_id as string,
      );
      if (!employee) {
        logger.error(
          `[controllers/user.controller]-[UserController.temporaryOptIn]-Employee not found`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'Employee not found',
          null,
        );
        return;
      }
      const is_wfh = employee.is_wfh;
      if (!is_wfh) {
        logger.error(
          `[controllers/user.controller]-[UserController.temporaryOptIn]-Employee is not WFH`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          'Employee is not WFH',
          null,
        );
        return;
      }
      const optInDataWithIds = userData.map(period => ({
        id,
        opt_out_time_from: moment(period.opt_out_time_from).format(
          'YYYY-MM-DD HH:mm:ss',
        ),
        opt_out_time_to: moment(period.opt_out_time_to).format(
          'YYYY-MM-DD HH:mm:ss',
        ),
      }));

      const result = await userRepo.temporaryOptIn(optInDataWithIds);
      if (result === 'Success') {
        const updatedOptInDates = await userRepo.getLatestOptOutTempDate(id);
        logger.info(
          `[controllers/user.controller]-[UserController.temporaryOptIn]-User temporary opted in successfully`,
        );
        sendResponse(
          res,
          Number(statusCode.SUCCESS),
          'User has been opted in',
          updatedOptInDates,
        );
      } else {
        logger.error(
          `[controllers/user.controller]-[UserController.temporaryOptIn]-Error: ${result}`,
        );
        sendResponse(res, Number(statusCode.BAD_REQUEST), result, null);
      }
    } catch (error) {
      logger.error(
        `[controllers/user.controller]-[UserController.temporaryOptIn]-Error: ${error}`,
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
export default UserController;
