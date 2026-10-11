-- CreateEnum
CREATE TYPE "CharacterRole" AS ENUM ('MAIN', 'SUPPORTING');

-- CreateTable
CREATE TABLE "Character" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "role" "CharacterRole" NOT NULL DEFAULT 'MAIN',
    "name" TEXT NOT NULL,
    "age" TEXT,
    "location" TEXT,
    "roleInStory" TEXT,
    "goal" TEXT,
    "physicalDescription" TEXT,
    "personality" TEXT,
    "occupation" TEXT,
    "habits" TEXT,
    "background" TEXT,
    "internalConflicts" TEXT,
    "externalConflicts" TEXT,
    "trashedAt" TIMESTAMP(3),
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Character_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CharacterNote" (
    "id" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CharacterNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Character_projectId_role_idx" ON "Character"("projectId", "role");

-- CreateIndex
CREATE INDEX "CharacterNote_characterId_createdAt_idx" ON "CharacterNote"("characterId", "createdAt");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CharacterNote" ADD CONSTRAINT "CharacterNote_characterId_fkey" FOREIGN KEY ("characterId") REFERENCES "Character"("id") ON DELETE CASCADE ON UPDATE CASCADE;
