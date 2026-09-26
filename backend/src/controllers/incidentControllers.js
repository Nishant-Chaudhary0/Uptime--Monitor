import { prisma } from "../config/db.js";

export const getAllIncidents = async(req, res) => {
   try {
     // Only incidents belonging to the requesting user's monitors.
     const allIncidents = await prisma.incident.findMany({
        where: { monitor: { user_id: req.user.id } },
        orderBy: { started_at: 'desc' },
     });

    return res.status(200).json(allIncidents)
   } catch (error) {
    console.log("error in get all incidents route", error);
    return res.status(500).json({success: false, message: "Internal server error"})
   }
}

export const getIncidentById = async(req, res) => {
    const {id} = req.params;

    if(!id){
        return res.status(400).json({success: false, message: "No id provided"})
    }

    try {
        const incident = await prisma.incident.findFirst({
            where: { id: Number(id), monitor: { user_id: req.user.id } }
        })

        if(!incident){
            return res.status(404).json({success: false, message: "No incident found"})
        }

        return res.status(200).json(incident)
    } catch (error) {
        console.log("error in get incident by id route", error);
        return res.status(500).json({success: false, message: "Internal server error"})
    }
}

export const getIncidentForMonitor = async(req, res) => {
    const {id} = req.params;

    if(!id){
         return res.status(400).json({success: false, message: "No id provided"})
    }

    try {
        // Verify the monitor belongs to this user before returning its incidents.
        const monitor = await prisma.monitor.findFirst({
            where: { id: Number(id), user_id: req.user.id }
        });

        if(!monitor){
            return res.status(404).json({success: false, message: "Monitor not found"});
        }

        const incidentForMonitor = await prisma.incident.findMany({
            where: {monitor_id: Number(id)},
            orderBy: { started_at: 'desc' },
        })

        return res.status(200).json(incidentForMonitor);
    } catch (error) {
        console.log("error in get incident for monitor route", error);
        return res.status(500).json({success: false, message: "Internal server error"})
    }
}
