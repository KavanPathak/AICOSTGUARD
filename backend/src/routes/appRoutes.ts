import { Router } from 'express';
import { getApps, getAppById, createApp, updateApp, deleteApp } from '../controllers/appController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// All App routes require JWT Auth
router.use(requireAuth);

router.get('/', getApps);
router.get('/:appId', getAppById);
router.post('/', createApp);
router.put('/:appId', updateApp);
router.delete('/:appId', deleteApp);

export default router;
