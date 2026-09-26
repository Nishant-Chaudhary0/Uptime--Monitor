import express from 'express';
import { getAllIncidents, getIncidentById, getIncidentForMonitor } from '../controllers/incidentControllers.js';
import { protect } from '../middleware/authMiddleware.js';

export const incidentRouter = express.Router();

incidentRouter.use(protect);

incidentRouter.get("/get-all-incidents", getAllIncidents);
incidentRouter.get("/get-incident-by-id/:id", getIncidentById);
incidentRouter.get("/get-incident-by-monitor/:id", getIncidentForMonitor);
