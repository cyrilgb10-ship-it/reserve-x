/*
  Warnings:

  - A unique constraint covering the columns `[bookingId,attemptNumber]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Payment_bookingId_key";

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "paymentAttempt" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "attemptNumber" INTEGER NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "Payment_bookingId_status_idx" ON "Payment"("bookingId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_bookingId_attemptNumber_key" ON "Payment"("bookingId", "attemptNumber");
-- Synchroniser les tentatives des réservations existantes
UPDATE "Booking" AS b
SET "paymentAttempt" = p."attemptNumber"
FROM "Payment" AS p
WHERE p."bookingId" = b."id";