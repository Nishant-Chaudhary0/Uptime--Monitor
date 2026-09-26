import express from "express";
import dotenv from 'dotenv';
import { authRouter } from "./route/authRoutes.js";
import { monitorRoute } from "./route/monitorRoutes.js";
import { checkRouter } from "./route/checkRoutes.js";
import { incidentRouter } from "./route/incidentRoutes.js";
import aiRouter from "./route/aiRoutes.js";
import cors from 'cors';

dotenv.config();

const app = express();

const port = process.env.PORT ;

app.use(cors());
app.use(express.json());
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/monitor",  monitorRoute)
app.use("/api/v1/check", checkRouter);;
app.use("/api/v1/incident", incidentRouter);
app.use("/api/v1/ai",aiRouter);

app.listen(port,() => {
    console.log("server is running on port :",port);
})