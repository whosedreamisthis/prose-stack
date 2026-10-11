-- CreateEnum
CREATE TYPE "ManuscriptNodeType" AS ENUM ('PART', 'CHAPTER', 'SCENE');

-- CreateTable
CREATE TABLE "ManuscriptNode" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "ManuscriptNodeType" NOT NULL,
    "title" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "content" JSONB,
    "summary" TEXT,
    "wordCount" INTEGER NOT NULL DEFAULT 0,
    "labelId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManuscriptNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DailyWordCount" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "startWords" INTEGER NOT NULL,

    CONSTRAINT "DailyWordCount_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ManuscriptNode_projectId_parentId_position_idx" ON "ManuscriptNode"("projectId", "parentId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "DailyWordCount_projectId_date_key" ON "DailyWordCount"("projectId", "date");

-- AddForeignKey
ALTER TABLE "ManuscriptNode" ADD CONSTRAINT "ManuscriptNode_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManuscriptNode" ADD CONSTRAINT "ManuscriptNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ManuscriptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DailyWordCount" ADD CONSTRAINT "DailyWordCount_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
