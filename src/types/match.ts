export type Match = {
  id: number;
  match_id: string;
  queue_id: number | null;
  game_creation: number | null;
  game_duration: number | null;
  processed_at: string;
};

export type MatchParticipant = {
  id: number;
  match_id: number;
  player_id: number;
  champion_name: string;
  win: number;
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  champ_level: number;
  queue_id: number | null;
  posted_to_discord: number;
  created_at: string;
};