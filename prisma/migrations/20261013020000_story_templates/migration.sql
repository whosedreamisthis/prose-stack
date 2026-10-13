-- AlterTable
ALTER TABLE "Project" ADD COLUMN "storyTemplateId" TEXT;

-- CreateTable
CREATE TABLE "BeatProgress" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "beatKey" TEXT NOT NULL,
    "covered" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BeatProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BeatScenes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BeatScenes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "BeatProgress_projectId_beatKey_key" ON "BeatProgress"("projectId", "beatKey");

-- CreateIndex
CREATE INDEX "_BeatScenes_B_index" ON "_BeatScenes"("B");

-- AddForeignKey
ALTER TABLE "BeatProgress" ADD CONSTRAINT "BeatProgress_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BeatScenes" ADD CONSTRAINT "_BeatScenes_A_fkey" FOREIGN KEY ("A") REFERENCES "BeatProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BeatScenes" ADD CONSTRAINT "_BeatScenes_B_fkey" FOREIGN KEY ("B") REFERENCES "ManuscriptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
