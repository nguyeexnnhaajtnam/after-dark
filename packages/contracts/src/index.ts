/** UI and card-content language. Each player picks their own; game state is shared and language-independent. */
export type Locale='vi'|'en';
export type GameSlug='read-my-mind'|'dare-me'|'no-secrets'|'take-control'|'lucky-tonight';
export type CardCategory='MIND_READER'|'CHEMISTRY'|'SECRET_MISSION'|'MUTUAL_DESIRE'|'PLOT_TWIST'|'POWER_CARD'|'FORFEIT';
/** 1 Sweet · 2 Flirty · 3 Spicy · 4 Daring · 5 Wild. A session uses the lower of both players' limits. */
export type HeatLevel=1|2|3|4|5;
/** COUNTER_MIND_SUBMIT: both privately answer and predict (Counter Mind twist). QUESTION_TIME: each may ask one Yes/No question before the guess (One More Question twist). */
export type GamePhase='HOW_TO_PLAY'|'WAITING_FOR_SECRET'|'COUNTER_MIND_SUBMIT'|'QUESTION_TIME'|'WAITING_FOR_GUESS'|'REVEAL'|'CHEMISTRY_CONSENT'|'CHEMISTRY_ACCEPTED'|'CHEMISTRY_IN_PROGRESS'|'MUTUAL_DESIRE_CHOICE'|'MUTUAL_DESIRE_REVEAL'|'PLOT_TWIST'|'ROUND_COMPLETE'|'GAME_COMPLETE';
export type DesireChoice='YES'|'MAYBE'|'NO';
export type PowerKind='PICKY_KITTY'|'LET_ME_IN'|'A_LITTLE_PRESENT';
/** Each twist modifies the next Mind Reader card only, and never awards Spark by itself. */
export type TwistKind='ROLE_REVERSAL'|'DOUBLE_CHALLENGE'|'COUNTER_MIND'|'ONE_MORE_QUESTION';
export type YesNo='YES'|'NO';
/** Chemistry lifecycle, projected from the viewer's perspective. */
export type ChemistryStage='INVITATION'|'WAITING_FOR_CONSENT'|'MUTUALLY_ACCEPTED'|'WAITING_TO_START'|'IN_PROGRESS'|'WAITING_FOR_COMPLETION'|'COMPLETED'|'DECLINED'|'SKIPPED';
/** DRAWING: the player who missed is drawing the forfeit from a face-down spread; its text is not known yet. */
export type ForfeitStage='DRAWING'|'OFFERED'|'WAITING'|'ACCEPTED'|'PASSED';
/** Cards a player draws face down: their Secret Mission, the Power Card a confirmed mission earns, the forfeit for a miss. */
export type DrawKind='MISSION'|'POWER'|'FORFEIT';
export type PlayerView={id:string;nickname:string;isHost:boolean;connected:boolean;ready:boolean;maxHeat:HeatLevel};
export type CardView={id:string;type:CardCategory;question:string;choices:string[];intensity:number;artworkPath:string;challenge?:string;durationSeconds?:number;effect?:TwistKind};
/**
 * How a prediction came about, so accuracy can be reported with honest denominators:
 * NORMAL the card's one scheduled, unaided read · EXTRA Double Challenge part B · RECIPROCAL both Counter Mind reads, treated alike ·
 * HINTED made after hearing a Yes/No answer (One More Question).
 */
export type PredictionCategory='NORMAL'|'EXTRA'|'RECIPROCAL'|'HINTED';
/** One evaluated prediction, kept raw so a future, approved compatibility formula can choose its own denominators. */
export type PredictionResult={holderId:string;guesserId:string;secretChoice:number;guessChoice:number;correct:boolean;sparksEarned:number;
 /** The question actually answered (Double Challenge part B uses its own). */
 questionId:string;category:PredictionCategory};
export type RoundResult={secretChoice?:number;guessChoice?:number;correct?:boolean;sparksEarned?:number;
 /** Deterministic index into a copy pool, identical for both players. */
 variant:number;chemistry?:'COMPLETED'|'DECLINED'|'SKIPPED';mutualUnlocked?:boolean;twistApplied?:TwistKind;twistAlreadyPending?:boolean;skipped?:boolean;
 /** Every prediction resolved on this Mind Reader card so far, in order. Counter Mind reveals two at once. */
 predictions?:PredictionResult[];
 /** Double Challenge: which part this reveal closes. */
 part?:1|2};
