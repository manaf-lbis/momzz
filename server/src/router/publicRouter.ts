import { Router } from 'express';
import { trackPublicJobs } from '../controller/jobController';

const router = Router();
router.post('/track', trackPublicJobs);

export default router;
