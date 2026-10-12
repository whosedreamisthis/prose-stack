-- CreateEnum
CREATE TYPE "ResearchType" AS ENUM ('NOTE', 'LINK', 'IMAGE', 'FILE');

-- CreateTable
CREATE TABLE "ResearchFolder" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "parentId" TEXT,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "trashedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchItem" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "folderId" TEXT,
    "type" "ResearchType" NOT NULL,
    "title" TEXT NOT NULL,
    "content" JSONB,
    "url" TEXT,
    "description" TEXT,
    "position" INTEGER NOT NULL,
    "characterId" TEXT,
    "placeId" TEXT,
    "sceneId" TEXT,
    "trashedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ResearchFolder_projectId_parentId_position_idx" ON "ResearchFolder"("projectId", "parentId", "position");

-- CreateIndex
CREATE INDEX "ResearchItem_projectId_folderId_position_idx" ON "ResearchItem"("projectId", "folderId", "position");

-- AddForeignKey
ALTER TABLE "ResearchFolder" ADD CONSTRAINT "ResearchFolder_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchFolder" ADD CONSTRAINT "ResearchFolder_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "ResearchFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchItem" ADD CONSTRAINT "ResearchItem_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchItem" ADD CONSTRAINT "ResearchItem_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "ResearchFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchItem" ADD CONSTRAINT "ResearchItem_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchItem" ADD CONSTRAINT "ResearchItem_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResearchItem" ADD CONSTRAINT "ResearchItem_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "ManuscriptNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
