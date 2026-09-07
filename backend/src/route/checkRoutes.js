import express from "express";
import { getChecksForMonitor, getUpStatsTime } from "../controllers/checkControllers.js";

export const checkRouter = express.Router();

checkRouter.get("/get-checks-by-monitor/:id", getChecksForMonitor);
checkRouter.get("/get-uptime-stats/:id/uptime", getUpStatsTime);