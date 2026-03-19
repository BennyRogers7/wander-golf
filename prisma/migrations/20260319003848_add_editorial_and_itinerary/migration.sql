-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "apiId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'United States',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "phone" TEXT,
    "website" TEXT,
    "priceRange" TEXT,
    "accessType" TEXT,
    "walkable" BOOLEAN,
    "numberOfHoles" INTEGER,
    "photoUrl" TEXT,
    "description" TEXT,
    "writtenSummary" TEXT,
    "localsPickScore" DOUBLE PRECISION,
    "metaDescription" TEXT,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "stripeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "clubId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "numberOfHoles" INTEGER NOT NULL DEFAULT 18,
    "parTotal" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tee" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "teeName" TEXT NOT NULL,
    "courseRating" DOUBLE PRECISION,
    "slopeRating" INTEGER,
    "bogeyRating" DOUBLE PRECISION,
    "totalYards" INTEGER,
    "totalMeters" INTEGER,
    "parTotal" INTEGER,
    "frontCourseRating" DOUBLE PRECISION,
    "frontSlopeRating" INTEGER,
    "backCourseRating" DOUBLE PRECISION,
    "backSlopeRating" INTEGER,

    CONSTRAINT "Tee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Hole" (
    "id" TEXT NOT NULL,
    "teeId" TEXT NOT NULL,
    "holeNumber" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "yardage" INTEGER NOT NULL,
    "handicap" INTEGER NOT NULL,

    CONSTRAINT "Hole_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripItinerary" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "destination" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "budget" TEXT,
    "handicap" TEXT,
    "courses" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripItinerary_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Club_apiId_key" ON "Club"("apiId");

-- CreateIndex
CREATE UNIQUE INDEX "Club_slug_key" ON "Club"("slug");

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tee" ADD CONSTRAINT "Tee_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Hole" ADD CONSTRAINT "Hole_teeId_fkey" FOREIGN KEY ("teeId") REFERENCES "Tee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
