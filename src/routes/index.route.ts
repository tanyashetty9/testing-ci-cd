import { Router } from 'express';
import v1Routes from './v1/index.v1.route';
import v2Routes from './v2/index.v2.route';

const router: Router = Router();

router.use('/v1', v1Routes);
router.use('/v2', v2Routes);

export default router;
