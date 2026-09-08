/*
  Warnings:

  - Added the required column `insurer` to the `InsurancePlan` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InsurancePlan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "insurer" TEXT NOT NULL,
    "insurerLogo" TEXT,
    "category" TEXT NOT NULL,
    "baseRate" REAL NOT NULL,
    "description" TEXT,
    "highlights" TEXT,
    "termMonths" INTEGER NOT NULL DEFAULT 12,
    "minSumInsured" REAL,
    "maxSumInsured" REAL
);
INSERT INTO "new_InsurancePlan" ("baseRate", "category", "code", "description", "id", "name") SELECT "baseRate", "category", "code", "description", "id", "name" FROM "InsurancePlan";
DROP TABLE "InsurancePlan";
ALTER TABLE "new_InsurancePlan" RENAME TO "InsurancePlan";
CREATE UNIQUE INDEX "InsurancePlan_code_key" ON "InsurancePlan"("code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
