import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

export const createMonitor = async(req, res) => {
    const {name, url, check_intervel_minutes} = req.body

    if(!name || !url || !check_intervel_minutes){
        console.log("Required fields are empty");
        return res.status(404).json({success: "false", message:"Please fill required fields"});
    }

    try {
        const new_monitor = await prisma.monitor.create({
        data:{
            name,
            url,
            check_intervel_minutes
        }
    });

    return res.status(200).json( new_monitor);
    } catch (error) {
        console.log("error creating new monitor",error);

        return res.status(500).json("Internel server error");
    }
}

export const getAllMonitors = async(req, res) => {
    try {
        const monitors = await prisma.monitor.findMany();

        if(!monitors){
            return res.status(404).json("No record found")
        }

        return res.status(200).json(monitors);

    } catch (error) {
         console.log("error fetching all monitors",error);

        return res.status(500).json("Internel server error");
    }
}

export const getMonitorById = async(req, res) => {
    try {
        const {id} = req.params;
        const monitor = await prisma.monitor.findUnique({
            where: {id: Number(id)}
        });

        if(!monitor){
            return res.status(404).json("No record found")
        }

        return res.status(200).json(monitor);
    } catch (error) {
          console.log("error fetching monitor",error);

        return res.status(500).json("Internel server error");
    }
}

export const deleteMonitor = async(req, res) => {
    const {id} = req.params;

    if(!id){
        return res.status(404).json("No id found");
    }

    const data = await prisma.monitor.delete({
        where: {id: Number(id)}
    })

    if(!data){
        return res.status(404).json("No monitor found")
    }

    return res.status(200).json("Monitor deleted successfully")
}