import { Router } from 'express';
import { trackPublicJobs } from '../jobs/job.controller';
import { publicTrackRateLimiter } from '../../shared/middleware/rate-limit.middleware';
import { validateRequest } from '../../shared/middleware/validate.middleware';
import { publicTrackSchema } from '../jobs/job.validators';

const router = Router();
router.post('/track', publicTrackRateLimiter, validateRequest({ body: publicTrackSchema }), trackPublicJobs);

export default router;
