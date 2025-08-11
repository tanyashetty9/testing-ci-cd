import { logger } from '../utils/logger.util';
import { sendResponse } from '../utils/response.util';
import { statusCode, statusMessage } from '../constants';
import QrRepository from '../repositories/qr.repository';
import { Request, Response } from 'express';
import moment from 'moment';
import { getCurrentUser } from '../utils/auth.util';
import { parseEnvTime } from '../utils/job.util';

const qrRepo = new QrRepository();

class QrController {
  async scanQrCode(req: Request, res: Response): Promise<void> {
    try {
      const { qr_id, user_id } = req.body;
      logger.info(
        `[controllers/qr.controller]-[QrController.scanQrCode]-Scanning QR code with data: ${JSON.stringify(req.body)}`,
      );

      if (!qr_id || !user_id) {
        logger.error(
          `[controllers/qr.controller]-[QrController.scanQrCode]-Missing required fields`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          statusMessage.BAD_REQUEST,
          null,
        );
        return;
      }
      logger.info(
        `[controllers/qr.controller]-[QrController.scanQrCode]-QR code data: ${JSON.stringify(req.body)}`,
      );

      const message = await qrRepo.updateQrCodeData(qr_id, user_id);
      logger.info(
        `[controllers/qr.controller]-[QrController.scanQrCode]-QR code scan result: ${message}`,
      );
      if (message !== 'Success') {
        logger.error(
          `[controllers/qr.controller]-[QrController.scanQrCode]-Failed to scan QR code: ${message}`,
        );
        sendResponse(res, Number(statusCode.BAD_REQUEST), message, null);
        return;
      }

      logger.info(
        `[controllers/qr.controller]-[QrController.scanQrCode]-QR code scanned successfully`,
      );
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        null,
      );
    } catch (error) {
      logger.error(
        `[controllers/qr.controller]-[QrController.scanQrCode]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  async getQrCode(req: Request, res: Response): Promise<void> {
    try {
      const user = await getCurrentUser(req);
      if (!user) {
        if ((user as any).opt_status === 'opt-out-perm') {
          logger.error(
            `[controllers/qr.controller]-[QrController.getQrCode]-User opted out permanently`,
          );
          sendResponse(
            res,
            Number(statusCode.UNAUTHORIZED),
            'Please Wait till 3 months from opted out date',
            null,
          );
          return;
        } else if ((user as any).opt_status === 'opt-out-temp') {
          logger.error(
            `[controllers/qr.controller]-[QrController.getQrCode]-User opted out temporarily`,
          );
          sendResponse(
            res,
            Number(statusCode.UNAUTHORIZED),
            'QR code is not available for this user',
            null,
          );
          return;
        } else if ((user as any).counter <= 0) {
          logger.error(
            `[controllers/qr.controller]-[QrController.getQrCode]-User has no remaining QR code scans`,
          );
          sendResponse(
            res,
            Number(statusCode.UNAUTHORIZED),
            'No QR code available for this user... Please contact admin',
            null,
          );
          return;
        }
        logger.error(
          `[controllers/qr.controller]-[QrController.getQrCode]-User not found`,
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
        `[controllers/qr.controller]-[QrController.getQrCode]-Getting QR code for user_id: ${user_id}`,
      );
      if (!user_id) {
        logger.error(
          `[controllers/qr.controller]-[QrController.getQrCode]-Missing user_id`,
        );
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          statusMessage.BAD_REQUEST,
          null,
        );
        return;
      }
      const qrData = await qrRepo.getQrCodeData(user_id);
      logger.info(
        `[controllers/qr.controller]-[QrController.getQrCode]-QR code data: ${JSON.stringify(
          qrData,
        )}`,
      );

      if (!qrData) {
        logger.error(
          `[controllers/qr.controller]-[QrController.getQrCode]-No QR code data found for user_id: ${user_id}`,
        );
        sendResponse(
          res,
          Number(statusCode.NOT_FOUND),
          statusMessage.NOT_FOUND,
          null,
        );
        return;
      }
      if (qrData.length === 0) {
        logger.error(
          `[controllers/qr.controller]-[QrController.getQrCode]-No QR code data found for user_id: ${user_id}`,
        );
        sendResponse(
          res,
          Number(statusCode.NOT_FOUND),
          statusMessage.NOT_FOUND,
          null,
        );
        return;
      }
      const nowUTC = moment();

      const lunchStartUTC = parseEnvTime(process.env.LUNCH_START_UTC!);
      const lunchEndUTC = parseEnvTime(process.env.LUNCH_END_UTC!);
      const dinnerStartUTC = parseEnvTime(process.env.DINNER_START_UTC!);
      const dinnerEndUTC = parseEnvTime(process.env.DINNER_END_UTC!).add(
        1,
        'day',
      );

      logger.warn(
        `[controllers/qr.controller]-[QrController.getQrCode]-Current UTC time: ${nowUTC}`,
      );
      if (qrData.time_to_food === 'lunch') {
        if (nowUTC.isBetween(lunchStartUTC, lunchEndUTC, undefined, '[]')) {
          logger.info(
            `[controllers/qr.controller]-[QrController.getQrCode]-QR code data retrieved successfully: ${JSON.stringify(
              qrData,
            )}`,
          );
          return sendResponse(
            res,
            Number(statusCode.SUCCESS),
            statusMessage.SUCCESS,
            qrData,
          );
        }
      } else if (qrData.time_to_food === 'dinner') {
        if (nowUTC.isBetween(dinnerStartUTC, dinnerEndUTC, undefined, '[]')) {
          logger.info(
            `[controllers/qr.controller]-[QrController.getQrCode]-QR code data retrieved successfully: ${JSON.stringify(
              qrData,
            )}`,
          );
          return sendResponse(
            res,
            Number(statusCode.SUCCESS),
            statusMessage.SUCCESS,
            qrData,
          );
        }
      } else {
        if (nowUTC.isBetween(dinnerStartUTC, dinnerEndUTC, undefined, '[]')) {
          logger.info(
            `[controllers/qr.controller]-[QrController.getQrCode]-QR code data retrieved successfully: ${JSON.stringify(
              qrData,
            )}`,
          );
          return sendResponse(
            res,
            Number(statusCode.SUCCESS),
            statusMessage.SUCCESS,
            qrData,
          );
        } else if (
          nowUTC.isBetween(lunchStartUTC, lunchEndUTC, undefined, '[]')
        ) {
          logger.info(
            `[controllers/qr.controller]-[QrController.getQrCode]-QR code data retrieved successfully: ${JSON.stringify(
              qrData,
            )}`,
          );
          return sendResponse(
            res,
            Number(statusCode.SUCCESS),
            statusMessage.SUCCESS,
            qrData,
          );
        }
      }

      logger.error(
        `[controllers/qr.controller]-[QrController.getQrCode]-Invalid time_to_food value: ${qrData.time_to_food}`,
      );
      return sendResponse(
        res,
        Number(statusCode.BAD_REQUEST),
        'No Qr Code available for this time',
        null,
      );
    } catch (error) {
      logger.error(
        `[controllers/qr.controller]-[QrController.getQrCode]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  async dailyCount(req: Request, res: Response): Promise<void> {
    try {
      const dailyQrData = await qrRepo.getDailyCount();
      logger.info(
        `[controllers/qr.controller]-[QrController.dailyCount]-Daily QR code data: ${JSON.stringify(
          dailyQrData,
        )}`,
      );
      if (!dailyQrData) {
        logger.error(
          `[controllers/qr.controller]-[QrController.dailyCount]-No daily QR code data found`,
        );
        sendResponse(
          res,
          Number(statusCode.NOT_FOUND),
          statusMessage.NOT_FOUND,
          null,
        );
        return;
      }
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        dailyQrData,
      );
    } catch (error) {
      logger.error(
        `[controllers/qr.controller]-[QrController.dailyCount]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  async weeklyCount(req: Request, res: Response): Promise<void> {
    try {
      const weeklyQrData = await qrRepo.getWeeklyCount();
      logger.info(
        `[controllers/qr.controller]-[QrController.weeklyCount]-Weekly QR code data: ${JSON.stringify(
          weeklyQrData,
        )}`,
      );
      if (!weeklyQrData) {
        logger.error(
          `[controllers/qr.controller]-[QrController.weeklyCount]-No weekly QR code data found`,
        );
        sendResponse(
          res,
          Number(statusCode.NOT_FOUND),
          statusMessage.NOT_FOUND,
          null,
        );
        return;
      }
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        weeklyQrData,
      );
    } catch (error) {
      logger.error(
        `[controllers/qr.controller]-[QrController.weeklyCount]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }
  async monthlyCount(req: Request, res: Response): Promise<void> {
    try {
      const monthlyQrData = await qrRepo.getMonthlyCount();
      logger.info(
        `[controllers/qr.controller]-[QrController.monthlyCount]-Monthly QR code data: ${JSON.stringify(
          monthlyQrData,
        )}`,
      );
      if (!monthlyQrData) {
        logger.error(
          `[controllers/qr.controller]-[QrController.monthlyCount]-No monthly QR code data found`,
        );
        sendResponse(
          res,
          Number(statusCode.NOT_FOUND),
          statusMessage.NOT_FOUND,
          null,
        );
        return;
      }
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        monthlyQrData,
      );
    } catch (error) {
      logger.error(
        `[controllers/qr.controller]-[QrController.monthlyCount]-Error: ${error}`,
      );
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }

  async mealSummary(req: Request, res: Response): Promise<void> {
    try {
      const { summaryOf, timeToFood } = req.params;
      logger.info(
        `[controllers/qr.controller]-[QrController.mealSummary]-Scanning QR code with data: ${JSON.stringify(req.body)}`,
      );

      const allowedSummaries = [
        'availed',
        'meal-opted',
        'absentee',
        'opt-out-temp',
      ];
      const allowedTime = ['lunch', 'dinner'];
      if (
        !allowedSummaries.includes(summaryOf) ||
        !allowedTime.includes(timeToFood)
      ) {
        logger.error(
          `[controllers/qr.controller]-[QrController.mealSummary]-Error: Invalid parameter`,
        );
        return sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          statusMessage.INTERNAL_SERVER_ERROR,
          null,
        );
      }
      logger.info(
        `[controllers/qr.controller]-[QrController.mealSummary]-Fetching the meal summary data`,
      );

      const result =
        timeToFood === 'lunch'
          ? summaryOf === 'meal-opted'
            ? 'lunchopted'
            : summaryOf === 'absentee'
              ? 'lunchabsent'
              : summaryOf === 'availed'
                ? 'lunchavailed'
                : summaryOf === 'opt-out-temp'
                  ? 'lunchOptOut'
                  : ''
          : timeToFood === 'dinner'
            ? summaryOf === 'meal-opted'
              ? 'dinneropted'
              : summaryOf === 'absentee'
                ? 'dinnerabsent'
                : summaryOf === 'availed'
                  ? 'dinneravailed'
                  : summaryOf === 'opt-out-temp'
                    ? 'dinnerOptOut'
                    : ''
            : '';
      let summary;
      switch (result) {
        case 'lunchopted':
          summary = await qrRepo.getDetailedMealOptedSummary(timeToFood);
          logger.info(
            `[controllers/qr.controller]-[QrController.mealSummary]-Fetched the meal opted summary for lunch successfully`,
          );
          sendResponse(
            res,
            Number(statusCode.SUCCESS),
            statusMessage.SUCCESS,
            summary,
          );
          break;
        case 'dinneropted':
          summary = await qrRepo.getDetailedMealOptedSummary(timeToFood);
          logger.info(
            `[controllers/qr.controller]-[QrController.mealSummary]-Fetched the meal opted summary for dinner successfully`,
          );
          sendResponse(
            res,
            Number(statusCode.SUCCESS),
            statusMessage.SUCCESS,
            summary,
          );
          break;
        case 'lunchavailed':
          summary = await qrRepo.getDetailedAvailedSummary(timeToFood);
          logger.info(
            `[controllers/qr.controller]-[QrController.mealSummary]-Fetched the availed meal summary for lunch successfully`,
          );
          sendResponse(
            res,
            Number(statusCode.SUCCESS),
            statusMessage.SUCCESS,
            summary,
          );
          break;
        case 'dinneravailed':
          summary = await qrRepo.getDetailedAvailedSummary(timeToFood);
          logger.info(
            `[controllers/qr.controller]-[QrController.mealSummary]-Fetched the availed meal summary for dinner successfully`,
          );
          sendResponse(
            res,
            Number(statusCode.SUCCESS),
            statusMessage.SUCCESS,
            summary,
          );
          break;
        case 'lunchabsent':
          summary = await qrRepo.getDetailedAbsenteeSummary(timeToFood);
          logger.info(
            `[controllers/qr.controller]-[QrController.mealSummary]-Fetched the absentee summary for lunch successfully`,
          );
          sendResponse(
            res,
            Number(statusCode.SUCCESS),
            statusMessage.SUCCESS,
            summary,
          );
          break;
        case 'dinnerabsent':
          summary = await qrRepo.getDetailedAbsenteeSummary(timeToFood);
          logger.info(
            `[controllers/qr.controller]-[QrController.mealSummary]-Fetched the absentee summary for dinner successfully`,
          );
          sendResponse(
            res,
            Number(statusCode.SUCCESS),
            statusMessage.SUCCESS,
            summary,
          );
          break;
        case 'lunchOptOut':
          summary = await qrRepo.getDetailedOptedOutSummary(timeToFood);
          logger.info(
            `[controllers/qr.controller]-[QrController.mealSummary]-Fetched the opted out summary for lunch successfully`,
          );
          sendResponse(
            res,
            Number(statusCode.SUCCESS),
            statusMessage.SUCCESS,
            summary,
          );
          break;
        case 'dinnerOptOut':
          summary = await qrRepo.getDetailedOptedOutSummary(timeToFood);
          logger.info(
            `[controllers/qr.controller]-[QrController.mealSummary]-Fetched the opted out summary for dinner successfully`,
          );
          sendResponse(
            res,
            Number(statusCode.SUCCESS),
            statusMessage.SUCCESS,
            summary,
          );
          break;
        default:
          sendResponse(
            res,
            Number(statusCode.BAD_REQUEST),
            statusMessage.BAD_REQUEST,
            null,
          );
          break;
      }
    } catch (error) {
      logger.error(
        `[controllers/qr.controller]-[QrController.mealSummary]-Error: ${error}`,
      );
    }
  }

  async weeklyMonthlySummary(req: Request, res: Response): Promise<void> {
    const { type } = req.params;
    try {
      logger.info(
        `[controllers/qr.controller]-[QrController.weeklyMonthlySummary]-Fetching ${type} data`,
      );
      let data;

      if (type === 'weekly') {
        data = await qrRepo.weeklyDownload();
        logger.info(
          `[controllers/qr.controller]-[QrController.weeklyMonthlySummary]-Weekly data fetched successfully`,
        );
      } else if (type === 'monthly') {
        data = await qrRepo.monthlyDownload();
        logger.info(
          `[controllers/qr.controller]-[QrController.weeklyMonthlySummary]-Monthly data fetched successfully`,
        );
      } else {
        logger.error(
          `[controllers/qr.controller]-[QrController.weeklyMonthlySummary]-Invalid type: ${type}`,
        );
        res.status(400).send('Invalid type. Use "weekly" or "monthly".');
        return;
      }
      logger.info(
        `[controllers/qr.controller]-[QrController.weeklyMonthlySummary]-Summary fetched successfully`,
      );
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        data,
      );
    } catch (error) {
      logger.error(
        `[controllers/qr.controller]-[QrController.weeklyMonthlySummary]-Error: ${error}`,
      );
      res.status(500).send('Error fetching summary data');
    }
  }

  async weeklyMonthlyPagination(req: Request, res: Response): Promise<void> {
    const { type, flag, page } = req.params;
    try {
      if (
        !['consumed', 'absent', 'opt-out-temp', 'opt-out-perm'].includes(
          flag,
        ) ||
        !['weekly', 'monthly'].includes(type)
      ) {
        logger.error(`Invalid type ${type} or invalid flag ${flag}`);
        res.status(400).send('Invalid params');
      }
      const parsedPage = Number(page);
      logger.info(
        `[controllers/qr.controller]-[QrController.weeklyMonthlyPagination]-Fetching ${type} data`,
      );
      let data;

      if (type === 'weekly') {
        data = await qrRepo.weeklyPagination(flag, parsedPage);
        logger.info(
          `[controllers/qr.controller]-[QrController.weeklyMonthlyPagination]-Weekly data fetched successfully`,
        );
      } else if (type === 'monthly') {
        data = await qrRepo.monthlyPagination(flag, parsedPage);
        logger.info(
          `[controllers/qr.controller]-[QrController.weeklyMonthlyPagination]-Monthly data fetched successfully`,
        );
      } else {
        logger.error(
          `[controllers/qr.controller]-[QrController.weeklyMonthlyPagination]-Invalid type: ${type}`,
        );
        res.status(400).send('Invalid type. Use "weekly" or "monthly".');
        return;
      }
      logger.info(
        `[controllers/qr.controller]-[QrController.weeklyMonthlyPagination]-Summary fetched successfully`,
      );
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        data,
      );
    } catch (error) {
      logger.error(
        `[controllers/qr.controller]-[QrController.weeklyMonthlyPagination]-Error: ${error}`,
      );
      res.status(500).send('Error fetching summary data');
    }
  }
}

export default QrController;
