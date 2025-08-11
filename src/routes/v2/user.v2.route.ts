import { Router } from 'express';
import UserController from '../../controllers/user.controller';
import { isAuthenticated } from '../../middlewares/auth.middleware';

const router: Router = Router();
const userController = new UserController();

router.post(
  '/temp-opt-in',
  isAuthenticated,
  userController.temporaryOptIn.bind(userController),
);

export default router;
