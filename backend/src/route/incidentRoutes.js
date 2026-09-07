import express from 'express';
import { getAllIncidents, getIncidentById, getIncidentForMonitor } from '../controllers/incidentControllers.js';

export const incidentRouter = express.Router();

incidentRouter.get("/get-all-incidents", getAllIncidents);
incidentRouter.get("/get-incident-by-id", getIncidentById);
incidentRouter.get("/get-incident-by-monitor/:id", getIncidentForMonitor);
