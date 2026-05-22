import { Router } from 'express';
import { getAlertsByApp, resolveAlert } from '../controllers/alertController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// Alerts management requires JWT Auth
router.use(requireAuth);

router.get('/app/:appId', getAlertsByApp);
router.put('/resolve/:alertId', resolveAlert);

export default router;
