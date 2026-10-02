-- Phase 7 universal game catalog settlement types.
ALTER TYPE "GameType" ADD VALUE 'BACCARAT';
ALTER TYPE "GameType" ADD VALUE 'DICE';
ALTER TYPE "GameType" ADD VALUE 'ARCADE';
ALTER TYPE "GameActionType" ADD VALUE 'BACCARAT_DEAL';
ALTER TYPE "GameActionType" ADD VALUE 'DICE_ROLL';
ALTER TYPE "GameActionType" ADD VALUE 'ARCADE_RUN';
