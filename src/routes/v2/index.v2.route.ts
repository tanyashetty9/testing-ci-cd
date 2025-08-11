import { Router } from 'express';
import userV2Routes from './user.v2.route';
import adminV2Routes from './admin.v2.route';
import departmentV2Routes from './department.v2.route';

const router: Router = Router();

router.use('/user', userV2Routes);
router.use('/admin', adminV2Routes);
router.use('/department', departmentV2Routes);

export default router;
