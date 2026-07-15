import { getAreaArtLayout, projectToSafePoint } from "../content";
import type { GameState } from "../core/types";

const PLAYER_CLEARANCE = 14;

/**
 * Repairs legacy v1 coordinates against the authored art layout while leaving
 * story progress, settings, revision, and facing untouched.
 */
export function normalizeLoadedPlayerPosition(state: GameState): GameState {
  const safePoint = projectToSafePoint(
    getAreaArtLayout(state.areaId),
    state.playerPosition,
    { clearance: PLAYER_CLEARANCE },
  );
  if (
    safePoint.x === state.playerPosition.x
    && safePoint.y === state.playerPosition.y
  ) return state;

  return {
    ...state,
    playerPosition: {
      x: safePoint.x,
      y: safePoint.y,
      facing: state.playerPosition.facing,
    },
  };
}
