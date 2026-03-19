-- AlterTable
ALTER TABLE "Club" ADD COLUMN     "communityRating" DOUBLE PRECISION,
ADD COLUMN     "totalPlayedIt" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "wanderApproved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "wanderApprovedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "PlayedIt" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "playedOn" TIMESTAMP(3),
    "paceOfPlay" TEXT,
    "worthPrice" TEXT,
    "overallRating" INTEGER,
    "wouldReturn" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayedIt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseReview" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "rating" INTEGER NOT NULL,
    "reviewText" TEXT,
    "playedOn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CourseReview_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "PlayedIt" ADD CONSTRAINT "PlayedIt_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseReview" ADD CONSTRAINT "CourseReview_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
