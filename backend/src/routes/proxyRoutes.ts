import { Router } from 'express';
import { proxyChat } from '../controllers/proxyController';
import { requireApiKey } from '../middleware/auth';

const router = Router();

// POST /api/proxy/chat
// Authenticated via API Key (Bearer key)
router.post('/chat', requireApiKey, proxyChat);

export default router;
