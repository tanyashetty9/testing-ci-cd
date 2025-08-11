import QrController from '../../controllers/qr.controller';
import { Router } from 'express';
import {
  isAuthenticated,
  rolesToAccess,
} from '../../middlewares/auth.middleware';
import { userRole } from '../../constants';
import FileController from '../../controllers/file.controller';

const router: Router = Router();
const qrController = new QrController();
const fileController = new FileController();
const { ADMIN, MANAGER } = userRole as {
  ADMIN: string;
  MANAGER: string;
};

router.post('/scan', qrController.scanQrCode.bind(qrController));
router.get('/get-qr', qrController.getQrCode.bind(qrController));

router.get(
  '/daily',
  isAuthenticated,
  rolesToAccess(ADMIN, MANAGER),
  qrController.dailyCount.bind(qrController),
);
router.get(
  '/weekly',
  isAuthenticated,
  rolesToAccess(ADMIN, MANAGER),
  qrController.weeklyCount.bind(qrController),
);
router.get(
  '/monthly',
  isAuthenticated,
  rolesToAccess(ADMIN, MANAGER),
  qrController.monthlyCount.bind(qrController),
);

router.get(
  '/meal-details/:summaryOf/:timeToFood',
  isAuthenticated,
  rolesToAccess(ADMIN, MANAGER),
  qrController.mealSummary.bind(qrController),
);
router.get(
  '/summary/:type',
  isAuthenticated,
  rolesToAccess(ADMIN, MANAGER),
  qrController.weeklyMonthlySummary.bind(qrController),
);

router.get(
  '/meal-details/:summaryOf/:timeToFood/download',
  isAuthenticated,
  rolesToAccess(ADMIN, MANAGER),
  fileController.dailyReport.bind(fileController),
);
router.get(
  '/:type/download',
  isAuthenticated,
  rolesToAccess(ADMIN, MANAGER),
  fileController.downloadWeeklyMonthly.bind(fileController),
);

export default router;
