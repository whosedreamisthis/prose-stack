-- CreateTable
CREATE TABLE "PlotLine" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "trashedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlotLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlotPoint" (
    "id" TEXT NOT NULL,
    "plotLineId" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "title" TEXT,
    "text" TEXT NOT NULL,
    "trashedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlotPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlotLine_projectId_position_idx" ON "PlotLine"("projectId", "position");

-- CreateIndex
CREATE INDEX "PlotPoint_sceneId_idx" ON "PlotPoint"("sceneId");

-- CreateIndex
CREATE UNIQUE INDEX "PlotPoint_plotLineId_sceneId_key" ON "PlotPoint"("plotLineId", "sceneId");

-- AddForeignKey
ALTER TABLE "PlotLine" ADD CONSTRAINT "PlotLine_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlotPoint" ADD CONSTRAINT "PlotPoint_plotLineId_fkey" FOREIGN KEY ("plotLineId") REFERENCES "PlotLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlotPoint" ADD CONSTRAINT "PlotPoint_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "ManuscriptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
