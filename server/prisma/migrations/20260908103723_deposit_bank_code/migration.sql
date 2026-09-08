/*
  Warnings:

  - Added the required column `bankCode` to the `TermDeposit` table without a default value. This is not possible if the table is not empty.
  - Added the required column `bankName` to the `TermDeposit` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TermDeposit" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "principal" REAL NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "interestRate" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "startDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maturityDate" DATETIME NOT NULL,
    "settledAt" DATETIME,
    "interestPaid" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TermDeposit_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_TermDeposit" ("createdAt", "id", "interestPaid", "interestRate", "maturityDate", "principal", "settledAt", "startDate", "status", "termMonths", "userId") SELECT "createdAt", "id", "interestPaid", "interestRate", "maturityDate", "principal", "settledAt", "startDate", "status", "termMonths", "userId" FROM "TermDeposit";
DROP TABLE "TermDeposit";
ALTER TABLE "new_TermDeposit" RENAME TO "TermDeposit";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
