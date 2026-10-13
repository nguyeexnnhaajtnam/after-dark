/** UI and card-content language. Each player picks their own; game state is shared and language-independent. */
export type Locale='vi'|'en';
export type GameSlug='read-my-mind'|'dare-me'|'no-secrets'|'take-control'|'lucky-tonight';
export type CardCategory='MIND_READER'|'CHEMISTRY'|'SECRET_MISSION'|'MUTUAL_DESIRE'|'PLOT_TWIST'|'POWER_CARD'|'FORFEIT';
/** 1 Sweet · 2 Flirty · 3 Spicy · 4 Daring · 5 Wild. A session uses the lower of both players' limits. */
export type HeatLevel=1|2|3|4|5;
export type GamePhase='HOW_TO_PLAY'|'WAITING_FOR_SECRET'|'WAITING_FOR_GUESS'|'REVEAL'|'CHEMISTRY_CONSENT'|'CHEMISTRY_ACCEPTED'|'CHEMISTRY_IN_PROGRESS'|'MUTUAL_DESIRE_CHOICE'|'MUTUAL_DESIRE_REVEAL'|'PLOT_TWIST'|'ROUND_COMPLETE'|'GAME_COMPLETE';
export type DesireChoice='YES'|'MAYBE'|'NO';
export type PowerKind='SECOND_CHANCE'|'ROLE_REVERSAL'|'DOUBLE_SPARK';
export type TwistKind='ROLE_REVERSAL'|'DOUBLE_SPARK'|'FRESH_START';
/** Chemistry lifecycle, projected from the viewer's perspective. */
export type ChemistryStage='INVITATION'|'WAITING_FOR_CONSENT'|'MUTUALLY_ACCEPTED'|'WAITING_TO_START'|'IN_PROGRESS'|'WAITING_FOR_COMPLETION'|'COMPLETED'|'DECLINED'|'SKIPPED';
export type ForfeitStage='OFFERED'|'WAITING'|'ACCEPTED'|'PASSED';
export type PlayerView={id:string;nickname:string;isHost:boolean;connected:boolean;ready:boolean;maxHeat:HeatLevel};
export type CardView={id:string;type:CardCategory;question:string;choices:string[];intensity:number;artworkPath:string;challenge?:string;durationSeconds?:number;effect?:TwistKind};
export type RoundResult={secretChoice?:number;guessChoice?:number;correct?:boolean;sparksEarned?:number;firstMiss?:number;
 /** Deterministic index into a copy pool, identical for both players. */
 variant:number;chemistry?:'COMPLETED'|'DECLINED'|'SKIPPED';mutualUnlocked?:boolean;twistApplied?:TwistKind;twistAlreadyPending?:boolean;skipped?:boolean;
 /** Power Cards spent on this guess, revealed with the result so the consumed card is accounted for. */
 powersUsed?:PowerKind[]};
export type ChemistryView={stage:ChemistryStage;iConsented:boolean;iReady:boolean;iFinished:boolean;partnerFinished:boolean;sparksEach:number;durationSeconds?:number;startedAt?:string;endsAt?:string;iFinishedAt?:string;serverNow:string;timerExpired:boolean};
export type ForfeitView={text:string;stage:ForfeitStage;payerId:string;iVoted:boolean};
export type MissionView={id:string;text:string;status:'ACTIVE'|'DECLARED'|'COMPLETED';ownerId:string;number:number;total:number;notYetCount:number};
export type PowerCardView={id:string;kind:PowerKind;title:string;description:string;requirement:string;status:'READY'|'ARMED';usable:boolean;reason?:string};
export type RewardView={powerId?:string;kind?:PowerKind;title?:string;round:number;inventoryFull:boolean};
export type TwistNotice={kind:'ROLE_REVERSAL';source:'PLOT_TWIST'|'POWER_CARD';normalSecretPlayerId:string;secretPlayerId:string;byPlayerId?:string};
export type PlayerStats={correctReads:number;reads:number;chemistryCompleted:number;missionsCompleted:number};
export type GameStateView={id:string;gameSlug:GameSlug;phase:GamePhase;round:number;totalRounds:number;version:number;heat:HeatLevel;
 secretPlayerId:string;guessingPlayerId:string;card:CardView;hasSubmittedSecret:boolean;
 /** Only sent to the player who hid it. */
 mySecretChoice?:number;
 /** Who would hide the answer on the next Mind Reader card under normal alternation. */
 nextMindReaderSecretId:string;hasSubmittedChoice:boolean;result?:RoundResult;
 scores:Record<string,number>;stats:Record<string,PlayerStats>;
 howToPlay:{iAcknowledged:boolean;partnerAcknowledged:boolean};
 chemistry?:ChemistryView;forfeit?:ForfeitView;
 /** Sparks the viewer would earn for a correct guess this round (twists + the viewer's own armed cards). */
 sparkValue:number;
 pendingTwists:TwistKind[];twistNotice?:TwistNotice;eliminatedChoice?:number;
 mission?:MissionView;opponentMissionDeclared?:MissionView;missionsLeft:number;
 inventory:PowerCardView[];inventoryCounts:Record<string,number>;inventoryLimit:number;lastReward?:RewardView};
export type RoomView={id:string;code:string;status:'LOBBY'|'PLAYING'|'EXPIRED';players:PlayerView[];selectedGame:GameSlug;agreedHeat:HeatLevel;expiresAt:string;game?:GameStateView};
export type Ack<T=unknown>={ok:true;data:T}|{ok:false;error:{code:string;message:string}};
export type RoomCredentials={roomId:string;playerId:string;token:string;code:string};
export type GameActionType='ACK_HOW_TO_PLAY'|'SUBMIT_SECRET'|'SUBMIT_GUESS'|'SKIP'|'CHEMISTRY_VOTE'|'CHEMISTRY_START'|'CHEMISTRY_DONE'|'CHEMISTRY_STOP'|'FORFEIT_VOTE'|'MUTUAL_DESIRE_CHOICE'|'PLOT_TWIST_ACK'|'DECLARE_MISSION'|'CONFIRM_MISSION'|'USE_POWER'|'NEXT_ROUND';
/** `round` lets independent per-player choices (votes, acks) survive a version race with the partner's simultaneous choice. */
export type GameAction={actionId:string;expectedVersion:number;round?:number;type:GameActionType;choice?:number;desire?:DesireChoice;accept?:boolean;completed?:boolean;missionOwnerId?:string;powerId?:string};
export interface ClientToServerEvents{'room:authenticate':(p:{roomId:string;playerId:string;token:string;locale?:Locale},ack:(r:Ack<RoomView>)=>void)=>void;'room:set_locale':(p:{locale:Locale},ack:(r:Ack<RoomView>)=>void)=>void;'room:ready':(p:{ready:boolean},ack:(r:Ack<RoomView>)=>void)=>void;'room:select_game':(p:{gameSlug:GameSlug},ack:(r:Ack<RoomView>)=>void)=>void;'room:set_heat':(p:{maxHeat:HeatLevel},ack:(r:Ack<RoomView>)=>void)=>void;'game:start':(p:{gameSlug:GameSlug},ack:(r:Ack<RoomView>)=>void)=>void;'game:action':(p:GameAction,ack:(r:Ack<RoomView>)=>void)=>void;'game:return_lobby':(p:{},ack:(r:Ack<RoomView>)=>void)=>void;}
export interface ServerToClientEvents{'room:state':(state:RoomView)=>void;'room:player_joined':(state:RoomView)=>void;'room:player_disconnected':(state:RoomView)=>void;'game:state':(state:RoomView)=>void;}
