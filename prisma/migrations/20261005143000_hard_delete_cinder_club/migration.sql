BEGIN;

DELETE FROM "GameRound"
WHERE "gameId" IN (SELECT "id" FROM "Game" WHERE "slug" = 'cinder-club');

DELETE FROM "GameSession"
WHERE "gameId" IN (SELECT "id" FROM "Game" WHERE "slug" = 'cinder-club');

DELETE FROM "Favourite"
WHERE "gameId" IN (SELECT "id" FROM "Game" WHERE "slug" = 'cinder-club');

DELETE FROM "RecentGame"
WHERE "gameId" IN (SELECT "id" FROM "Game" WHERE "slug" = 'cinder-club');

DELETE FROM "Game"
WHERE "slug" = 'cinder-club';

COMMIT;
