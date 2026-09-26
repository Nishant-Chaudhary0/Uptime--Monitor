import { prisma } from "../config/db.js";

export const createMonitor = async(req, res) => {
    const {name, url, check_intervel_minutes} = req.body

    if(!name || !url){
        return res.status(400).json({success: false, message:"Please fill required fields"});
    }

    try {
        const new_monitor = await prisma.monitor.create({
            data:{
                name,
                url,
                check_intervel_minutes,
                user_id: req.user.id,
            }
        });

        return res.status(201).json(new_monitor);
    } catch (error) {
        console.log("error creating new monitor",error);
        return res.status(500).json({success: false, message: "Internal server error"});
    }
}

export const getAllMonitors = async(req, res) => {
    try {
        const monitors = await prisma.monitor.findMany({
            where: { user_id: req.user.id },
            orderBy: { createdAt: 'desc' },
        });

        return res.status(200).json(monitors);
    } catch (error) {
        console.log("error fetching all monitors",error);
        return res.status(500).json({success: false, message: "Internal server error"});
    }
}

export const getMonitorById = async(req, res) => {
    try {
        const {id} = req.params;

        // findFirst (not findUnique) so we can combine the id lookup with the
        // ownership check in a single query: a monitor owned by someone else
        // simply won't be found, and we return the same 404 either way so we
        // don't leak whether the id exists at all.
        const monitor = await prisma.monitor.findFirst({
            where: { id: Number(id), user_id: req.user.id }
        });

        if(!monitor){
            return res.status(404).json({success: false, message: "No monitor found"});
        }

        return res.status(200).json(monitor);
    } catch (error) {
        console.log("error fetching monitor",error);
        return res.status(500).json({success: false, message: "Internal server error"});
    }
}

export const deleteMonitor = async(req, res) => {
    const {id} = req.params;

    if(!id){
        return res.status(400).json({success: false, message: "No id provided"});
    }

    try {
        const monitor = await prisma.monitor.findFirst({
            where: { id: Number(id), user_id: req.user.id }
        });

        if(!monitor){
            return res.status(404).json({success: false, message: "No monitor found"});
        }

        await prisma.monitor.delete({ where: { id: Number(id) } });

        return res.status(200).json({success: true, message: "Monitor deleted successfully"});
    } catch (error) {
        console.log("error deleting monitor", error);
        return res.status(500).json({success: false, message: "Internal server error"});
    }
}
