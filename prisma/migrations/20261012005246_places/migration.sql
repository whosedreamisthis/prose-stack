-- CreateTable
CREATE TABLE "Place" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "roleInStory" TEXT,
    "season" TEXT,
    "uniqueFeatures" TEXT,
    "description" TEXT,
    "sights" TEXT,
    "sounds" TEXT,
    "smell" TEXT,
    "notes" TEXT,
    "trashedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Place_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_PlaceCharacters" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_PlaceCharacters_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "Place_projectId_createdAt_idx" ON "Place"("projectId", "createdAt");

-- CreateIndex
CREATE INDEX "_PlaceCharacters_B_index" ON "_PlaceCharacters"("B");

-- AddForeignKey
ALTER TABLE "Place" ADD CONSTRAINT "Place_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlaceCharacters" ADD CONSTRAINT "_PlaceCharacters_A_fkey" FOREIGN KEY ("A") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_PlaceCharacters" ADD CONSTRAINT "_PlaceCharacters_B_fkey" FOREIGN KEY ("B") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
