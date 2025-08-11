import { Router } from 'express';
import userRoutes from './user.v1.route';
import employeeRoutes from './employee.v1.route';
import authRoutes from './auth.v1.route';
import qrRoutes from './qr.v1.route';
import adminRoutes from './admin.v1.route';

const router: Router = Router();

router.use('/user', userRoutes);
router.use('/employee', employeeRoutes);
router.use('/auth', authRoutes);
router.use('/qr', qrRoutes);
router.use('/admin', adminRoutes);

export default router;
