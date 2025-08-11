import { Router } from 'express';
import {
  isAuthenticated,
  rolesToAccess,
} from '../../middlewares/auth.middleware';
import { userRole } from '../../constants';
import DepartmentController from '../../controllers/department.controller';

const router: Router = Router();
const departmentController = new DepartmentController();
const { ADMIN, MANAGER } = userRole as {
  ADMIN: string;
  MANAGER: string;
};

router.post(
  '/',
  isAuthenticated,
  rolesToAccess(ADMIN, MANAGER),
  departmentController.createDepartment.bind(departmentController),
);

export default router;
