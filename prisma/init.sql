PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS "User" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "username" TEXT NOT NULL,
  "passwordHash" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "User_username_key" ON "User"("username");

CREATE TABLE IF NOT EXISTS "Motor" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "motorCode" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "model" TEXT NOT NULL,
  "brand" TEXT,
  "snCode" TEXT,
  "batchNo" TEXT,
  "supplier" TEXT,
  "purchaseDate" DATETIME,
  "status" TEXT NOT NULL DEFAULT 'draft',
  "currentLocation" TEXT,
  "remark" TEXT,
  "createdBy" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS "Motor_motorCode_key" ON "Motor"("motorCode");

CREATE TABLE IF NOT EXISTS "MotorPhoto" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "motorId" INTEGER NOT NULL,
  "photoPath" TEXT NOT NULL,
  "photoType" TEXT NOT NULL,
  "uploadedBy" TEXT NOT NULL,
  "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MotorPhoto_motorId_fkey" FOREIGN KEY ("motorId") REFERENCES "Motor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MotorTransaction" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "motorId" INTEGER NOT NULL,
  "transactionType" TEXT NOT NULL,
  "operator" TEXT NOT NULL,
  "targetPerson" TEXT,
  "location" TEXT,
  "purpose" TEXT,
  "remark" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "MotorTransaction_motorId_fkey" FOREIGN KEY ("motorId") REFERENCES "Motor" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "OutboundRequest" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "requesterId" INTEGER NOT NULL,
  "model" TEXT NOT NULL,
  "targetPerson" TEXT NOT NULL,
  "destination" TEXT NOT NULL,
  "remark" TEXT,
  "status" TEXT NOT NULL DEFAULT 'pending',
  "assignedMotorId" INTEGER,
  "reviewedBy" TEXT,
  "reviewedAt" DATETIME,
  "reviewRemark" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OutboundRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "OutboundRequest_assignedMotorId_fkey" FOREIGN KEY ("assignedMotorId") REFERENCES "Motor" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
