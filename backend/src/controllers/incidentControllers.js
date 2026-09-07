import { prisma } from "../config/db.js";

export const getAllIncidents = async(req, res) => {
   try {
     const allIncidents = await prisma.Incident.find();

    if(!allIncidents){
        return res.status(404).json("No incidents found");
    }

    return res.status(200).json(allIncidents)
   } catch (error) {
    console.log("error in get all incidents route");
    return res.status(500).json("Internal server error")
   }
}

export const getIncidentById = async(req, res) => {
    const {id} = req.params;

    if(!id){
        return res.status(404).json("No id found")
    }

    try {
        const incident = await prisma.Incident.find({
        where: {id: Number(id)}
    })

    if(!incident){
        return res.status(404).json("No incident found")
    }

    return res.status(200).json(incident)
    } catch (error) {
        console.log("error in get incident by id route");
         return res.status(500).json("Internal server error")
    }
}

export const getIncidentForMonitor = async(req, res) => {
    const {id} = req.params;

    if(!id){
         return res.status(404).json("No id found")
    }

    try {
        const incidentForMonitor = await prisma.Incident.FindMany({
        where: {monitor_id: Number(id)}
    })

    if(!incidentForMonitor){
        return res.status(404).json("No incident found for this monitor");
    }

    return res.status(404).json(incidentForMonitor);
    } catch (error) {
          console.log("error in get incident for monitor route");
         return res.status(500).json("Internal server error")
    }
}