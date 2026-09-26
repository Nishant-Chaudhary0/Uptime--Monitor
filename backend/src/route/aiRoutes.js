import express from 'express';
import { askQuestion } from '../controllers/aiQueryController.js'
import { protect } from '../middleware/authMiddleware.js';

const aiRouter = express.Router();
aiRouter.use(protect);
aiRouter.post('/ask', askQuestion);

export default aiRouter;