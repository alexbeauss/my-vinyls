/*
  Warnings:

  - You are about to drop the column `createdAt` on the `Vinyl` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Vinyl` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Vinyl" DROP COLUMN "createdAt",
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "AlbumReview" (
    "id" TEXT NOT NULL,
    "albumId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "review" TEXT NOT NULL,
    "rating" DOUBLE PRECISION NOT NULL,
    "albumTitle" TEXT NOT NULL,
    "albumArtist" TEXT NOT NULL,
    "albumYear" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlbumReview_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlbumReview_albumId_userId_key" ON "AlbumReview"("albumId", "userId");

-- AddForeignKey
ALTER TABLE "Vinyl" ADD CONSTRAINT "Vinyl_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AlbumReview" ADD CONSTRAINT "AlbumReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
