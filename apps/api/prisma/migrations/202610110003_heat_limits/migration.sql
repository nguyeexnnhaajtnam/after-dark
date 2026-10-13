-- Each player sets a maximum heat (1 Sweet … 5 Wild); a session uses the lower of the two.
ALTER TABLE "RoomPlayer" ADD COLUMN "maxHeat" INTEGER NOT NULL DEFAULT 3;
