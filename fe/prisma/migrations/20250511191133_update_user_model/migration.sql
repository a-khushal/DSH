/*
  Warnings:

  - You are about to drop the column `assignedToId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `bandwidthUsed` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the column `targetUrl` on the `Task` table. All the data in the column will be lost.
  - The `status` column on the `Task` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `totalBandwidth` on the `User` table. All the data in the column will be lost.
  - You are about to drop the `BandwidthUsage` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `type` to the `Task` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Task` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TaskType" AS ENUM ('SCRAPING', 'PROXY', 'VERIFICATION', 'MAINTENANCE');

-- DropForeignKey
ALTER TABLE "BandwidthUsage" DROP CONSTRAINT "BandwidthUsage_userId_fkey";

-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_assignedToId_fkey";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "assignedToId",
DROP COLUMN "bandwidthUsed",
DROP COLUMN "targetUrl",
ADD COLUMN     "bandwidth" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "completedAt" TIMESTAMP(3),
ADD COLUMN     "data" JSONB,
ADD COLUMN     "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "result" JSONB,
ADD COLUMN     "startedAt" TIMESTAMP(3),
ADD COLUMN     "type" "TaskType" NOT NULL,
ADD COLUMN     "userId" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "TaskStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "totalBandwidth",
ADD COLUMN     "bandwidth" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "networkScore" DOUBLE PRECISION NOT NULL DEFAULT 100,
ADD COLUMN     "requestsServed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalUptime" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "ipAddress" DROP NOT NULL,
ALTER COLUMN "ipAddress" SET DATA TYPE TEXT;

-- DropTable
DROP TABLE "BandwidthUsage";

-- CreateTable
CREATE TABLE "ProxyConfig" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "port" INTEGER NOT NULL,
    "username" TEXT,
    "password" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastUsed" TIMESTAMP(3),
    "bandwidth" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "successRate" DOUBLE PRECISION NOT NULL DEFAULT 100,

    CONSTRAINT "ProxyConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUsedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");

-- AddForeignKey
ALTER TABLE "ProxyConfig" ADD CONSTRAINT "ProxyConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
