import { Router } from 'express';
import AuthController from '../../controllers/auth.controller';
import { isAuthenticated } from '../../middlewares/auth.middleware';

const router: Router = Router();
const authController = new AuthController();

router.post('/login', authController.login.bind(authController));
router.post(
  '/logout',
  isAuthenticated,
  authController.logout.bind(authController),
);
router.get(
  '/get-me',
  isAuthenticated,
  authController.getCurrentUser.bind(authController),
);

export default router;
