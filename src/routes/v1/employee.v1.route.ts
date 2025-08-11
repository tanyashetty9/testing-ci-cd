import { Router } from 'express';
import EmployeeController from '../../controllers/employee.controller';
import {
  isAuthenticated,
  rolesToAccess,
} from '../../middlewares/auth.middleware';
import { userRole } from '../../constants';

const router: Router = Router();
const employeeController = new EmployeeController();
const { ADMIN, MANAGER } = userRole as {
  ADMIN: string;
  MANAGER: string;
};

router.post(
  '/create',
  isAuthenticated,
  rolesToAccess(ADMIN),
  employeeController.createEmployee.bind(employeeController),
);
router.get(
  '/get-qr-data/:id',
  isAuthenticated,
  rolesToAccess(ADMIN, MANAGER),
  employeeController.getEmployeeQrDetails.bind(employeeController),
);
router.get(
  '/get-all',
  isAuthenticated,
  rolesToAccess(ADMIN, MANAGER),
  employeeController.getAllEmployees.bind(employeeController),
);
router.get(
  '/:id',
  isAuthenticated,
  rolesToAccess(ADMIN, MANAGER),
  employeeController.getEmployeeById.bind(employeeController),
);
router.put(
  '/update/:id',
  isAuthenticated,
  rolesToAccess(ADMIN),
  employeeController.updateEmployee.bind(employeeController),
);

export default router;
