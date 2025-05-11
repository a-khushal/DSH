/*
  Warnings:

  - You are about to drop the column `scrapeTargetId` on the `Task` table. All the data in the column will be lost.
  - You are about to drop the `ScrapeTarget` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Task" DROP CONSTRAINT "Task_scrapeTargetId_fkey";

-- AlterTable
ALTER TABLE "Task" DROP COLUMN "scrapeTargetId";

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isAdmin" BOOLEAN NOT NULL DEFAULT false;

-- DropTable
DROP TABLE "ScrapeTarget";
