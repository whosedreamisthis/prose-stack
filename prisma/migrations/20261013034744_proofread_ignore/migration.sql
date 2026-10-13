-- CreateEnum
CREATE TYPE "ProofreadIgnoreKind" AS ENUM ('WORD', 'RULE');


-- CreateTable
CREATE TABLE "ProofreadIgnore" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "kind" "ProofreadIgnoreKind" NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProofreadIgnore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProofreadIgnore_projectId_kind_value_key" ON "ProofreadIgnore"("projectId", "kind", "value");

-- AddForeignKey
ALTER TABLE "ProofreadIgnore" ADD CONSTRAINT "ProofreadIgnore_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
