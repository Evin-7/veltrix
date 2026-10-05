UPDATE "Game"
SET
  "status" = 'INACTIVE',
  "featured" = false,
  "newGame" = false,
  "popular" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE "slug" = 'cinder-club';
