import express from 'express';
import { askQuestion } from '../controllers/aiQueryController.js'

const aiRouter = express.Router();
aiRouter.post('/ask', askQuestion);

export default aiRouter;