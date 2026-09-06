-- CreateTable
CREATE TABLE "Monitor" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "check_intervel_minutes" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Monitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Check" (
    "id" SERIAL NOT NULL,
    "monitor_id" INTEGER NOT NULL,
    "status_code" INTEGER,
    "response_time_ms" INTEGER,
    "is_up" BOOLEAN NOT NULL,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Check_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Incident" (
    "id" SERIAL NOT NULL,
    "monitor_id" INTEGER NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),
    "duration_minutes" INTEGER,
    "ai_summary" TEXT,

    CONSTRAINT "Incident_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Check_monitor_id_checked_at_idx" ON "Check"("monitor_id", "checked_at");

-- CreateIndex
CREATE INDEX "Incident_monitor_id_idx" ON "Incident"("monitor_id");

-- AddForeignKey
ALTER TABLE "Check" ADD CONSTRAINT "Check_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "Monitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Incident" ADD CONSTRAINT "Incident_monitor_id_fkey" FOREIGN KEY ("monitor_id") REFERENCES "Monitor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
