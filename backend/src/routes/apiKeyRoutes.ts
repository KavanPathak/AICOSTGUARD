import { Router } from 'express';
import { generateApiKey, getApiKeysByApp, revokeApiKey } from '../controllers/apiKeyController';
import { requireAuth } from '../middleware/auth';

const router = Router();

// API Key management routes require JWT dashboard authentication
router.use(requireAuth);

router.post('/generate', generateApiKey);
router.get('/app/:appId', getApiKeysByApp);
router.delete('/:keyId', revokeApiKey);

export default router;
