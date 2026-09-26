import express from 'express';
import { createMonitor, deleteMonitor, getAllMonitors, getMonitorById } from '../controllers/monitorControllers.js';
import { protect } from '../middleware/authMiddleware.js';

export const monitorRoute = express.Router();

monitorRoute.use(protect);

monitorRoute.post("/create-monitor", createMonitor);
monitorRoute.get("/get-all-monitors", getAllMonitors);
monitorRoute.get("/get-monitor-by-id/:id", getMonitorById);
monitorRoute.delete("/delete-monitor/:id", deleteMonitor)