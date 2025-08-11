import NotificationRepository from '../repositories/notification.repository';
import { Request, Response } from 'express';
import { sendResponse } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { statusCode, statusMessage } from '../constants';

const notificationRepository = new NotificationRepository();

class AdminController {
  async validateUserOptRequest(req: Request, res: Response) {
    try {
      const { notification_id, notification_type, is_admin_approved } =
        req.body;
      logger.info(
        `[controllers/auth.controller]-[AdminController.validateUserOptRequest]-Validating user opt request with notification_id: ${notification_id}`,
      );
      const message = await notificationRepository.updateNotification(
        notification_id,
        notification_type,
        is_admin_approved,
      );
      if (message !== 'Success') {
        sendResponse(
          res,
          Number(statusCode.BAD_REQUEST),
          message as string,
          null,
        );
        return;
      }
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        null,
      );
    } catch (error) {
      logger.error(
        `[controllers/auth.controller]-[AdminController.validateUserOptRequest]-Error: ${error}`,
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

export default AdminController;
