import { Router } from 'express';
import {
  isAuthenticated,
  rolesToAccess,
} from '../../middlewares/auth.middleware';
import QrController from '../../controllers/qr.controller';
import { userRole } from '../../constants';

const router: Router = Router();
const qrController = new QrController();
const { ADMIN, MANAGER } = userRole as {
  ADMIN: string;
  MANAGER: string;
};
router.get(
  '/summary/:type/:flag/:page',
  isAuthenticated,
  rolesToAccess(ADMIN, MANAGER),
  qrController.weeklyMonthlyPagination.bind(qrController),
);

export default router;
