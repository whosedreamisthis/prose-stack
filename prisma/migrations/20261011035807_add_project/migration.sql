-- CreateEnum
CREATE TYPE "Theme" AS ENUM ('LIGHT', 'DARK');

-- CreateEnum
CREATE TYPE "LineSpacing" AS ENUM ('SINGLE', 'ONE_AND_HALF', 'DOUBLE');

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "author" TEXT NOT NULL,
    "coverDesign" TEXT NOT NULL DEFAULT 'classic',
    "coverColor" TEXT NOT NULL DEFAULT '#1e3a5f',
    "coverImageUrl" TEXT,
    "fontFamily" TEXT NOT NULL DEFAULT 'Georgia',
    "fontSize" INTEGER NOT NULL DEFAULT 12,
    "lineSpacing" "LineSpacing" NOT NULL DEFAULT 'DOUBLE',
    "theme" "Theme" NOT NULL DEFAULT 'LIGHT',
    "lastOpenedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Project_userId_idx" ON "Project"("userId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
