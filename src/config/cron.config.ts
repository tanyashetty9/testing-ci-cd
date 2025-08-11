import cron from 'node-cron';
import dotenv from 'dotenv';
import UserRepository from '../repositories/user.repository';
import QRRepository from '../repositories/qr.repository';
import { logger } from '../utils/logger.util';
import moment, { Moment } from 'moment';
import { updateInfoJob, warningMail } from '../utils/job.util';

dotenv.config();

const cronLunchSchedule: string =
  process.env.CRON_LUNCH_SCHEDULE || '0 4 * * 1-5';
const cronDinnerSchedule: string =
  process.env.CRON_DINNER_SCHEDULE || '00 16 * * 1-5';
const cronWarningMailSchedule: string =
  process.env.CRON_WARNING_MAIL_SCHEDULE || '00 10 * * 6';
const userRepository = new UserRepository();
const qrRepository = new QRRepository();

/**
 * Starts the cron jobs for scheduling QR code generation tasks.
 *
 * This function schedules two cron jobs:
 * 1. A job that runs every weekday at 5 AM to generate QR codes for lunch.
 * 2. A job that runs every weekday at 4 PM to generate QR codes for dinner.
 *
 * Each cron job performs the following steps:
 * - Logs the start of the cron job.
 * - Fetches user details for QR code generation based on the meal type (lunch or dinner).
 * - Logs the fetched user details.
 * - Extracts user IDs from the fetched data.
 * - Logs the user IDs to be used for QR code generation.
 * - Inserts QR code data for the user IDs into the database.
 * - Logs whether the QR code data was successfully inserted or already exists.
 *
 * If an error occurs during the execution of a cron job, it is logged and an error is thrown.
 *
 * @async
 * @function
 * @returns {Promise<void>} A promise that resolves when the cron jobs are successfully started.
 * @throws {Error} Throws an error if there is an issue during the execution of a cron job.
 */
const startCronJobs = async (): Promise<void> => {
  logger.info(`[config/cron.config]-[startCronJobs]-Starting cron jobs...`);
  // Schedule a cron job to run every day at 5 AM on weekdays (Monday to Friday)
  cron.schedule(cronLunchSchedule, async (): Promise<void> => {
    try {
      logger.info(
        `[config/cron.config]-[startCronJobs]-Cron job started at 5 AM on weekdays`,
      );
      const updateInfo = await updateInfoJob(1, 'lunch');
      if (updateInfo) {
        logger.info(
          `[config/cron.config]-[startCronJobs]-updateInfoJob executed successfully`,
        );
      } else {
        logger.info(
          `[config/cron.config]-[startCronJobs]-No updateInfoJob data found`,
        );
      }
      const users = await userRepository.getUserDetailsForQrGeneration('lunch');
      logger.info(
        `[config/cron.config]-[startCronJobs]-Fetched users for QR code generation: ${users}`,
      );
      if (!users) {
        logger.info(
          `[config/cron.config]-[startCronJobs]-No users found for QR code generation`,
        );
        return;
      }
      const user_ids: string[] =
        users?.map(user => user.id).filter((id): id is string => id !== null) ||
        [];
      logger.info(
        `[config/cron.config]-[startCronJobs]-User IDs for QR code generation: ${user_ids}`,
      );
      if (user_ids.length > 0) {
        const date_of_use: Date = new Date(moment().format('YYYY-MM-DD'));
        const qrData = await qrRepository.insertQrCodeData(
          user_ids,
          date_of_use,
          'Lunch',
        );
        if (qrData) {
          logger.info(
            `[config/cron.config]-[startCronJobs]-QR code data inserted successfully for user_ids: ${user_ids}`,
          );
        } else {
          logger.info(
            `[config/cron.config]-[startCronJobs]-QR code data already exists for user_ids: ${user_ids}`,
          );
        }
      } else {
        logger.info(
          `[config/cron.config]-[startCronJobs]-No users found for QR code generation`,
        );
      }
    } catch (error) {
      logger.error(
        `[config/cron.config]-[startCronJobs]-Error in cron job: ${error}`,
      );
      throw new Error('Error in cron job');
    }
  });
  // Schedule a cron job to run every day at 4 PM on weekdays (Monday to Friday)
  cron.schedule(cronDinnerSchedule, async (): Promise<void> => {
    try {
      logger.info(
        `[config/cron.config]-[startCronJobs]-Cron job started at 4 PM on weekdays`,
      );
      const updateInfo = await updateInfoJob(2, 'dinner');
      if (updateInfo) {
        logger.info(
          `[config/cron.config]-[startCronJobs]-updateInfoJob executed successfully`,
        );
      } else {
        logger.info(
          `[config/cron.config]-[startCronJobs]-No updateInfoJob data found`,
        );
      }
      const users =
        await userRepository.getUserDetailsForQrGeneration('dinner');
      logger.info(
        `[config/cron.config]-[startCronJobs]-Fetched users for QR code generation: ${users}`,
      );
      if (!users) {
        logger.info(
          `[config/cron.config]-[startCronJobs]-No users found for QR code generation`,
        );
        return;
      }
      const user_ids: string[] =
        users?.map(user => user.id).filter((id): id is string => id !== null) ||
        [];
      logger.info(
        `[config/cron.config]-[startCronJobs]-User IDs for QR code generation: ${user_ids}`,
      );
      if (user_ids.length > 0) {
        const date_of_use: Date = new Date(moment().format('YYYY-MM-DD'));
        const qrData = await qrRepository.insertQrCodeData(
          user_ids,
          date_of_use,
          'Dinner',
        );
        if (qrData) {
          logger.info(
            `[config/cron.config]-[startCronJobs]-QR code data inserted successfully for user_ids: ${user_ids}`,
          );
        } else {
          logger.info(
            `[config/cron.config]-[startCronJobs]-QR code data already exists for user_ids: ${user_ids}`,
          );
        }
      } else {
        logger.info(
          `[config/cron.config]-[startCronJobs]-No users found for QR code generation`,
        );
      }
    } catch (error) {
      logger.error(
        `[config/cron.config]-[startCronJobs]-Error in cron job: ${error}`,
      );
      throw new Error('Error in cron job');
    }
  });

  // Job for monthly and weekly absentees
  cron.schedule(cronWarningMailSchedule, async (): Promise<void> => {
    try {
      logger.info(
        `[config/cron.config]-[startCronJobs]-Cron job for warning mail started`,
      );
      const isLastSaturdayOfMonth: boolean =
        moment().date() >= 25 && moment().day() === 6;
      logger.info(
        `[config/cron.config]-[startCronJobs]-isLastSaturdayOfMonth: ${isLastSaturdayOfMonth}`,
      );
      if (isLastSaturdayOfMonth) {
        logger.info(
          `[config/cron.config]-[startCronJobs]-Sending monthly warning mail`,
        );
        await warningMail('monthly');
      }
      logger.info(
        `[config/cron.config]-[startCronJobs]-Sending weekly warning mail`,
      );
      await warningMail('weekly');
      logger.info(
        `[config/cron.config]-[startCronJobs]-Warning mail job executed successfully`,
      );
    } catch (error) {
      logger.error(
        `[config/cron.config]-[startCronJobs]-Error in cron job for warning mail: ${error}`,
      );
      throw new Error('Error in cron job for warning mail');
    }
  });
};

export default startCronJobs;
