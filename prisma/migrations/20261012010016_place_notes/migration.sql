/*
  Warnings:

  - You are about to drop the column `notes` on the `Place` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Place" DROP COLUMN "notes";

-- CreateTable
CREATE TABLE "PlaceNote" (
    "id" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlaceNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaceNote_placeId_createdAt_idx" ON "PlaceNote"("placeId", "createdAt");

-- AddForeignKey
ALTER TABLE "PlaceNote" ADD CONSTRAINT "PlaceNote_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE CASCADE ON UPDATE CASCADE;
