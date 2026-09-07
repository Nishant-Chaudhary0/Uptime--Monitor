import { prisma } from "../config/db.js";
import { uptimeValidation } from "../utils/schemaValidation.js";

export const getChecksForMonitor = async(req, res) => {
    const {id} = req.params;

    if(!id){
        return res.status(404).json("No id provided");
    }

    try {
        const checks = await prisma.Check.findMany({
      where: {monitor_id: Number(id)} ,
      orderBy: { checked_at: 'desc' },
      take: 500,
    })

    return res.status(200).json(checks)
    } catch (error) {
        console.log("error in get checks by monitor route",error);
        return res.status(500).json("internal server error")
    }
};

const RANGE_TO_MS = {
  '24h': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
};

export const getUpStatsTime = async (req, res) => {
  const monitorId = parseInt(req.params.id, 10);

  if (Number.isNaN(monitorId)) {
    return res.status(400).json("Invalid monitor id");
  }

  const result = uptimeValidation.safeParse(req.query);

  if (!result.success) {
    return res.status(400).json("Please provide valid range");
  }

  const { range } = result.data;
  const sinceDate = new Date(Date.now() - RANGE_TO_MS[range]);

  try {
    const monitor = await prisma.Monitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) {
      return res.status(404).json("Monitor not found");
    }

    const totalCheck = await prisma.Check.count({
      where: {
        monitor_id: monitorId,
        checked_at: { gte: sinceDate },
      },
    });

    const upCheck = await prisma.Check.count({
      where: {
        monitor_id: monitorId,
        checked_at: { gte: sinceDate },
        is_up: true,
      },
    });

    const uptimePercentage =
      totalCheck === 0 ? null : (upCheck / totalCheck) * 100;

    const averageResponseTime = await prisma.Check.aggregate({
      where: {
        monitor_id: monitorId,
        checked_at: { gte: sinceDate },
        is_up: true,
      },
      _avg: {
        response_time_ms: true,
      },
    });

    const incidentCount = await prisma.Incident.count({
      where: {
        monitor_id: monitorId,
        started_at: { gte: sinceDate },
      },
    });

    return res.json({
      monitor_id: monitorId,
      monitor_name: monitor.name,
      range,
      uptime_percent:
        uptimePercentage === null
          ? null
          : Number(uptimePercentage.toFixed(2)),
      total_checks: totalCheck,
      up_checks: upCheck,
      down_checks: totalCheck - upCheck,
      avg_response_time_ms:
        averageResponseTime._avg.response_time_ms === null
          ? null
          : Math.round(averageResponseTime._avg.response_time_ms),
      incident_count: incidentCount,
    });
  } catch (error) {
    console.error("Error fetching uptime stats:", error);
    return res.status(500).json({ error: "Failed to fetch uptime stats" });
  }
};