export type ChemistryView={stage:ChemistryStage;iConsented:boolean;iReady:boolean;iFinished:boolean;partnerFinished:boolean;sparksEach:number;durationSeconds?:number;startedAt?:string;endsAt?:string;iFinishedAt?:string;serverNow:string;timerExpired:boolean};
/** `text` is empty while DRAWING; `cards` is how many face-down cards are spread for the draw. */
export type ForfeitView={text:string;stage:ForfeitStage;payerId:string;iVoted:boolean;cards?:number};
export type MissionView={id:string;text:string;status:'ACTIVE'|'DECLARED'|'COMPLETED';ownerId:string;number:number;total:number;notYetCount:number};
/** ARMED: activated and waiting on its owner (Picky Kitty while the question is being chosen). */
export type PowerCardView={id:string;kind:PowerKind;title:string;description:string;requirement:string;status:'READY'|'ARMED';usable:boolean;reason?:string};
export type RewardView={powerId?:string;kind?:PowerKind;title?:string;round:number;inventoryFull:boolean};
/** The twist modifying the current Mind Reader card, with the holder normal alternation would have picked. */
export type TwistNotice={kind:TwistKind;normalSecretPlayerId:string;secretPlayerId:string};
/** Prediction counts per guesser, one bucket per PredictionCategory: reads (NORMAL), extra, reciprocal, assisted (HINTED). Never folded together. */
export type PlayerStats={correctReads:number;reads:number;extraReads:number;extraCorrectReads:number;reciprocalReads:number;reciprocalCorrectReads:number;assistedReads:number;assistedCorrectReads:number;chemistryCompleted:number;missionsCompleted:number};
/** One More Question, per asker. The question text is the asker's own; the partner may answer or decline. */
export type QuestionView={status:'OPEN'|'PASSED'|'ASKED'|'ANSWERED'|'DECLINED';text?:string;answer?:YesNo};
/** Counter Mind: only the viewer's own submission is ever projected before the reveal. */
export type CounterMindView={iSubmitted:boolean;partnerSubmitted:boolean;myChoice?:number;myPrediction?:number};
/** Picky Kitty: one to three candidates, sent to the owner only. */
export type PickyKittyView={ownerId:string;candidates?:{id:string;question:string;choices:string[];intensity:number}[]};
/** Let Me In!: after a reveal, a request to hear why the partner chose their answer (`role` says which pick it was). */
export type FollowUpView={askerId:string;responderId:string;choice:number;role:'ANSWER'|'GUESS';stage:'ASKED'|'ANSWERED'|'DECLINED';reply?:string};
/** A Little Present: an off-deck Bonus Moment. Both must accept, and both confirm it happened (as with Chemistry); it never scores. */
export type BonusMomentView={giverId:string;receiverId:string;question:string;challenge?:string;stage:'OFFERED'|'ACCEPTED'|'COMPLETED'|'DECLINED'|'STOPPED';iAccepted:boolean;iAnswered:boolean;iFinished:boolean;partnerFinished:boolean};
export type GameStateView={id:string;gameSlug:GameSlug;phase:GamePhase;round:number;totalRounds:number;version:number;heat:HeatLevel;
 secretPlayerId:string;guessingPlayerId:string;card:CardView;hasSubmittedSecret:boolean;
 /** Only sent to the player who hid it. */
 mySecretChoice?:number;
 /** Who would hide the answer on the next Mind Reader card under normal alternation. */
 nextMindReaderSecretId:string;hasSubmittedChoice:boolean;result?:RoundResult;
 scores:Record<string,number>;stats:Record<string,PlayerStats>;
 howToPlay:{iAcknowledged:boolean;partnerAcknowledged:boolean};
 chemistry?:ChemistryView;forfeit?:ForfeitView;
 /** Sparks for a correct prediction. Always 1: no twist or Power Card multiplies it. */
 sparkValue:number;
 /** Activated twist waiting for the next Mind Reader card (at most one). */
 pendingTwist?:TwistKind;twistNotice?:TwistNotice;
 /** Double Challenge part in play on this card. Part B projects its own, second question as `card`. */
 challengePart?:1|2;
 /** A twist that could not run on this card (Double Challenge without a second fresh question at tonight's heat); the card plays normally. */
 twistSkipped?:TwistKind;
 /** The session was dealt under an older ruleset. It is closed rather than reinterpreted; the host starts a new game. */
 outdated?:boolean;
 counterMind?:CounterMindView;questions?:Record<string,QuestionView>;pickyKitty?:PickyKittyView;followUp?:FollowUpView;bonusMoment?:BonusMomentView;
 mission?:MissionView;opponentMissionDeclared?:MissionView;missionsLeft:number;
 /** Draws open to this viewer now, as the number of face-down cards in each spread. Their contents stay on the server until drawn. */
 draws?:Partial<Record<'MISSION'|'POWER',number>>;
 inventory:PowerCardView[];inventoryCounts:Record<string,number>;inventoryLimit:number;lastReward?:RewardView};
