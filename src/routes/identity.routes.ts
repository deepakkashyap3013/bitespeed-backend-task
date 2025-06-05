import { Router, RequestHandler } from 'express';
import { identifyContact } from '../controllers/indentity.controller';

const router = Router();

router.post('/identify', identifyContact as RequestHandler);

export default router;

