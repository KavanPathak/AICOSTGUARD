import { Router } from 'express';
import { getOverviewStats, getChartsData, getRequestLogs } from '../controllers/analyticsController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Dashboard analytics requires JWT Auth
router.use(requireAuth);

router.get('/overview/:appId', getOverviewStats);
router.get('/charts/:appId', getChartsData);
router.get('/logs/:appId', getRequestLogs);

export default router;
