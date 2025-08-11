import { Router } from 'express';
import UserController from '../../controllers/user.controller';
import { isAuthenticated } from '../../middlewares/auth.middleware';

const router: Router = Router();
const userController = new UserController();

router.post('/activate', userController.activateUser.bind(userController));
router.put(
  '/update-password',
  userController.updatePassword.bind(userController),
);
router.post(
  '/opt-out-temporary',
  isAuthenticated,
  userController.optOutForPeriod.bind(userController),
);
router.post(
  '/opt-out-permanent',
  isAuthenticated,
  userController.optOutPermanent.bind(userController),
);
router.post(
  '/opt-in',
  isAuthenticated,
  userController.optIn.bind(userController),
);
router.get(
  '/temp-opt-out-dates',
  isAuthenticated,
  userController.getTempOPtOutDates.bind(userController),
);

export default router;
