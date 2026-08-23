import { Router } from 'express';
import { trackPublicJobs } from '../controller/jobController';
import { publicTrackRateLimiter } from '../middleware/rateLimitMiddleware';
import { validateRequest } from '../middleware/validateRequest';
import { publicTrackSchema } from '../validators/jobValidators';

const router = Router();
router.post('/track', publicTrackRateLimiter, validateRequest({ body: publicTrackSchema }), trackPublicJobs);

export default router;
