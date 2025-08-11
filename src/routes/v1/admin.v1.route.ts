import { Router } from 'express';
import {
  isAuthenticated,
  rolesToAccess,
} from '../../middlewares/auth.middleware';
import { userRole } from '../../constants';
import AdminController from '../../controllers/admin.controller';
import NotificationController from '../../controllers/notification.controller';

const { ADMIN } = userRole as {
  ADMIN: string;
  MANAGER: string;
};
const router = Router();
const adminController = new AdminController();
const notificationController = new NotificationController();

router.post(
  '/validate-user-opt-request',
  isAuthenticated,
  rolesToAccess(ADMIN),
  adminController.validateUserOptRequest,
);
router.get(
  '/get-all-notifications',
  isAuthenticated,
  rolesToAccess(ADMIN),
  notificationController.getAllNotifications,
);

export default router;
