import express from "express";
import dotenv from 'dotenv';
import { monitorRoute } from "./route/monitorRoutes.js";

dotenv.config();

const app = express();

const port = process.env.PORT ;


app.use(express.json());
app.use("/api/v1/monitor",  monitorRoute)

app.listen(port,() => {
    console.log("server is running on port :",port);
})