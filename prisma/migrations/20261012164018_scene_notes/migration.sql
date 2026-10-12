-- CreateTable
CREATE TABLE "SceneNote" (
    "id" TEXT NOT NULL,
    "sceneId" TEXT NOT NULL,
    "title" TEXT,
    "content" TEXT NOT NULL,
    "trashedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SceneNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SceneNote_sceneId_createdAt_idx" ON "SceneNote"("sceneId", "createdAt");

-- AddForeignKey
ALTER TABLE "SceneNote" ADD CONSTRAINT "SceneNote_sceneId_fkey" FOREIGN KEY ("sceneId") REFERENCES "ManuscriptNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
