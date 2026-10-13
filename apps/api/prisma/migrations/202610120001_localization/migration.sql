-- CreateTable
CREATE TABLE "GameTranslation" (
    "gameId" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameTranslation_pkey" PRIMARY KEY ("gameId","locale")
);

-- CreateTable
CREATE TABLE "GameCardTranslation" (
    "cardId" TEXT NOT NULL,
    "locale" VARCHAR(10) NOT NULL,
    "question" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "challenge" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameCardTranslation_pkey" PRIMARY KEY ("cardId","locale")
);

-- CreateIndex
CREATE INDEX "GameCardTranslation_locale_idx" ON "GameCardTranslation"("locale");

-- AddForeignKey
ALTER TABLE "GameTranslation" ADD CONSTRAINT "GameTranslation_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameCardTranslation" ADD CONSTRAINT "GameCardTranslation_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "GameCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

