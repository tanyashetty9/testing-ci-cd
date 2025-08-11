import NotificationRepository from '../repositories/notification.repository';
import { sendResponse } from '../utils/response.util';
import { Request, Response } from 'express';
import { statusCode, statusMessage } from '../constants';

class NotificationController {
  async getAllNotifications(req: Request, res: Response): Promise<void> {
    try {
      const notificationRepo = new NotificationRepository();
      const notifications = await notificationRepo.getAllNotifications();
      sendResponse(
        res,
        Number(statusCode.SUCCESS),
        statusMessage.SUCCESS,
        notifications,
      );
    } catch (error) {
      console.error(error);
      sendResponse(
        res,
        Number(statusCode.INTERNAL_SERVER_ERROR),
        statusMessage.INTERNAL_SERVER_ERROR,
        null,
      );
    }
  }
}

export default NotificationController;