export type RoomView={id:string;code:string;status:'LOBBY'|'PLAYING'|'EXPIRED';players:PlayerView[];selectedGame:GameSlug;agreedHeat:HeatLevel;expiresAt:string;game?:GameStateView};
export type Ack<T=unknown>={ok:true;data:T}|{ok:false;error:{code:string;message:string}};
export type RoomCredentials={roomId:string;playerId:string;token:string;code:string};
export type GameActionType='ACK_HOW_TO_PLAY'|'SUBMIT_SECRET'|'SUBMIT_GUESS'|'SUBMIT_COUNTER_MIND'|'ASK_QUESTION'|'PASS_QUESTION'|'ANSWER_QUESTION'|'SKIP'|'CHEMISTRY_VOTE'|'CHEMISTRY_START'|'CHEMISTRY_DONE'|'CHEMISTRY_STOP'|'FORFEIT_VOTE'|'MUTUAL_DESIRE_CHOICE'|'PLOT_TWIST_ACK'|'DECLARE_MISSION'|'CONFIRM_MISSION'|'USE_POWER'|'CANCEL_POWER'|'PICK_QUESTION'|'FOLLOW_UP_REPLY'|'BONUS_VOTE'|'BONUS_DONE'|'DRAW_CARD'|'NEXT_ROUND';
/**
 * `round` lets independent per-player choices (votes, acks) survive a version race with the partner's simultaneous choice.
 * `prediction`: Counter Mind guess about the partner. `text`: One More Question / Let Me In! wording. `answer`: reply to a One More Question.
 * `cardId`: the Picky Kitty pick. `draw` + `choice`: which spread, and the position of the face-down card picked from it.
 */
export type GameAction={actionId:string;expectedVersion:number;round?:number;type:GameActionType;choice?:number;prediction?:number;desire?:DesireChoice;accept?:boolean;completed?:boolean;missionOwnerId?:string;powerId?:string;text?:string;answer?:YesNo|'DECLINE';cardId?:string;draw?:DrawKind};
export interface ClientToServerEvents{'room:authenticate':(p:{roomId:string;playerId:string;token:string;locale?:Locale},ack:(r:Ack<RoomView>)=>void)=>void;'room:set_locale':(p:{locale:Locale},ack:(r:Ack<RoomView>)=>void)=>void;'room:ready':(p:{ready:boolean},ack:(r:Ack<RoomView>)=>void)=>void;'room:select_game':(p:{gameSlug:GameSlug},ack:(r:Ack<RoomView>)=>void)=>void;'room:set_heat':(p:{maxHeat:HeatLevel},ack:(r:Ack<RoomView>)=>void)=>void;'game:start':(p:{gameSlug:GameSlug},ack:(r:Ack<RoomView>)=>void)=>void;'game:action':(p:GameAction,ack:(r:Ack<RoomView>)=>void)=>void;'game:return_lobby':(p:{},ack:(r:Ack<RoomView>)=>void)=>void;}
export interface ServerToClientEvents{'room:state':(state:RoomView)=>void;'room:player_joined':(state:RoomView)=>void;'room:player_disconnected':(state:RoomView)=>void;'game:state':(state:RoomView)=>void;}
