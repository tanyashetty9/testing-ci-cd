import moment from 'moment';
import { sequelize } from '../config/postgres.config';
import NotificationModel from '../models/notification.model';
import UserModel from '../models/user.model';
import UserOptingPivotModel from '../models/userOptingPivot.model';
import { logger } from '../utils/logger.util';
import { QueryTypes } from 'sequelize';

class NotificationRepository {
  async updateNotification(
    notification_id: string,
    notification_type: string,
    is_admin_approved: string,
  ) {
    try {
      const transaction = await sequelize?.transaction();
      logger.info(
        `[repositories/notification.repository]-[NotificationRepository.updateNotification]-Updating notification with ID: ${notification_id}`,
      );
      const notif = await NotificationModel.findOne({
        where: {
          id: notification_id,
        },
        transaction: transaction,
      });
      if (!notif) {
        logger.warn(
          `[repositories/notification.repository]-[NotificationRepository.updateNotification]-No notification found with ID: ${notification_id}`,
        );
        return null;
      }
      const updatedNotification = await NotificationModel.update(
        {
          notification_type: notification_type,
          is_admin_approved: is_admin_approved,
        },
        {
          where: {
            id: notification_id,
          },
          transaction: transaction,
        },
      );
      if (updatedNotification[0] === 0) {
        logger.warn(
          `[repositories/notification.repository]-[NotificationRepository.updateNotification]-No notification found with ID: ${notification_id}`,
        );
        return null;
      }
      switch (notification_type) {
        case 'opt-out-perm':
          if (is_admin_approved === 'approved') {
            logger.info(
              `[repositories/notification.repository]-[NotificationRepository.updateNotification]-Updating user opt status to opt-out-perm`,
            );
            const pivotUserOpt = await UserOptingPivotModel.create(
              {
                user_id: notif.getDataValue('user_id'),
                opt_out_time_from: moment().format('YYYY-MM-DD HH:mm:ss'),
                opt_out_time_to: moment()
                  .add(2, 'months')
                  .format('YYYY-MM-DD HH:mm:ss'),
                is_admin_approved: 'pending',
              },
              { transaction },
            );
            if (!pivotUserOpt) {
              logger.warn(
                `[repositories/notification.repository]-[NotificationRepository.updateNotification]-No user opting pivot found with ID: ${notification_id}`,
              );
              return 'User opting pivot not found';
            }
            logger.info(
              `[repositories/notification.repository]-[NotificationRepository.updateNotification]-User opt status updated to opt-out-perm`,
            );
            const user = await UserModel.findOne({
              where: {
                id: notif.getDataValue('user_id'),
              },
              transaction,
            });
            if (!user) {
              logger.warn(
                `[repositories/notification.repository]-[NotificationRepository.updateNotification]-No user found with ID: ${notif.getDataValue('user_id')}`,
              );
              return 'User not found';
            }
            const userData = await UserModel.update(
              {
                counter: Number(user.get('counter')) - 1,
                opt_status: 'opt-out-perm',
              },
              {
                where: {
                  id: notif.getDataValue('user_id'),
                },
                transaction,
              },
            );
            if (!userData) {
              logger.warn(
                `[repositories/notification.repository]-[NotificationRepository.updateNotification]-No user found with ID: ${notif.getDataValue('user_id')}`,
              );
              return 'User not found';
            }
          }
          break;

        case 'opt-in':
          logger.info(
            `[repositories/notification.repository]-[NotificationRepository.updateNotification]-Updating user opt status to opt-in`,
          );
          if (is_admin_approved === 'approved') {
            logger.info(
              `[repositories/notification.repository]-[NotificationRepository.updateNotification]-Updating user opt status to opt-in`,
            );
            const user = await UserModel.update(
              {
                opt_status: 'opt-in',
              },
              {
                where: {
                  id: notif.getDataValue('user_id'),
                },
                transaction: transaction,
              },
            );
            if (user[0] === 0) {
              logger.warn(
                `[repositories/notification.repository]-[NotificationRepository.updateNotification]-No user found with ID: ${notif.getDataValue('user_id')}`,
              );
              return 'User not found';
            }
            logger.info(
              `[repositories/notification.repository]-[NotificationRepository.updateNotification]-User opt status updated to opt-in`,
            );
          }
          break;

        default:
          logger.warn(
            `[repositories/notification.repository]-[NotificationRepository.updateNotification]-Unhandled notification type: ${notification_type}`,
          );
          break;
      }
      await transaction?.commit();
      logger.info(
        `[repositories/notification.repository]-[NotificationRepository.updateNotification]-Notification updated successfully`,
      );
      return 'Success';
    } catch (error) {
      logger.error(
        `[repositories/notification.repository]-[NotificationRepository.updateNotification]- Update Notification failed with ${error}`,
      );
      throw error;
    }
  }
  async getAllNotifications(): Promise<Object[]> {
    try {
      logger.info(
        `[repositories/notification.repository]-[NotificationRepository.getAllNotifications]-Fetching all notifications`,
      );
      const query = `
        SELECT 
          n.id, 
          n.notification_type, 
          n.notification_details, 
          n.is_admin_approved, 
          n.created_at, 
          CONCAT(e.first_name, ' ', e.last_name) AS full_name, 
          e.employee_number
        FROM notifications AS n
        JOIN users AS u ON n.user_id = u.id
        JOIN employees AS e ON u.employee_id = e.id
        WHERE n.is_admin_approved = 'pending'
          AND n.created_at = (
        SELECT MAX(n2.created_at)
        FROM notifications n2
        WHERE n2.user_id = n.user_id AND n2.is_admin_approved = 'pending'
          )
        ORDER BY n.created_at DESC;
      `;
      logger.info(
        `[repositories/notification.repository]-[NotificationRepository.getAllNotifications]- Query: ${query}`,
      );
      const notifications = await sequelize.query(query, {
        type: QueryTypes.SELECT,
      });
      logger.info(
        `[repositories/notification.repository]-[NotificationRepository.getAllNotifications]- Fetched Notifications ${notifications}`,
      );
      return notifications;
    } catch (error) {
      logger.error(
        `[repositories/notification.repository]-[NotificationRepository.getAllNotifications]-Error: ${error}`,
      );
      throw error;
    }
  }

  async getLatestNotification(userId: string | null): Promise<any> {
    try {
      logger.info(
        `[repositories/notification.repository]-[NotificationRepository.getLatestNotification]-Fetching latest notification for user ID: ${userId}`,
      );
      return await NotificationModel.findOne({
        where: {
          user_id: userId,
        },
        order: [['created_at', 'DESC']],
      });
    } catch (error) {
      logger.error(
        `[repositories/notification.repository]-[NotificationRepository.getLatestNotification]-Error: ${error}`,
      );
      throw error;
    }
  }
}

export default NotificationRepository;
