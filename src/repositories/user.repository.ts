import { OptOutData, User } from '../types/custom.interface';
import { QueryTypes } from 'sequelize';
import {
  UserModel,
  UserOptingPivotModel,
  NotificationModel,
} from '../models/index.model';
import { logger } from '../utils/logger.util';
import moment from 'moment';
import { sequelize } from '../config/postgres.config';
import { parseEnvTime } from '../utils/job.util';

class UserRepository {
  /*
   * @description Fetches all users from the database.
   * @param {string} id - The ID of the user to fetch.
   * @returns {Promise<User[]>} - A promise that resolves to an array of users.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   */
  async getUserById(id: string): Promise<User | null> {
    try {
      logger.info(
        `[repositories/user.repository]-[UserRepository.getUserById]-Fetching user with ID: ${id}`,
      );
      const user = await UserModel.findOne({
        where: {
          id: id,
          is_deleted: false,
        },
      });
      if (!user) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.getUserById]-User not found with ID: ${id}`,
        );
        return null;
      }
      logger.info(
        `[repositories/user.repository]-[UserRepository.getUserById]-User found with ID: ${id}`,
      );
      return user?.get({ plain: true });
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[UserRepository.getUserById]-Error: ${error}`,
      );
      throw new Error('Error fetching user by ID');
    }
  }

  /*
   * @description Fetches all users from the database.
   * @param {string} email - The email of the user to fetch.
   * @returns {Promise<User[]>} - A promise that resolves to an array of users.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   */
  async getUserByEmail(email: string | null): Promise<User | null> {
    try {
      logger.info(
        `[repositories/user.repository]-[UserRepository.getUserByEmail]-Fetching user with email: ${email}`,
      );
      const user = await UserModel.findOne({
        attributes: [
          'id',
          'employee_id',
          'email',
          'role',
          'password',
          'link',
          'link_expiry',
          'created_at',
          'updated_at',
          'is_deleted',
          'is_active',
        ],
        where: {
          email: email,
          // is_deleted: false,
        },
      });
      if (!user) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.getUserByEmail]-User not found with email: ${email}`,
        );
        throw new Error('User not found');
      }
      logger.info(
        `[repositories/user.repository]-[UserRepository.getUserByEmail]-User found with email: ${email}`,
      );
      return user?.get({ plain: true });
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[UserRepository.getUserByEmail]-Error: ${error}`,
      );
      throw new Error('Error fetching user by email');
    }
  }

  /*
   * @description Creates a new user in the database.
   * @param {User} user - The user object containing user data.
   * @returns {Promise<User>} - A promise that resolves to the created user object.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   * @throws {Error} - Throws an error if the user already exists.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   */
  async createUser(user: User): Promise<unknown | null> {
    try {
      logger.info(
        `[repositories/user.repository]-[UserRepository.createUser]-Creating user with employee ID: ${user.employee_id}`,
      );
      const existingUser = await UserModel.findOne({
        where: {
          employee_id: user.employee_id,
          email: user.email,
          is_deleted: false,
        },
      });

      if (existingUser) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.createUser]-User already exists with employee ID: ${user.employee_id}`,
        );
        return null;
      }

      const userData = await UserModel.create({
        employee_id: user.employee_id,
        email: user.email,
        password: user.password,
        role: user.role,
      });
      logger.info(
        `[repositories/user.repository]-[UserRepository.createUser]-User created with employee ID: ${user.employee_id}`,
      );
      return {
        employee_id: userData?.get('employee_id'),
      };
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[UserRepository.createUser]-Error: ${error}`,
      );
      throw new Error('Error creating user');
    }
  }

  /*
   * @description Updates a user's otp in the database.
   * @param {User} user - The user object containing user data.
   * @returns {Promise<User>} - A promise that resolves to the updated user object.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   * @throws {Error} - Throws an error if the user does not exist.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   */
  async addLinkToUser(user: User): Promise<unknown | null> {
    try {
      logger.info(
        `[repositories/user.repository]-[UserRepository.addOtp]-Adding OTP for user with ID: ${user.id}`,
      );
      const { id, link, linkExpiry } = user;
      logger.info(
        `[repositories/user.repository]-[UserRepository.addOtp]-Adding OTP for user with ID: ${id}`,
      );
      const updatedUser = await UserModel.update(
        { link, link_expiry: linkExpiry },
        { where: { id } },
      );
      if (!updatedUser) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.addOtp]-User not found with ID: ${id}`,
        );
        return null;
      }
      logger.info(
        `[repositories/user.repository]-[UserRepository.addOtp]-OTP added for user with ID: ${id}`,
      );
      return updatedUser;
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[UserRepository.updateUser]-Error: ${error}`,
      );
      throw new Error('Error updating user');
    }
  }

  /*
   * @description Fetches a user by link from the database.
   * @param {string}
   * @returns {Promise<User>} - A promise that resolves to the user object.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   * @throws {Error} - Throws an error if the user does not exist.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   */
  async getUserByLink(link: string): Promise<User | null> {
    try {
      const user = await UserModel.findOne({
        attributes: [
          'id',
          'employee_id',
          'email',
          'role',
          'link',
          'link_expiry',
          'created_at',
          'updated_at',
          'is_deleted',
        ],
        where: {
          link: link,
          is_deleted: false,
        },
      });
      if (!user) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.getUserByLink]-User not found with link: ${link}`,
        );
        return null;
      }
      logger.info(
        `[repositories/user.repository]-[UserRepository.getUserByLink]-User found with link: ${link}`,
      );
      return user?.get({ plain: true });
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[UserRepository.getUserByLink]-Error: ${error}`,
      );
      throw new Error('Error fetching user by link');
    }
  }

  /*
   * @description Updates a user in the database.
   * @param {User}
   * @returns {Promise<User>} - A promise that resolves to the updated user object.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   * @throws {Error} - Throws an error if the user does not exist.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   */
  async updateUser(user: User): Promise<unknown | null> {
    try {
      logger.info(
        `[repositories/user.repository]-[UserRepository.updateUser]-Updating user with ID: ${user.id}`,
      );

      const updatedUser = await UserModel.update(user, {
        where: { id: user.id },
      });

      logger.info(
        `[repositories/user.repository]-[UserRepository.updateUser]-Updating user with ID: ${user.id}`,
      );

      logger.info(
        `[repositories/user.repository]-[UserRepository.updateUser]-Updating user with ID: ${user.id}`,
      );

      if (!updatedUser) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.updateUser]-User not found with ID: ${user.id}`,
        );
        return null;
      }
      logger.info(
        `[repositories/user.repository]-[UserRepository.updateUser]-User updated with ID: ${user.id}`,
      );
      return updatedUser;
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[UserRepository.updateUser]-Error: ${error}`,
      );
      throw new Error('Error updating user');
    }
  }

  /*
   * @description Deletes a user from the database.
   * @param {string}
   * @returns {Promise<User>} - A promise that resolves to the deleted user object.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   * @throws {Error} - Throws an error if the user does not exist.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   */
  async addAccessToken(
    userId: string,
    accessToken: string,
  ): Promise<User | null> {
    try {
      logger.info(
        `[repositories/user.repository]-[UserRepository.addRefreshToken]-Adding refresh token for user with ID: ${userId}`,
      );
      const nullifyAccessToken = await UserModel.update(
        { access_token: null },
        { where: { id: userId } },
      );
      if (!nullifyAccessToken) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.addRefreshToken]-User not found with ID: ${userId}`,
        );
        return null;
      }
      const updatedUser = await UserModel.update(
        { access_token: accessToken },
        { where: { id: userId } },
      );
      if (!updatedUser) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.addRefreshToken]-User not found with ID: ${userId}`,
        );
        return null;
      }
      logger.info(
        `[repositories/user.repository]-[UserRepository.addRefreshToken]-Refresh token added for user with ID: ${userId}`,
      );
      return updatedUser as unknown as User;
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[UserRepository.addRefreshToken]-Error: ${error}`,
      );
      throw new Error('Error adding refresh token');
    }
  }

  /*
   * @description Fetches user details for QR generation.
   * @param {string}
   * @returns {Promise<User[]>} - A promise that resolves to an array of user details.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   * @throws {Error} - Throws an error if the user does not exist.
   * @throws {Error} - Throws an error if there is an issue with the database query.
   */
  async getUserDetailsForQrGeneration(time_to_food: string): Promise<User[]> {
    try {
      logger.info(
        `[repositories/user.repository]-[UserRepository.getUserDetailsForQrGeneration]-Fetching user details for QR generation`,
      );
      const query = `
        SELECT
          u.id,
          u.opt_status,
          u.is_active,
          e.time_to_food
        FROM users u
        LEFT JOIN employees e ON u.employee_id = e.id
        WHERE u.is_deleted = false
        AND u.is_active = true
        AND u.opt_status = 'opt-in'
        AND e.time_to_food IN(?,'lunch-dinner')
        AND u.is_deleted = false
      `;
      logger.info(
        `[repositories/user.repository]-[UserRepository.getUserDetailsForQrGeneration]-Query: ${query}`,
      );
      const userDetails = await UserModel.sequelize?.query(query, {
        type: QueryTypes.SELECT,
        replacements: [time_to_food],
      });
      if (!userDetails) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.getUserDetailsForQrGeneration]-No user details found for QR generation`,
        );
        return [];
      }
      logger.info(
        `[repositories/user.repository]-[UserRepository.getUserDetailsForQrGeneration]-User details fetched for QR generation`,
      );
      return userDetails as User[];
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[UserRepository.getUserDetailsForQrGeneration]-Error: ${error}`,
      );
      throw new Error('Error fetching user details for QR generation');
    }
  }

  async optOutForPeriod(
    userData: OptOutData[],
    time_to_food: string,
  ): Promise<string> {
    try {
      const transaction = await sequelize.transaction();
      logger.info(
        `[repositories/user.repository]-[UserRepository.optOutForPeriod]-Opting out users for period: ${JSON.stringify(
          userData,
        )}`,
      );
      for (const data of userData) {
        const { id, opt_out_time_from, opt_out_time_to, meal_opted_out } = data;

        if (!opt_out_time_from || !opt_out_time_to) {
          await transaction.rollback();
          return 'Both start and end dates are required';
        }
        if (
          time_to_food === 'lunch-dinner' &&
          (meal_opted_out == null || meal_opted_out == 0)
        ) {
          logger.warn(
            `[controllers/user.controller]-[UserController.optOutForPeriod]-Missing or invalid meal_opted_out field`,
          );

          return 'Missing or invalid meal_opted_out field';
        }

        if (moment(opt_out_time_from).isAfter(opt_out_time_to)) {
          await transaction.rollback();
          return 'Start date is after end date';
        }

        if (moment(opt_out_time_from).isSame(opt_out_time_to)) {
          await transaction.rollback();
          return 'Start date is same as end date';
        }

        // Time-based validation for today
        const today = moment().format('YYYY-MM-DD');
        const fromDate = moment(opt_out_time_from).format('YYYY-MM-DD');
        const now = moment();
        logger.info(
          `[repositories/user.repository]-[UserRepository.optOutForPeriod]-Current date: ${today}, From date: ${fromDate}`,
        );

        const allowedLunchTime = parseEnvTime(
          process.env.ALLOWED_OPT_OUT_LUNCH!,
        );
        const allowedDinnerTime = parseEnvTime(
          process.env.ALLOWED_OPT_OUT_DINNER!,
        );

        if (fromDate === today) {
          if (
            ((time_to_food === 'lunch' ||
              meal_opted_out === 1 ||
              meal_opted_out === 3) &&
              now.isSameOrAfter(allowedLunchTime)) ||
            ((time_to_food === 'dinner' ||
              meal_opted_out === 2 ||
              meal_opted_out === 3) &&
              now.isSameOrAfter(allowedDinnerTime))
          ) {
            await transaction.rollback();
            logger.info(
              `[repositories/user.repository]-[UserRepository.optOutForPeriod]-Opt-out for today is not allowed`,
            );
            return `Opt-out for today is only allowed before 8:00 AM for lunch or before 3:00 PM for dinner`;
          }
        }

        const user = await UserModel.findOne({
          where: {
            id: id,
            is_deleted: false,
          },
          transaction: transaction,
        });
        logger.info(
          `[repositories/user.repository]-[UserRepository.optOutForPeriod]-User found with ID: ${id}`,
        );

        if (!user) {
          await transaction.rollback();
          return 'User not found';
        }

        const userOpt = await UserOptingPivotModel.create(
          {
            user_id: id,
            opt_out_time_from,
            opt_out_time_to,
            opt_out_pivot_status: 'opt-out-temporarily',
            meal_opted_out: meal_opted_out,
          },
          { transaction: transaction },
        );
        logger.info(
          `[repositories/user.repository]-[UserRepository.optOutForPeriod]-User opted out for period successfully ${
            userOpt
          }`,
        );
      }
      await transaction.commit();
      logger.info(
        `[repositories/user.repository]-[UserRepository.optOutForPeriod]-All periods opted out successfully`,
      );
      return 'User opted out for period';
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[UserRepository.optOutForPeriod]-Error: ${error}`,
      );
      throw new Error('Error opting out for period');
    }
  }

  async optOutPermanent(userId: string): Promise<string> {
    try {
      const transaction = await sequelize?.transaction();
      logger.info(
        `[repositories/user.repository]-[UserRepository.optOutPermanent]-Opting out user with ID: ${userId}`,
      );

      const user = await UserModel.findOne({
        where: {
          id: userId,
          is_deleted: false,
        },
      });

      if (!user) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.optOutPermanent]-User not found with ID: ${userId}`,
        );
        return 'User not found';
      }

      if (user && Number((user as any).counter) <= 0) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.optOutPermanent]-User already opted out with ID: ${userId}`,
        );
        return 'User Cannot Opt Out Anymore... Please contact admin';
      }
      logger.info(
        `[repositories/user.repository]-[UserRepository.optOutPermanent]-User found with ID: ${userId}`,
      );

      const pivotUserOpt = await UserOptingPivotModel.create(
        {
          user_id: userId,
          opt_out_time_from: moment().format('YYYY-MM-DD HH:mm:ss'),
          opt_out_time_to: moment()
            .add(2, 'months')
            .format('YYYY-MM-DD HH:mm:ss'),
          is_admin_approved: 'approved',
          opt_out_pivot_status: 'opt-out-permanently',
        },
        { transaction },
      );
      logger.info(
        `[repositories/user.repository]-[UserRepository.optOutPermanent]-Pivot user opted out: ${JSON.stringify(
          pivotUserOpt,
        )}`,
      );
      if (!pivotUserOpt) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.optOutPermanent]-User not found with ID: ${userId}`,
        );
        return 'User not found';
      }
      logger.info(
        `[repositories/user.repository]-[UserRepository.optOutPermanent]-User opted out permanently with ID: ${userId}`,
      );
      await UserModel.update(
        {
          opt_status: 'opt-out-perm',
          counter: (user.get('counter') as number) - 1,
        },
        { where: { id: user.get('id') }, transaction },
      );
      logger.info(
        `[repositories/user.repository]-[UserRepository.optOutPermanent]-User opted out permanently with ID: ${userId}`,
      );
      await transaction?.commit();
      return 'User opted out permanently';
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[UserRepository.optOutPermanent]-Error: ${error}`,
      );
      throw new Error('Error opting out permanently');
    }
  }

  async optIn(userId: string): Promise<string> {
    try {
      const transaction = await sequelize?.transaction();
      logger.info(
        `[repositories/user.repository]-[UserRepository.optIn]-Opting in user with ID: ${userId}`,
      );
      const user = await UserModel.findOne({
        where: {
          id: userId,
          is_deleted: false,
        },
      });
      if (!user) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.optIn]-User not found with ID: ${userId}`,
        );
        return 'User not found';
      }
      logger.info(
        `[repositories/user.repository]-[UserRepository.optIn]-User found with ID: ${userId}`,
      );
      if (user.get('opt_status') === 'opt-in') {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.optIn]-User already opted in with ID: ${userId}`,
        );
        return 'User already opted in';
      }
      if (Number(user.get('counter')) <= 0) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.optIn]-User already opted out with ID: ${userId}`,
        );
        return 'User Cannot Opt In Anymore... Please contact admin';
      }

      const notification = await NotificationModel.create(
        {
          user_id: userId,
          notification_type: 'opt-in',
          notification_details: `User Wants to Opt In ${3 - Number(user.get('counter'))} times`,
          is_admin_approved: 'pending',
        },
        { transaction },
      );

      logger.info(
        `[repositories/user.repository]-[UserRepository.optIn]-Notification created: ${JSON.stringify(
          notification,
        )}`,
      );
      if (!notification) {
        logger.warn(
          `[repositories/user.repository]-[UserRepository.optIn]-User not found with ID: ${userId}`,
        );
        return 'User not found';
      }
      logger.info(
        `[repositories/user.repository]-[UserRepository.optIn]-User opted in with ID: ${userId}`,
      );
      await transaction?.commit();
      return 'Success';
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[UserRepository.optIn]-Error: ${error}`,
      );
      throw new Error('Error opting in');
    }
  }

  async getLatestOptOutTempDate(userId: string | null): Promise<OptOutData[]> {
    try {
      const user_id = userId;
      logger.info(
        `[repositories/user.repository]-[getLatestOptOutTempDate]-Fetching latest temporary opt-out date for user_id: ${user_id}`,
      );
      const query = `
      SELECT 
        opt.opt_out_time_from AS opt_out_time_from,
        opt.opt_out_time_to AS opt_out_time_to,
        opt.meal_opted_out
      FROM user_opting_pivots opt
      JOIN users u ON opt.user_id = u.id
      WHERE u.id = :user_id
        AND opt.opt_out_pivot_status IN ('opt-out-temporarily', 'opt-in-temporarily')
      ORDER BY opt.opt_out_time_from ASC
    `;
      const optData = (await sequelize?.query(query, {
        replacements: { user_id },
        type: QueryTypes.SELECT,
      })) as OptOutData[];

      if (!optData || optData.length === 0) {
        logger.info(
          `[repositories/user.repository]-[getLatestOptOutTempDate]-No temporary opt-out data found for user_id: ${user_id}`,
        );
        return []; // Return an empty array instead of null
      }

      // Format the opt-out dates
      // Filter out records where opt_out_time_from is less than today
      const today = moment().startOf('day');
      const filteredOptData = optData.filter(data =>
        moment(data.opt_out_time_from).isSameOrAfter(today),
      );

      // Format the opt-out dates for the filtered data
      filteredOptData.forEach(data => {
        data.opt_out_time_from = moment(data.opt_out_time_from).format(
          'YYYY-MM-DD',
        );
        data.opt_out_time_to = moment(data.opt_out_time_to).format(
          'YYYY-MM-DD',
        );
        logger.warn(
          `[repositories/user.repository]-[getLatestOptOutTempDate]-Latest temporary opt-out data fetched for user_id: ${JSON.stringify(filteredOptData)}`,
        );
      });

      // Return the filtered and formatted data
      return filteredOptData;
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[getLatestOptOutTempDate]-Error in getting latest temporary opt-out data: ${error}`,
      );
      throw new Error('Error in getting latest temporary opt-out data');
    }
  }

  async temporaryOptIn(
    optInDataWithIds: Array<{
      id: string;
      opt_out_time_from: string;
      opt_out_time_to: string;
    }>,
  ): Promise<string> {
    try {
      const transaction = await sequelize.transaction();
      logger.info(
        `[repositories/user.repository]-[temporaryOptIn]-Temporary opting in users: ${JSON.stringify(
          optInDataWithIds,
        )}`,
      );

      for (const data of optInDataWithIds) {
        logger.info(
          `[repositories/user.repository]-[temporaryOptIn]-Processing user with ID: ${data.id}`,
        );
        const { id, opt_out_time_from, opt_out_time_to } = data;

        if (!opt_out_time_from || !opt_out_time_to) {
          logger.warn(
            `[repositories/user.repository]-[temporaryOptIn]-Both start and end dates are required for user ID: ${id}`,
          );
          await transaction.rollback();
          return 'Both start and end dates are required';
        }

        if (moment(opt_out_time_from).isAfter(opt_out_time_to)) {
          logger.warn(
            `[repositories/user.repository]-[temporaryOptIn]-Start date is after end date for user ID: ${id}`,
          );
          await transaction.rollback();
          return 'Start date is after end date';
        }

        if (moment(opt_out_time_from).isSame(opt_out_time_to)) {
          logger.warn(
            `[repositories/user.repository]-[temporaryOptIn]-Start date is same as end date for user ID: ${id}`,
          );
          await transaction.rollback();
          return 'Start date is same as end date';
        }

        const user = await UserModel.findOne({
          where: {
            id: id,
            is_deleted: false,
          },
          transaction: transaction,
        });

        if (!user) {
          await transaction.rollback();
          return 'User not found';
        }
        logger.info(
          `[repositories/user.repository]-[temporaryOptIn]-User found with ID: ${id}`,
        );
        const userOpt = await UserOptingPivotModel.create(
          {
            user_id: id,
            opt_out_time_from,
            opt_out_time_to,
            opt_out_pivot_status: 'opt-in-temporarily',
            meal_opted_out: 0,
          },
          { transaction: transaction },
        );

        if (!userOpt) {
          await transaction.rollback();
          return 'Failed to create temporary opt-in record';
        }

        logger.info(
          `[repositories/user.repository]-[temporaryOptIn]-User temporarily opted in successfully with ID: ${id}`,
        );
      }
      await transaction.commit();
      logger.info(
        `[repositories/user.repository]-[temporaryOptIn]-Temporary opted in users successfully`,
      );
      return 'Success';
    } catch (error) {
      logger.error(
        `[repositories/user.repository]-[temporaryOptIn]-Error: ${error}`,
      );
      throw new Error('Error temporarily opting in users');
    }
  }
}

export default UserRepository;
