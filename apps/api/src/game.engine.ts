import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type {
  CardCategory,
  ChemistryStage,
  DesireChoice,
  DrawKind,
  ForfeitStage,
  GameAction,
  GamePhase,
  GameStateView,
  HeatLevel,
  Locale,
  PlayerStats,
  PowerCardView,
  PowerKind,
  PredictionCategory,
  PredictionResult,
  QuestionView,
  RewardView,
  RoomView,
  RoundResult,
  TwistKind,
  TwistNotice,
  YesNo,
} from "@after-dark/contracts";
import { PrismaService } from "./prisma.service";

/** Canonical card copy is English; other locales come from GameCardTranslation. Vietnamese is the app default. */
export const toLocale = (value: unknown): Locale =>
  value === "en" || value === "vi" ? value : "vi";
type CardText = {
  question: string;
  choices: unknown;
  challenge: string | null;
};
/** Picks the viewer's translation. Answers are compared by index, so a translation whose choice count differs is ignored. */
export function localizeCard<
  T extends CardText & { translations?: CardText[] },
>(card: T): CardText {
  const t = card.translations?.[0];
  const base = card.choices as unknown[];
  if (!t)
    return {
      question: card.question,
      choices: card.choices,
      challenge: card.challenge,
    };
  return {
    question: t.question,
    choices:
      Array.isArray(t.choices) &&
      Array.isArray(base) &&
      t.choices.length === base.length
        ? t.choices
        : card.choices,
    challenge: t.challenge ?? card.challenge,
  };
}
type MissionState = {
  cardId: string;
  status: "ACTIVE" | "DECLARED" | "COMPLETED";
  notYet: number;
};
/** `armed`: activated but not yet spent (Picky Kitty while its owner chooses). Only a completed effect removes the card. */
type PowerState = { id: string; kind: PowerKind; armed?: boolean };
/** DRAWING: the payer is drawing from a face-down spread; `cardId` is set by the draw. */
type ForfeitState = {
  cardId?: string;
  payerId: string;
  votes: Record<string, boolean>;
  stage: "DRAWING" | "OFFERED" | "ACCEPTED" | "PASSED";
};
type QuestionState = {
  status: QuestionView["status"];
  text?: string;
  answer?: YesNo;
};
type PickyState = { ownerId: string; powerId: string; candidates: string[] };
type FollowUpState = {
  askerId: string;
  responderId: string;
  choice: number;
  role: "ANSWER" | "GUESS";
  stage: "ASKED" | "ANSWERED" | "DECLINED";
  reply?: string;
};
type BonusState = {
  giverId: string;
  receiverId: string;
  cardId: string;
  votes: Record<string, boolean>;
  /** Completion confirmations; like Chemistry, it is complete only once both confirm. */
  done?: Record<string, boolean>;
  stage: "OFFERED" | "ACCEPTED" | "COMPLETED" | "DECLINED" | "STOPPED";
};
/** Raw outcome of every prediction in the session. Kept apart from Spark so a compatibility formula can be applied later. */
export type PredictionRecord = PredictionResult & {
  round: number;
  /** The deck card occupying this round (questionId differs on Double Challenge part B and after a Picky Kitty pick). */
  cardId: string;
  part?: 1 | 2;
  twist?: TwistKind;
};
/** One authoritative countdown: the deadline is fixed at start and every view derives from it. */
export type ChemistryTimer = {
  startedAt: string;
  durationSeconds?: number;
  endsAt?: string;
};
export type InternalState = {
  /** Rules this session was dealt under. Absent on sessions from before the Plot Twist / Power Card revision. */
  ruleset?: number;
  /** Each dealt twist card's effect, fixed at deal time so a later re-seed can never change a card already in play. */
  twistEffects?: Record<string, TwistKind>;
  phase: GamePhase;
  round: number;
  version: number;
  seed: number;
  heat: HeatLevel;
  players: [string, string];
  cardIds: string[];
  forfeitIds: string[];
  wrongGuesses: number;
  secretPlayerId: string;
  guessingPlayerId: string;
  /** Holder under normal alternation for the open Mind Reader card, before any twist. The schedule resumes from it. */
  normalSecretPlayerId?: string;
  lastMindSecretId?: string;
  secretChoice?: number;
  guessChoice?: number;
  result?: RoundResult;
  scores: Record<string, number>;
  stats: Record<string, PlayerStats>;
  missions: Record<string, MissionState[]>;
  /**
   * Each player's face-down Secret Missions, still to be drawn. Absent on sessions dealt before missions were drawn: their
   * missions were assigned up front and play on unchanged.
   */
  missionDeck?: Record<string, string[]>;
  /** Power Card draws a player has earned (a confirmed mission) and not drawn yet. */
  powerDraws?: Record<string, number>;
  /** Forfeits already drawn this session; the spread is dealt from the rest, then the pile is reused. */
  forfeitUsed?: string[];
  inventory: Record<string, PowerState[]>;
  rewards: Record<string, RewardView>;
  howToPlayAcks: Record<string, boolean>;
  votes: Record<string, boolean>;
  chemDone: Record<string, boolean>;
  /** Chemistry "Let's start" presses for the current card. Unrelated to lobby readiness. */
  chemReady: Record<string, boolean>;
  /** ISO time each player confirmed the current Chemistry challenge. */
  chemDoneAt: Record<string, string>;
  /** Set once, by the server, when both players have pressed start. Never moved afterwards. */
  chemTimer?: ChemistryTimer;
  forfeit?: ForfeitState;
  desires: Record<string, DesireChoice>;
  twistAcks: Record<string, boolean>;
  /** Activated twist waiting for the next Mind Reader card. Never more than one. */
  pendingTwist?: TwistKind;
  /** The twist modifying the open Mind Reader card; consumed when the card ends. */
  activeTwist?: TwistKind;
  twistNotice?: TwistNotice;
  /** Double Challenge part in play. */
  challengePart?: 1 | 2;
  /** Double Challenge part B's own question, chosen by the server when the twist takes effect and projected only in part B. */
  secondCardId?: string;
  /** Off-deck questions already used this session (Double Challenge part B), never offered again. */
  extraCardIds?: string[];
  /** A twist that could not run on this card and was skipped without penalty. */
  twistSkipped?: TwistKind;
  /** Counter Mind submissions, each private to its author until both are in. */
  counter: Record<string, { choice: number; prediction: number }>;
  /** One More Question, keyed by asker. */
  questions?: Record<string, QuestionState>;
  picky?: PickyState;
  /** A Picky Kitty question already replaced this card's question. */
  questionPicked?: boolean;
  followUp?: FollowUpState;
  /** Who used Let Me In! on the current reveal. */
  followUpAskers: Record<string, boolean>;
  bonus?: BonusState;
  /** Challenges already offered as Bonus Moments this session. */
  bonusCardIds: string[];
  /** Players still owed a forfeit offer for a miss on this card (Counter Mind can miss twice). */
  forfeitQueue: string[];
  predictions: PredictionRecord[];
};

export const TOTAL_ROUNDS = 12;
export const INVENTORY_LIMIT = 2;
export const MISSIONS_PER_PLAYER = 2;
/** Face-down Secret Missions dealt to each player's own deck (fewer when the heat cap leaves fewer). */
export const MISSION_DECK = 4;
/** Most face-down cards spread for one draw. */
export const DRAW_SPREAD: Record<DrawKind, number> = {
  MISSION: 4,
  POWER: 3,
  FORFEIT: 3,
};
const DECK = {
  MIND_READER: 5,
  CHEMISTRY: 3,
  MUTUAL_DESIRE: 2,
  PLOT_TWIST: 2,
} as const;
const PHASE_BY_TYPE: Record<string, GamePhase> = {
  MIND_READER: "WAITING_FOR_SECRET",
  CHEMISTRY: "CHEMISTRY_CONSENT",
  MUTUAL_DESIRE: "MUTUAL_DESIRE_CHOICE",
  PLOT_TWIST: "PLOT_TWIST",
};
const RESOLVED_PHASES: GamePhase[] = [
  "REVEAL",
  "MUTUAL_DESIRE_REVEAL",
  "ROUND_COMPLETE",
];
/** Choices that belong to one player and cannot conflict with the partner's simultaneous choice. */
const INDEPENDENT_ACTIONS = new Set<GameAction["type"]>([
  "ACK_HOW_TO_PLAY",
  "CHEMISTRY_VOTE",
  "CHEMISTRY_START",
  "CHEMISTRY_DONE",
  "CHEMISTRY_STOP",
  "FORFEIT_VOTE",
  "MUTUAL_DESIRE_CHOICE",
  "PLOT_TWIST_ACK",
  "DECLARE_MISSION",
  "SUBMIT_COUNTER_MIND",
  "ASK_QUESTION",
  "PASS_QUESTION",
  "ANSWER_QUESTION",
  "FOLLOW_UP_REPLY",
  "BONUS_VOTE",
  "DRAW_CARD",
]);
export const TWISTS: TwistKind[] = [
  "ROLE_REVERSAL",
  "DOUBLE_CHALLENGE",
  "COUNTER_MIND",
  "ONE_MORE_QUESTION",
];
/**
 * Version of the Plot Twist / Power Card rules. A session dealt under another ruleset is closed instead of being
 * reinterpreted: its cards would otherwise change meaning mid-match. Bump this whenever a dealt card's meaning changes.
 */
export const RULESET = 2;
export const isOutdated = (s: { ruleset?: number }) => s.ruleset !== RULESET;
/** A twist card's effect as seeded; undefined for anything this ruleset does not define (it is never dealt). */
export function twistEffect(card: { choices: unknown }): TwistKind | undefined {
  const effect = (card.choices as string[] | undefined)?.[0] as TwistKind;
  return TWISTS.includes(effect) ? effect : undefined;
}
/** The Power Card deck. A draw spreads the kinds its owner does not already hold. */
export const POWER_KINDS: PowerKind[] = [
  "PICKY_KITTY",
  "LET_ME_IN",
  "A_LITTLE_PRESENT",
];
/** Up to this many Picky Kitty questions are offered; fewer when the heat cap leaves fewer. */
export const PICKY_CHOICES = 3;
export const POWER_COPY: Record<
  PowerKind,
  { title: string; description: string; requirement: string }
> = {
  PICKY_KITTY: {
    title: "Picky Kitty",
    description:
      "Choose this Mind Reader card's question from up to three fresh ones at tonight's heat. Both of you answer the one you pick.",
    requirement: "Either player · before anyone answers",
  },
  LET_ME_IN: {
    title: "Let Me In!",
    description:
      "After a reveal, ask your partner why they picked their answer. They can tell you or pass. The result stays as it is.",
    requirement: "Either player · after a reveal",
  },
  A_LITTLE_PRESENT: {
    title: "A Little Present",
    description:
      "Offer your partner a Bonus Moment: one extra challenge at tonight's heat. It only happens if you both say yes, and it never scores.",
    requirement: "Either player · after a finished Mind Reader card",
  },
};
const QUESTION_MAX = 140;
const REPLY_MAX = 280;
/** Player-written text: one line, no control characters, bounded. React escapes it on display. */
export function cleanText(value: unknown, max: number) {
  return typeof value === "string"
    ? value
        .replace(/[\u0000-\u001f\u007f]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, max)
    : "";
}
/** Stats counters (total, correct) for each prediction category. */
const STAT_KEYS: Record<
  PredictionCategory,
  [keyof PlayerStats, keyof PlayerStats]
> = {
  NORMAL: ["reads", "correctReads"],
  EXTRA: ["extraReads", "extraCorrectReads"],
  RECIPROCAL: ["reciprocalReads", "reciprocalCorrectReads"],
  HINTED: ["assistedReads", "assistedCorrectReads"],
};
const emptyStats = (): PlayerStats => ({
  correctReads: 0,
  reads: 0,
  extraReads: 0,
  extraCorrectReads: 0,
  reciprocalReads: 0,
  reciprocalCorrectReads: 0,
  assistedReads: 0,
  assistedCorrectReads: 0,
  chemistryCompleted: 0,
  missionsCompleted: 0,
});

@Injectable()
export class GameEngine {
  constructor(private db: PrismaService) {}
  private shuffle<T>(items: T[]) {
    const out = [...items];
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
  private other(s: InternalState, id: string) {
    return s.players[0] === id ? s.players[1] : s.players[0];
  }

  /** Prefer cards at the agreed heat, then one step below, never above it. */
  pickByHeat<T extends { id: string; intensity: number }>(
    cards: T[],
    heat: number,
    count: number,
  ) {
    const at = this.shuffle(cards.filter((c) => c.intensity === heat)),
      near = this.shuffle(cards.filter((c) => c.intensity === heat - 1)),
      low = this.shuffle(cards.filter((c) => c.intensity < heat - 1));
    const lead = at.splice(0, Math.ceil(count * 0.6));
    return [...lead, ...near, ...at, ...low].slice(0, count).map((c) => c.id);
  }
  /**
   * Opens with a Mind Reader card, and every Plot Twist is followed by a Mind Reader card before the next twist, so each
   * twist modifies its own card and twists never stack.
   */
  buildSchedule(byType: Record<string, string[]>) {
    const typeOf = new Map<string, string>();
    for (const [type, ids] of Object.entries(byType))
      for (const id of ids) typeOf.set(id, type);
    const all = [...typeOf.keys()];
    const valid = (types: (string | undefined)[]) => {
      let waiting = false;
      for (const t of types) {
        if (t === "PLOT_TWIST") {
          if (waiting) return false;
          waiting = true;
        } else if (t === "MIND_READER") waiting = false;
      }
      return types[0] === "MIND_READER" && !waiting;
    };
    for (let attempt = 0; attempt < 200; attempt++) {
      const order = this.shuffle(all);
      if (valid(order.map((id) => typeOf.get(id)))) return order;
    }
    const mind = byType.MIND_READER || [],
      twists = byType.PLOT_TWIST || [],
      rest = all.filter(
        (id) => !["MIND_READER", "PLOT_TWIST"].includes(typeOf.get(id)!),
      );
    return [
      mind[0],
      ...twists.flatMap((t, i) => [t, mind[i + 1]]),
      ...rest,
      ...mind.slice(twists.length + 1),
    ].filter(Boolean);
  }

  async start(roomId: string, actorId: string) {
    return this.db.$transaction(
      async (tx) => {
        const room = await tx.room.findUniqueOrThrow({
          where: { id: roomId },
          include: { players: { orderBy: { joinedAt: "asc" } } },
        });
        const actor = room.players.find((p) => p.id === actorId);
        if (!actor?.isHost)
          throw new ForbiddenException("Only the host can start");
        // The host configures and deals; only the partner signals they are in.
        if (
          room.players.length !== 2 ||
          room.players.some((p) => !p.isHost && !p.ready)
        )
          throw new BadRequestException("Your partner is not in yet");
        if (room.selectedGame !== "read-my-mind")
          throw new BadRequestException("This game is coming soon");
        const heat = actor.maxHeat as HeatLevel;
        const cards = await tx.gameCard.findMany({
          where: {
            gameId: "read-my-mind",
            enabled: true,
            intensity: { lte: heat },
          },
        });
        const ofType = (type: string) => cards.filter((c) => c.type === type);
        const byType: Record<string, string[]> = {
          MIND_READER: this.pickByHeat(
            ofType("MIND_READER"),
            heat,
            DECK.MIND_READER,
          ),
          CHEMISTRY: this.pickByHeat(ofType("CHEMISTRY"), heat, DECK.CHEMISTRY),
          MUTUAL_DESIRE: this.pickByHeat(
            ofType("MUTUAL_DESIRE"),
            heat,
            DECK.MUTUAL_DESIRE,
          ),
          PLOT_TWIST: this.pickTwists(ofType("PLOT_TWIST")),
        };
        const missionIds = this.pickByHeat(
          ofType("SECRET_MISSION"),
          heat,
          MISSION_DECK * 2,
        );
        for (const [type, count] of Object.entries(DECK))
          if (byType[type].length < count)
            throw new BadRequestException(
              `Not enough ${type} cards at heat ${heat}. Seed the deck before starting`,
            );
        if (missionIds.length < MISSIONS_PER_PLAYER * 2)
          throw new BadRequestException(
            "Not enough Secret Missions at this heat. Seed the deck before starting",
          );
        const [a, b] = room.players.map((p) => p.id);
        const twistEffects = Object.fromEntries(
          byType.PLOT_TWIST.map((id) => [
            id,
            twistEffect(cards.find((c) => c.id === id)!)!,
          ]),
        );
        const state: InternalState = {
          ruleset: RULESET,
          twistEffects,
          phase: "HOW_TO_PLAY",
          round: 1,
          version: 1,
          seed: Math.floor(Math.random() * 1e6),
          heat,
          players: [a, b],
          cardIds: this.buildSchedule(byType),
          forfeitIds: this.pickByHeat(ofType("FORFEIT"), heat, 6),
          wrongGuesses: 0,
          secretPlayerId: a,
          guessingPlayerId: b,
          scores: { [a]: 0, [b]: 0 },
          stats: { [a]: emptyStats(), [b]: emptyStats() },
          // Missions are drawn by each player from their own face-down deck, never shared with the partner's.
          missions: { [a]: [], [b]: [] },
          missionDeck: {
            [a]: missionIds.filter((_, i) => i % 2 === 0),
            [b]: missionIds.filter((_, i) => i % 2 === 1),
          },
          powerDraws: {},
          forfeitUsed: [],
          inventory: { [a]: [], [b]: [] },
          rewards: {},
          howToPlayAcks: {},
          votes: {},
          chemDone: {},
          chemReady: {},
          chemDoneAt: {},
          desires: {},
          twistAcks: {},
          counter: {},
          followUpAskers: {},
          bonusCardIds: [],
          forfeitQueue: [],
          predictions: [],
        };
        await tx.gameSession.updateMany({
          where: { roomId, status: "ACTIVE" },
          data: { status: "COMPLETE", endedAt: new Date() },
        });
        await tx.gameSession.create({
          data: {
            roomId,
            gameId: "read-my-mind",
            state: state as any,
            stateVersion: 1,
          },
        });
        await tx.room.update({
          where: { id: roomId },
          data: { status: "PLAYING" },
        });
      },
      { isolationLevel: "Serializable" },
    );
  }
  /** One card per twist effect, so a session never deals the same twist twice. Cards with an effect this ruleset does not define are never dealt. */
  pickTwists(cards: { id: string; choices: unknown }[]) {
    const seen = new Set<string>();
    return this.shuffle(cards)
      .filter((c) => {
        const effect = twistEffect(c);
        if (!effect || seen.has(effect)) return false;
        seen.add(effect);
        return true;
      })
      .slice(0, DECK.PLOT_TWIST)
      .map((c) => c.id);
  }

  /** Deadline (ms) of the room's running timed Chemistry challenge, read from persisted state. */
  async chemistryDeadline(roomId: string) {
    const session = await this.db.gameSession.findFirst({
      where: { roomId, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
    });
    return session ? chemistryDeadline(normalize(session.state)) : undefined;
  }
  async action(roomId: string, playerId: string, a: GameAction) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.db.$transaction(
          (tx) => this.applyAction(tx, roomId, playerId, a),
          { isolationLevel: "Serializable" },
        );
      } catch (e: any) {
        if (e?.code === "P2034" && attempt < 3) continue;
        throw e;
      }
    }
  }
  private async applyAction(
    tx: any,
    roomId: string,
    playerId: string,
    a: GameAction,
  ) {
    const session = await tx.gameSession.findFirst({
      where: { roomId, status: "ACTIVE" },
      orderBy: { startedAt: "desc" },
    });
    if (!session) throw new BadRequestException("No active game");
    const s = normalize(session.state);
    if (!s.players.includes(playerId))
      throw new ForbiddenException("You are not seated in this game");
    // Never replay an older session under today's card meanings: it is closed, and the host starts a new game.
    if (isOutdated(s))
      throw new BadRequestException(
        "This game was dealt under older rules. Start a new game",
      );
    if (
      a.expectedVersion !== s.version &&
      !(INDEPENDENT_ACTIONS.has(a.type) && a.round === s.round)
    )
      throw new ConflictException("Stale game state");
    if (
      await tx.sessionAction.findUnique({
        where: {
          sessionId_actionId: { sessionId: session.id, actionId: a.actionId },
        },
      })
    )
      throw new ConflictException("Duplicate action");
    await tx.sessionAction.create({
      data: { sessionId: session.id, actionId: a.actionId, playerId },
    });
    const card = await tx.gameCard.findUniqueOrThrow({
      where: { id: s.cardIds[s.round - 1] },
    });
    if (s.phase === "GAME_COMPLETE")
      throw new BadRequestException("The game is over");
    if (s.phase === "HOW_TO_PLAY" && a.type !== "ACK_HOW_TO_PLAY")
      throw new BadRequestException("Finish the briefing first");
    if (a.type === "ACK_HOW_TO_PLAY") this.ackHowToPlay(s, playerId, card.type);
    else if (a.type === "DECLARE_MISSION") this.declareMission(s, playerId);
    else if (a.type === "CONFIRM_MISSION")
      this.confirmMission(s, playerId, a.missionOwnerId, a.completed !== false);
    else if (a.type === "USE_POWER") {
      const kind = (s.inventory[playerId] || []).find(
        (p) => p.id === a.powerId,
      )?.kind;
      const pool = kind ? await this.powerPool(tx, s, kind) : [];
      this.usePower(s, card.type, playerId, a.powerId, pool);
    } else if (a.type === "CANCEL_POWER")
      this.cancelPower(s, playerId, a.powerId);
    else if (a.type === "PICK_QUESTION")
      this.pickQuestion(s, playerId, a.cardId);
    else if (a.type === "FOLLOW_UP_REPLY")
      this.followUpReply(s, playerId, !!a.accept, a.text);
    else if (a.type === "BONUS_VOTE") this.bonusVote(s, playerId, !!a.accept);
    else if (a.type === "BONUS_DONE")
      this.bonusDone(s, playerId, a.completed !== false);
    else if (a.type === "FORFEIT_VOTE")
      this.forfeitVote(s, playerId, !!a.accept);
    else if (a.type === "DRAW_CARD") this.drawCard(s, playerId, a.draw, a.choice);
    else if (a.type === "SKIP") this.skip(s, card.type);
    else if (a.type === "NEXT_ROUND") await this.nextRound(tx, s, card.type);
    else if (card.type === "MIND_READER") this.mindReader(s, playerId, a);
    else if (card.type === "CHEMISTRY")
      this.chemistry(s, playerId, a, card.durationSeconds);
    else if (card.type === "MUTUAL_DESIRE") this.mutualDesire(s, playerId, a);
    else if (card.type === "PLOT_TWIST")
      this.plotTwist(s, playerId, a, this.dealtTwist(s, card.id));
    else throw new BadRequestException("Unsupported card category");
    s.version++;
    await tx.gameSession.update({
      where: { id: session.id },
      data: { state: s as any, stateVersion: s.version, currentRound: s.round },
    });
  }

  private variant(s: InternalState, salt = 0) {
    return (s.seed + s.round * 31 + salt * 7) % 1000;
  }
  /** The effect a dealt twist card had when the session was dealt; a later re-seed cannot change it. */
  dealtTwist(s: InternalState, cardId: string): TwistKind {
    const effect = s.twistEffects?.[cardId];
    if (!effect) throw new BadRequestException("Unknown Plot Twist");
    return effect;
  }
  /**
   * Double Challenge part B's question: a Mind Reader question at tonight's heat that this session has not dealt, offered,
   * or scheduled. It never takes a card from the 12-card deck. Undefined when none is left.
   */
  secondQuestion(s: InternalState, pool: { id: string; intensity: number }[]) {
    const used = new Set([...s.cardIds, ...(s.extraCardIds || [])]);
    return this.pickByHeat(
      pool.filter((c) => c.intensity <= s.heat && !used.has(c.id)),
      s.heat,
      1,
    )[0] as string | undefined;
  }
  /**
   * A pending twist becomes the open Mind Reader card's active twist here, exactly once. A Double Challenge with no
   * distinct second question is skipped instead, like a twist the players skipped: no penalty, and the card plays normally.
   */
  private beginRound(s: InternalState, type: string, secondCardId?: string) {
    s.phase = PHASE_BY_TYPE[type];
    if (type !== "MIND_READER") return;
    const normal = s.lastMindSecretId
      ? this.other(s, s.lastMindSecretId)
      : s.players[0];
    s.normalSecretPlayerId = normal;
    let secret = normal;
    let twist = s.pendingTwist;
    delete s.pendingTwist;
    if (twist === "DOUBLE_CHALLENGE" && !secondCardId) {
      s.twistSkipped = twist;
      twist = undefined;
    }
    if (twist) {
      s.activeTwist = twist;
      if (twist === "ROLE_REVERSAL") secret = this.other(s, normal);
      if (twist === "DOUBLE_CHALLENGE") {
        s.challengePart = 1;
        s.secondCardId = secondCardId;
        s.extraCardIds = [...(s.extraCardIds || []), secondCardId!];
      }
      if (twist === "COUNTER_MIND") s.phase = "COUNTER_MIND_SUBMIT";
      s.twistNotice = {
        kind: twist,
        normalSecretPlayerId: normal,
        secretPlayerId: secret,
      };
    }
    s.secretPlayerId = secret;
    s.guessingPlayerId = this.other(s, secret);
  }
  /** Normal alternation, before any twist: the scheduled chooser while a Mind Reader card is open, otherwise the partner of the last one. */
  nextMindSecret(s: InternalState, cardType: string) {
    if (cardType === "MIND_READER" && s.phase !== "HOW_TO_PLAY") {
      const normal = s.normalSecretPlayerId || s.secretPlayerId;
      return RESOLVED_PHASES.includes(s.phase) ? this.other(s, normal) : normal;
    }
    return s.lastMindSecretId
      ? this.other(s, s.lastMindSecretId)
      : s.players[0];
  }
  private ackHowToPlay(s: InternalState, playerId: string, firstType: string) {
    if (s.phase !== "HOW_TO_PLAY")
      throw new BadRequestException("The briefing is over");
    s.howToPlayAcks[playerId] = true;
    if (s.players.every((p) => s.howToPlayAcks[p]))
      this.beginRound(s, firstType);
  }
  /** An activated card that never took effect goes back to its owner's hand, unspent. */
  private releasePicky(s: InternalState) {
    if (!s.picky) return;
    const power = (s.inventory[s.picky.ownerId] || []).find(
      (p) => p.id === s.picky!.powerId,
    );
    if (power) delete power.armed;
    delete s.picky;
  }
  private skip(s: InternalState, type: string) {
    if (RESOLVED_PHASES.includes(s.phase))
      throw new BadRequestException("This round is already settled");
    s.result =
      type === "CHEMISTRY"
        ? {
            variant: this.variant(s),
            chemistry: s.phase === "CHEMISTRY_CONSENT" ? "DECLINED" : "SKIPPED",
          }
        : { variant: this.variant(s), skipped: true };
    this.releasePicky(s);
    s.phase = "ROUND_COMPLETE";
  }

  declareMission(s: InternalState, playerId: string) {
    const mission = currentMission(s, playerId);
    if (!mission || mission.status !== "ACTIVE")
      throw new BadRequestException("There is no mission to claim right now");
    mission.status = "DECLARED";
  }
  confirmMission(
    s: InternalState,
    playerId: string,
    ownerId: string | undefined,
    confirmed: boolean,
  ) {
    if (!ownerId || ownerId === playerId)
      throw new ForbiddenException(
        "Only your partner can confirm your mission",
      );
    const mission = currentMission(s, ownerId);
    if (!mission || mission.status !== "DECLARED")
      throw new BadRequestException("No mission is waiting for your answer");
    if (!confirmed) {
      mission.status = "ACTIVE";
      mission.notYet++;
      return;
    }
    mission.status = "COMPLETED";
    s.stats[ownerId].missionsCompleted++;
    const inventory = s.inventory[ownerId] || (s.inventory[ownerId] = []);
    if (inventory.length >= INVENTORY_LIMIT) {
      s.rewards[ownerId] = { round: s.round, inventoryFull: true };
      return;
    }
    // The reward is drawn by its owner from the Power Card deck.
    const owed = s.powerDraws || (s.powerDraws = {});
    owed[ownerId] = (owed[ownerId] || 0) + 1;
  }

  /** How many face-down cards each draw open to this player would spread right now. */
  drawable(s: InternalState, playerId: string) {
    const out: Partial<Record<"MISSION" | "POWER", number>> = {};
    if (["HOW_TO_PLAY", "GAME_COMPLETE"].includes(s.phase) || isOutdated(s))
      return out;
    const deck = s.missionDeck?.[playerId] || [];
    if (
      deck.length &&
      !currentMission(s, playerId) &&
      (s.missions[playerId] || []).length < MISSIONS_PER_PLAYER
    )
      out.MISSION = Math.min(DRAW_SPREAD.MISSION, deck.length);
    if (s.powerDraws?.[playerId])
      out.POWER = Math.min(
        DRAW_SPREAD.POWER,
        this.powerChoices(s, playerId).length,
      );
    return out;
  }
  private powerChoices(s: InternalState, playerId: string) {
    const held = new Set((s.inventory[playerId] || []).map((p) => p.kind));
    const fresh = POWER_KINDS.filter((k) => !held.has(k));
    return fresh.length ? fresh : POWER_KINDS;
  }
  /** Forfeits the next spread is dealt from: the ones not drawn yet this session, or the whole pile once all were drawn. */
  private forfeitChoices(s: InternalState) {
    const used = new Set(s.forfeitUsed || []);
    const fresh = s.forfeitIds.filter((id) => !used.has(id));
    return fresh.length ? fresh : s.forfeitIds;
  }
  forfeitSpread(s: InternalState) {
    return Math.min(DRAW_SPREAD.FORFEIT, this.forfeitChoices(s).length);
  }
  /**
   * A draw: the server lays out up to DRAW_SPREAD face-down cards in a fresh random order and the player takes the one at
   * the position they tapped. Only the spread size is ever projected, so a position says nothing about what lies under it.
   */
  drawCard(
    s: InternalState,
    playerId: string,
    kind: DrawKind | undefined,
    choice: number | undefined,
  ) {
    const pick = <T>(options: T[]) => {
      if (!Number.isInteger(choice) || choice! < 0 || choice! >= options.length)
        throw new BadRequestException("Pick one of the face-down cards");
      return options[choice!];
    };
    if (kind === "FORFEIT") {
      const f = s.forfeit;
      if (s.phase !== "REVEAL" || f?.stage !== "DRAWING")
        throw new BadRequestException("There is no forfeit to draw");
      if (f.payerId !== playerId)
        throw new ForbiddenException(
          "Only the player who missed draws the forfeit",
        );
      const spread = this.shuffle(this.forfeitChoices(s)).slice(
        0,
        DRAW_SPREAD.FORFEIT,
      );
      f.cardId = pick(spread);
      f.stage = "OFFERED";
      s.forfeitUsed = [...(s.forfeitUsed || []), f.cardId];
      return;
    }
    const open = this.drawable(s, playerId);
    if (kind === "MISSION") {
      if (!open.MISSION)
        throw new BadRequestException("There is no mission to draw");
      const deck = s.missionDeck![playerId];
      const cardId = pick(this.shuffle(deck).slice(0, open.MISSION));
      deck.splice(deck.indexOf(cardId), 1);
      (s.missions[playerId] || (s.missions[playerId] = [])).push({
        cardId,
        status: "ACTIVE",
        notYet: 0,
      });
      return;
    }
    if (kind === "POWER") {
      if (!open.POWER)
        throw new BadRequestException("There is no Power Card to draw");
      const drawn = pick(
        this.shuffle(this.powerChoices(s, playerId)).slice(0, open.POWER),
      );
      s.powerDraws![playerId]--;
      const inventory = s.inventory[playerId] || (s.inventory[playerId] = []);
      if (inventory.length >= INVENTORY_LIMIT) {
        s.rewards[playerId] = { round: s.round, inventoryFull: true };
        return;
      }
      const power = { id: `${drawn}-${s.version}-${playerId}`, kind: drawn };
      inventory.push(power);
      s.rewards[playerId] = {
        powerId: power.id,
        kind: drawn,
        title: POWER_COPY[drawn].title,
        round: s.round,
        inventoryFull: false,
      };
      return;
    }
    throw new BadRequestException("Unknown draw");
  }

  /** Whether a held card can be played right now, with the reason shown on the card when it cannot. */
  powerAvailability(
    s: InternalState,
    cardType: string,
    playerId: string,
    power: PowerState,
  ): { usable: boolean; reason?: string } {
    if (power.armed)
      return { usable: false, reason: "Choosing a question now." };
    if (["HOW_TO_PLAY", "GAME_COMPLETE"].includes(s.phase))
      return {
        usable: false,
        reason: "Power Cards work during Mind Reader rounds.",
      };
    if (cardType !== "MIND_READER")
      return {
        usable: false,
        reason: "Save it. Power Cards only work on Mind Reader cards.",
      };
    if (power.kind === "PICKY_KITTY") {
      if (s.questionPicked)
        return {
          usable: false,
          reason: "A question was already picked for this card.",
        };
      if (s.picky)
        return { usable: false, reason: "A question is already being picked." };
      if (!this.unanswered(s))
        return {
          usable: false,
          reason: "Use it before anyone answers this Mind Reader card.",
        };
      return { usable: true };
    }
    if (
      s.phase !== "REVEAL" ||
      (power.kind === "A_LITTLE_PRESENT" && s.challengePart === 1)
    )
      return {
        usable: false,
        reason:
          power.kind === "LET_ME_IN"
            ? "Use it once the answers are revealed."
            : "Give it once this Mind Reader card is complete.",
      };
    if (s.forfeit?.stage === "OFFERED" || s.forfeit?.stage === "DRAWING")
      return { usable: false, reason: "Settle the forfeit first." };
    if (power.kind === "LET_ME_IN") {
      if (s.followUp?.stage === "ASKED")
        return {
          usable: false,
          reason: "A follow-up question is already open.",
        };
      if (s.followUpAskers[playerId])
        return {
          usable: false,
          reason: "You already asked about this reveal.",
        };
      return { usable: true };
    }
    if (s.bonus)
      return {
        usable: false,
        reason: "A Bonus Moment was already given on this card.",
      };
    return { usable: true };
  }
  /** No answer of any kind has been given on this Mind Reader card yet. */
  private unanswered(s: InternalState) {
    return (
      (s.phase === "WAITING_FOR_SECRET" &&
        s.secretChoice === undefined &&
        (s.challengePart ?? 1) === 1) ||
      (s.phase === "COUNTER_MIND_SUBMIT" && !Object.keys(s.counter).length)
    );
  }
  /** Cards a Power Card may draw from: enabled, this game, never above the agreed heat. */
  private async powerPool(
    tx: any,
    s: InternalState,
    kind: PowerKind,
  ): Promise<{ id: string; intensity: number }[]> {
    const type =
      kind === "PICKY_KITTY"
        ? "MIND_READER"
        : kind === "A_LITTLE_PRESENT"
          ? "CHEMISTRY"
          : undefined;
    if (!type) return [];
    return tx.gameCard.findMany({
      where: {
        gameId: "read-my-mind",
        enabled: true,
        type,
        intensity: { lte: s.heat },
      },
      select: { id: true, intensity: true },
    });
  }
  /**
   * A card is spent only by an effect that actually happens: a rejected activation leaves it in hand. Picky Kitty is
   * armed while its owner chooses and spent on the pick; Let Me In! and A Little Present are spent when the request is made.
   */
  usePower(
    s: InternalState,
    cardType: string,
    playerId: string,
    powerId?: string,
    pool: { id: string; intensity: number }[] = [],
  ) {
    const inventory = s.inventory[playerId] || [];
    const index = inventory.findIndex((p) => p.id === powerId);
    if (index < 0) throw new ForbiddenException("Power Card not owned");
    const power = inventory[index];
    const availability = this.powerAvailability(s, cardType, playerId, power);
    if (!availability.usable)
      throw new BadRequestException(availability.reason);
    const eligible = pool.filter((c) => c.intensity <= s.heat);
    if (power.kind === "PICKY_KITTY") {
      // Up to three; fewer when the heat cap leaves fewer. With none at all the card stays unspent in hand.
      const candidates = this.questionCandidates(s, eligible);
      if (!candidates.length)
        throw new BadRequestException(
          "No fresh question is left at tonight's heat",
        );
      power.armed = true;
      s.picky = { ownerId: playerId, powerId: power.id, candidates };
      return;
    }
    if (power.kind === "LET_ME_IN") {
      const responderId = this.other(s, playerId);
      const latest = [...(s.result?.predictions || [])].reverse();
      const held = latest.find((p) => p.holderId === responderId),
        guessed = latest.find((p) => p.guesserId === responderId);
      if (!held && !guessed)
        throw new BadRequestException("There is no answer to ask about");
      s.followUp = {
        askerId: playerId,
        responderId,
        ...(held
          ? { choice: held.secretChoice, role: "ANSWER" as const }
          : { choice: guessed!.guessChoice, role: "GUESS" as const }),
        stage: "ASKED",
      };
      s.followUpAskers[playerId] = true;
    } else {
      // Only a challenge from tonight's heat that this session has neither dealt nor offered: never a repeat.
      const fresh = eligible.filter(
        (c) => !s.bonusCardIds.includes(c.id) && !s.cardIds.includes(c.id),
      );
      const [cardId] = this.pickByHeat(fresh, s.heat, 1);
      if (!cardId)
        throw new BadRequestException("No Bonus Moment fits tonight's heat");
      s.bonus = {
        giverId: playerId,
        receiverId: this.other(s, playerId),
        cardId,
        votes: {},
        stage: "OFFERED",
      };
      s.bonusCardIds.push(cardId);
    }
    inventory.splice(index, 1);
  }
  /**
   * Up to three eligible questions: ones this session never dealt or used off-deck first, then ones still waiting later
   * in the deck (picking one swaps it forward, so the deck keeps its 12 cards).
   */
  questionCandidates(
    s: InternalState,
    eligible: { id: string; intensity: number }[],
  ) {
    const later = s.cardIds.slice(s.round),
      offDeck = new Set(s.extraCardIds || []);
    const fresh = this.pickByHeat(
      eligible.filter((c) => !s.cardIds.includes(c.id) && !offDeck.has(c.id)),
      s.heat,
      PICKY_CHOICES,
    );
    const upcoming = this.shuffle(
      eligible.filter((c) => later.includes(c.id)),
    ).map((c) => c.id);
    return [...fresh, ...upcoming].slice(0, PICKY_CHOICES);
  }
  cancelPower(s: InternalState, playerId: string, powerId?: string) {
    if (
      !s.picky ||
      s.picky.ownerId !== playerId ||
      s.picky.powerId !== powerId
    )
      throw new BadRequestException("Nothing to cancel");
    this.releasePicky(s);
  }
  /**
   * The pick replaces this card's question for both players and spends the card. A pick that was due later in the deck
   * swaps places with this card's question, so the deck keeps all 12 cards and the unpicked ones stay unplayed.
   */
  pickQuestion(s: InternalState, playerId: string, cardId?: string) {
    const p = s.picky;
    if (!p) throw new BadRequestException("There is no question to pick");
    if (p.ownerId !== playerId)
      throw new ForbiddenException("Only the Picky Kitty owner picks");
    if (!cardId || !p.candidates.includes(cardId))
      throw new BadRequestException("Pick one of the offered questions");
    const here = s.round - 1,
      there = s.cardIds.indexOf(cardId);
    if (there > here) s.cardIds[there] = s.cardIds[here];
    s.cardIds[here] = cardId;
    s.inventory[playerId] = (s.inventory[playerId] || []).filter(
      (x) => x.id !== p.powerId,
    );
    delete s.picky;
    s.questionPicked = true;
  }
  /** Let Me In!: the partner explains their pick, in person or in a line of text, or passes. The result never changes. */
  followUpReply(
    s: InternalState,
    playerId: string,
    accept: boolean,
    text?: string,
  ) {
    const f = s.followUp;
    if (s.phase !== "REVEAL" || !f || f.stage !== "ASKED")
      throw new BadRequestException("No follow-up is waiting");
    if (f.responderId !== playerId)
      throw new ForbiddenException("Only your partner can answer this");
    if (!accept) {
      f.stage = "DECLINED";
      return;
    }
    f.stage = "ANSWERED";
    const reply = cleanText(text, REPLY_MAX);
    if (reply) f.reply = reply;
  }
  /** A Little Present: the Bonus Moment happens only if both say yes once they have seen it. A no costs nothing. */
  bonusVote(s: InternalState, playerId: string, accept: boolean) {
    const b = s.bonus;
    if (!b || b.stage !== "OFFERED")
      throw new BadRequestException("There is no Bonus Moment to answer");
    if (playerId in b.votes && accept)
      throw new BadRequestException("You already answered");
    b.votes[playerId] = accept;
    if (!accept) b.stage = "DECLINED";
    else if (s.players.every((p) => b.votes[p])) b.stage = "ACCEPTED";
  }
  /**
   * Like Chemistry: complete only once both confirm it happened; either can stop it at any time. Neither outcome scores.
   */
  bonusDone(s: InternalState, playerId: string, completed: boolean) {
    const b = s.bonus;
    if (b?.stage !== "ACCEPTED")
      throw new BadRequestException("The Bonus Moment is not in progress");
    if (!completed) {
      b.stage = "STOPPED";
      return;
    }
    const done = b.done || (b.done = {});
    if (done[playerId]) throw new BadRequestException("You already confirmed");
    done[playerId] = true;
    if (s.players.every((p) => done[p])) b.stage = "COMPLETED";
  }

  /** The question the open Mind Reader step asks: Double Challenge part B has its own. */
  questionId(s: InternalState) {
    return s.challengePart === 2 && s.secondCardId
      ? s.secondCardId
      : s.cardIds[s.round - 1];
  }
  /**
   * One prediction: the standard +1 Spark for a right guess, the stats bucket of its category, and a forfeit owed for a
   * miss. Spark is the game's reward; accuracy is read from the categories, never from Spark.
   */
  private settle(
    s: InternalState,
    holderId: string,
    guesserId: string,
    secretChoice: number,
    guessChoice: number,
    category: PredictionCategory,
  ): PredictionResult {
    const correct = secretChoice === guessChoice,
      sparksEarned = correct ? 1 : 0;
    s.scores[guesserId] = (s.scores[guesserId] || 0) + sparksEarned;
    const stats = s.stats[guesserId];
    const [total, right] = STAT_KEYS[category];
    stats[total]++;
    if (correct) stats[right]++;
    const p: PredictionResult = {
      holderId,
      guesserId,
      secretChoice,
      guessChoice,
      correct,
      sparksEarned,
      questionId: this.questionId(s),
      category,
    };
    s.predictions.push({
      ...p,
      round: s.round,
      cardId: s.cardIds[s.round - 1],
      ...(s.challengePart ? { part: s.challengePart } : {}),
      ...(s.activeTwist ? { twist: s.activeTwist } : {}),
    });
    if (!correct) s.forfeitQueue.push(guesserId);
    return p;
  }
  private cardPredictions(s: InternalState): PredictionResult[] {
    return s.predictions
      .filter((p) => p.round === s.round)
      .map(({ round: _r, cardId: _c, part: _p, twist: _t, ...p }) => p);
  }
  private offerForfeit(s: InternalState) {
    const payerId = s.forfeitQueue.shift();
    if (!payerId || !s.forfeitIds.length) {
      s.forfeitQueue = [];
      return;
    }
    // The player who missed draws it; either of you can still pass, before or after the draw.
    s.forfeit = { payerId, votes: {}, stage: "DRAWING" };
    s.wrongGuesses++;
  }

  mindReader(s: InternalState, playerId: string, a: GameAction) {
    if (a.type === "SUBMIT_COUNTER_MIND")
      return this.counterMind(s, playerId, a);
    if (
      a.type === "ASK_QUESTION" ||
      a.type === "PASS_QUESTION" ||
      a.type === "ANSWER_QUESTION"
    )
      return this.questionTime(s, playerId, a);
    if (s.picky)
      throw new BadRequestException("Wait for the question to be picked");
    if (a.type === "SUBMIT_SECRET") {
      if (s.phase !== "WAITING_FOR_SECRET" || s.secretPlayerId !== playerId)
        throw new ForbiddenException("Not your turn");
      this.choice(a.choice);
      s.secretChoice = a.choice;
      if (s.activeTwist === "ONE_MORE_QUESTION") {
        s.questions = Object.fromEntries(
          s.players.map((p) => [p, { status: "OPEN" as const }]),
        );
        s.phase = "QUESTION_TIME";
      } else s.phase = "WAITING_FOR_GUESS";
      return;
    }
    if (a.type !== "SUBMIT_GUESS")
      throw new BadRequestException("Invalid Mind Reader action");
    if (s.phase !== "WAITING_FOR_GUESS" || s.guessingPlayerId !== playerId)
      throw new ForbiddenException("Not your turn");
    this.choice(a.choice);
    const p = this.settle(
      s,
      s.secretPlayerId,
      playerId,
      s.secretChoice!,
      a.choice!,
      s.questions?.[playerId]?.status === "ANSWERED"
        ? "HINTED"
        : s.challengePart === 2
          ? "EXTRA"
          : "NORMAL",
    );
    s.guessChoice = a.choice;
    s.result = {
      secretChoice: p.secretChoice,
      guessChoice: p.guessChoice,
      correct: p.correct,
      sparksEarned: p.sparksEarned,
      variant: this.variant(s, s.challengePart === 2 ? 1 : 0),
      predictions: this.cardPredictions(s),
      ...(s.challengePart ? { part: s.challengePart } : {}),
    };
    this.offerForfeit(s);
    s.phase = "REVEAL";
  }
  /** Counter Mind: each answers for themselves and predicts the partner, in private; both predictions resolve together. */
  private counterMind(s: InternalState, playerId: string, a: GameAction) {
    if (s.phase !== "COUNTER_MIND_SUBMIT")
      throw new BadRequestException("Counter Mind is closed");
    if (s.picky)
      throw new BadRequestException("Wait for the question to be picked");
    if (playerId in s.counter)
      throw new BadRequestException("Your answers are already sealed");
    this.choice(a.choice);
    this.choice(a.prediction);
    s.counter[playerId] = { choice: a.choice!, prediction: a.prediction! };
    if (!s.players.every((p) => p in s.counter)) return;
    // Symmetric: both predictions are RECIPROCAL, neither ranked above the other. Order follows seating, not roles.
    for (const guesser of s.players) {
      const holder = this.other(s, guesser);
      this.settle(
        s,
        holder,
        guesser,
        s.counter[holder].choice,
        s.counter[guesser].prediction,
        "RECIPROCAL",
      );
    }
    s.result = { variant: this.variant(s), predictions: this.cardPredictions(s) };
    this.offerForfeit(s);
    s.phase = "REVEAL";
  }
  /** One More Question: after the answer is locked and before the guess, each may ask one Yes/No question; the partner answers or declines. */
  private questionTime(s: InternalState, playerId: string, a: GameAction) {
    const q = s.questions;
    if (s.phase !== "QUESTION_TIME" || !q)
      throw new BadRequestException("Question time is closed");
    if (a.type === "ANSWER_QUESTION") {
      const theirs = q[this.other(s, playerId)];
      if (theirs.status !== "ASKED")
        throw new BadRequestException("No question is waiting for your answer");
      if (a.answer === "DECLINE") theirs.status = "DECLINED";
      else if (a.answer === "YES" || a.answer === "NO") {
        theirs.status = "ANSWERED";
        theirs.answer = a.answer;
      } else throw new BadRequestException("Answer yes or no, or pass");
    } else {
      const mine = q[playerId];
      if (mine.status !== "OPEN")
        throw new BadRequestException("You already used your question");
      if (a.type === "PASS_QUESTION") mine.status = "PASSED";
      else {
        const text = cleanText(a.text, QUESTION_MAX);
        if (!text)
          throw new BadRequestException("Write your yes-or-no question first");
        mine.status = "ASKED";
        mine.text = text;
      }
    }
    if (
      s.players.every((p) =>
        ["PASSED", "ANSWERED", "DECLINED"].includes(q[p].status),
      )
    )
      s.phase = "WAITING_FOR_GUESS";
  }
  forfeitVote(s: InternalState, playerId: string, accept: boolean) {
    const f = s.forfeit;
    if (s.phase !== "REVEAL" || !f || !["DRAWING", "OFFERED"].includes(f.stage))
      throw new BadRequestException("There is no forfeit to answer");
    if (playerId in f.votes)
      throw new BadRequestException("You already answered");
    if (f.stage === "DRAWING" && accept)
      throw new BadRequestException("Draw the forfeit first");
    f.votes[playerId] = accept;
    if (!accept) f.stage = "PASSED";
    else if (s.players.every((p) => f.votes[p])) f.stage = "ACCEPTED";
  }
  /**
   * Consent -> both press start -> one server-stamped countdown -> both confirm (+1 Spark each) or either stops.
   * Running out of time never pays or fails anything: the players still decide whether it really happened.
   */
  chemistry(
    s: InternalState,
    playerId: string,
    a: GameAction,
    durationSeconds?: number | null,
    now: Date = new Date(),
  ) {
    if (a.type === "CHEMISTRY_VOTE") {
      if (s.phase !== "CHEMISTRY_CONSENT")
        throw new BadRequestException("Consent is closed");
      // A yes can always be withdrawn; a repeated yes is a duplicate.
      if (playerId in s.votes && a.accept)
        throw new BadRequestException("You already answered");
      s.votes[playerId] = !!a.accept;
      if (!a.accept) {
        s.result = { variant: this.variant(s), chemistry: "DECLINED" };
        s.phase = "ROUND_COMPLETE";
      } else if (s.players.every((p) => s.votes[p]))
        s.phase = "CHEMISTRY_ACCEPTED";
    } else if (a.type === "CHEMISTRY_START") {
      if (s.phase !== "CHEMISTRY_ACCEPTED")
        throw new BadRequestException("The challenge is not ready to start");
      // A repeated press can never restart or extend the clock.
      if (s.chemReady[playerId])
        throw new BadRequestException("You already pressed start");
      s.chemReady[playerId] = true;
      if (s.players.every((p) => s.chemReady[p])) {
        const seconds =
          Number.isInteger(durationSeconds) && durationSeconds! > 0
            ? durationSeconds!
            : undefined;
        s.chemTimer = {
          startedAt: now.toISOString(),
          ...(seconds
            ? {
                durationSeconds: seconds,
                endsAt: new Date(now.getTime() + seconds * 1000).toISOString(),
              }
            : {}),
        };
        s.phase = "CHEMISTRY_IN_PROGRESS";
      }
    } else if (a.type === "CHEMISTRY_DONE") {
      if (s.phase !== "CHEMISTRY_IN_PROGRESS")
        throw new BadRequestException("The challenge is not in progress");
      // Allowed before or after the deadline; the deadline itself stays put until the challenge resolves.
      if (s.chemDone[playerId])
        throw new BadRequestException("You already confirmed");
      s.chemDone[playerId] = true;
      s.chemDoneAt[playerId] = now.toISOString();
      if (s.players.every((p) => s.chemDone[p])) {
        for (const p of s.players) {
          s.scores[p] = (s.scores[p] || 0) + 1;
          s.stats[p].chemistryCompleted++;
        }
        s.result = { variant: this.variant(s), chemistry: "COMPLETED" };
        s.phase = "ROUND_COMPLETE";
      }
    } else if (a.type === "CHEMISTRY_STOP") {
      if (!["CHEMISTRY_ACCEPTED", "CHEMISTRY_IN_PROGRESS"].includes(s.phase))
        throw new BadRequestException("Nothing to stop");
      s.result = { variant: this.variant(s), chemistry: "SKIPPED" };
      s.phase = "ROUND_COMPLETE";
    } else throw new BadRequestException("Invalid Chemistry action");
  }
  mutualDesire(s: InternalState, playerId: string, a: GameAction) {
    if (a.type !== "MUTUAL_DESIRE_CHOICE")
      throw new BadRequestException("Invalid Mutual Desire action");
    if (
      s.phase !== "MUTUAL_DESIRE_CHOICE" ||
      !["YES", "MAYBE", "NO"].includes(a.desire || "")
    )
      throw new BadRequestException("Invalid private choice");
    if (playerId in s.desires)
      throw new BadRequestException("Your choice is already sealed");
    s.desires[playerId] = a.desire!;
    if (s.players.every((p) => p in s.desires)) {
      s.result = {
        variant: this.variant(s),
        mutualUnlocked: s.players.every((p) => s.desires[p] === "YES"),
      };
      s.phase = "MUTUAL_DESIRE_REVEAL";
    }
  }
  plotTwist(
    s: InternalState,
    playerId: string,
    a: GameAction,
    effect: TwistKind,
  ) {
    if (a.type !== "PLOT_TWIST_ACK")
      throw new BadRequestException("Invalid Plot Twist action");
    if (s.phase !== "PLOT_TWIST")
      throw new BadRequestException("Twist is closed");
    s.twistAcks[playerId] = true;
    if (!s.players.every((p) => s.twistAcks[p])) return;
    // Twists never stack: one already waiting keeps its place and this one does not apply.
    const already = !!s.pendingTwist;
    if (!already) s.pendingTwist = effect;
    s.result = {
      variant: this.variant(s),
      twistApplied: effect,
      ...(already ? { twistAlreadyPending: true } : {}),
    };
    s.phase = "ROUND_COMPLETE";
  }
  private async nextRound(tx: any, s: InternalState, currentType: string) {
    if (!RESOLVED_PHASES.includes(s.phase))
      throw new BadRequestException("Round is not complete");
    if (s.forfeit?.stage === "OFFERED" || s.forfeit?.stage === "DRAWING")
      throw new BadRequestException("Answer the forfeit first, or pass");
    // Steps inside one Mind Reader card: the forfeit for a second miss, then Double Challenge part B.
    if (currentType === "MIND_READER" && s.phase === "REVEAL") {
      if (s.forfeitQueue.length) {
        delete s.forfeit;
        this.offerForfeit(s);
        if (s.forfeit) return;
      }
      if (s.activeTwist === "DOUBLE_CHALLENGE" && s.challengePart === 1)
        return this.startSecondPart(s);
    }
    // The schedule resumes from the scheduled holder, so a twist never shifts later turns.
    if (currentType === "MIND_READER")
      s.lastMindSecretId = s.normalSecretPlayerId || s.secretPlayerId;
    if (s.round >= TOTAL_ROUNDS) {
      s.phase = "GAME_COMPLETE";
      return;
    }
    s.round++;
    this.clearCard(s);
    const next = await tx.gameCard.findUniqueOrThrow({
      where: { id: s.cardIds[s.round - 1] },
    });
    const second =
      next.type === "MIND_READER" && s.pendingTwist === "DOUBLE_CHALLENGE"
        ? this.secondQuestion(s, await this.powerPool(tx, s, "PICKY_KITTY"))
        : undefined;
    this.beginRound(s, next.type, second);
  }
  /** Everything scoped to one card. The active twist is consumed here, once its Mind Reader card has ended. */
  private clearCard(s: InternalState) {
    this.releasePicky(s);
    for (const key of [
      "secretChoice",
      "guessChoice",
      "result",
      "forfeit",
      "twistNotice",
      "activeTwist",
      "challengePart",
      "secondCardId",
      "twistSkipped",
      "questions",
      "questionPicked",
      "followUp",
      "bonus",
      "normalSecretPlayerId",
      "chemTimer",
    ] as const)
      delete s[key];
    s.votes = {};
    s.chemDone = {};
    s.chemReady = {};
    s.chemDoneAt = {};
    s.desires = {};
    s.twistAcks = {};
    s.counter = {};
    s.followUpAskers = {};
    s.forfeitQueue = [];
  }
  /** Double Challenge part B: the same question with roles reversed, and its own lock, guess and reveal. */
  private startSecondPart(s: InternalState) {
    for (const key of [
      "secretChoice",
      "guessChoice",
      "result",
      "forfeit",
      "followUp",
    ] as const)
      delete s[key];
    s.followUpAskers = {};
    s.forfeitQueue = [];
    s.challengePart = 2;
    [s.secretPlayerId, s.guessingPlayerId] = [
      s.guessingPlayerId,
      s.secretPlayerId,
    ];
    if (s.twistNotice) s.twistNotice.secretPlayerId = s.secretPlayerId;
    s.phase = "WAITING_FOR_SECRET";
  }
  private choice(choice?: number) {
    if (!Number.isInteger(choice) || choice! < 0 || choice! > 2)
      throw new BadRequestException("Choice must be 0, 1, or 2");
  }

  async project(
    roomId: string,
    viewerId: string,
    locale: Locale = "vi",
  ): Promise<RoomView> {
    const translations = locale === "en" ? undefined : { where: { locale } };
    const room = await this.db.room.findUniqueOrThrow({
      where: { id: roomId },
      include: {
        players: { orderBy: { joinedAt: "asc" } },
        sessions: {
          where: { status: "ACTIVE" },
          orderBy: { startedAt: "desc" },
          take: 1,
        },
      },
    });
    const agreedHeat = (room.players.find((p) => p.isHost)?.maxHeat ??
      3) as HeatLevel;
    let game: GameStateView | undefined;
    const session = room.sessions[0];
    if (session) {
      const s = normalize(session.state);
      const partnerId = s.players.find((p) => p !== viewerId) || "";
      // Double Challenge part B projects its own question; it is never sent before part B begins.
      const raw = await this.db.gameCard.findUniqueOrThrow({
        where: { id: this.questionId(s) },
        ...(translations ? { include: { translations } } : {}),
      });
      const card = { ...raw, ...localizeCard(raw) };
      const outdated = isOutdated(s);
      const own = currentMission(s, viewerId),
        partner = currentMission(s, partnerId),
        partnerDeclared = partner?.status === "DECLARED" ? partner : undefined;
      // Picky Kitty candidates are the owner's alone; the partner only learns that a question is being picked.
      const candidateIds =
        s.picky?.ownerId === viewerId ? s.picky.candidates : [];
      const lookup = [
        own?.cardId,
        partnerDeclared?.cardId,
        s.forfeit?.cardId,
        s.bonus?.cardId,
        ...candidateIds,
      ].filter(Boolean) as string[];
      const extra = lookup.length
        ? await this.db.gameCard.findMany({
            where: { id: { in: lookup } },
            ...(translations ? { include: { translations } } : {}),
          })
        : [];
      const localized = (id?: string) => {
        const c = extra.find((x) => x.id === id);
        return c ? { ...c, ...localizeCard(c as typeof c & CardText) } : undefined;
      };
      const text = (id?: string) => localized(id)?.question || "";
      const toMission = (ownerId: string, m: MissionState) => {
        const list = s.missions[ownerId] || [];
        return {
          id: m.cardId,
          text: text(m.cardId),
          status: m.status,
          ownerId,
          number: list.indexOf(m) + 1,
          // Drawn missions count toward the full set a player will draw, not only the ones drawn so far.
          total: s.missionDeck ? MISSIONS_PER_PLAYER : list.length,
          notYetCount: m.notYet,
        };
      };
      // An outdated session's cards are left untouched in storage but not offered: they belong to rules no longer played.
      const inventory: PowerCardView[] = (
        outdated ? [] : s.inventory[viewerId] || []
      ).map((p) => ({
          id: p.id,
          kind: p.kind,
          ...POWER_COPY[p.kind],
          status: p.armed ? "ARMED" : "READY",
          ...this.powerAvailability(s, card.type, viewerId, p),
        }));
      const hasSubmittedChoice =
        card.type === "CHEMISTRY"
          ? viewerId in s.votes
          : card.type === "MUTUAL_DESIRE"
            ? viewerId in s.desires
            : card.type === "PLOT_TWIST"
              ? viewerId in s.twistAcks
              : viewerId in s.counter;
      const bonusCard = localized(s.bonus?.cardId);
      const draws = this.drawable(s, viewerId);
      game = {
        id: session.id,
        gameSlug: "read-my-mind",
        phase: s.phase,
        round: s.round,
        totalRounds: TOTAL_ROUNDS,
        version: s.version,
        heat: s.heat,
        secretPlayerId: s.secretPlayerId,
        guessingPlayerId: s.guessingPlayerId,
        card: {
          id: card.id,
          type: card.type as CardCategory,
          question: card.question,
          choices: card.choices as string[],
          intensity: card.intensity,
          artworkPath: card.artworkPath,
          ...(card.challenge ? { challenge: card.challenge } : {}),
          ...(card.durationSeconds
            ? { durationSeconds: card.durationSeconds }
            : {}),
          ...(card.type === "PLOT_TWIST" && s.twistEffects?.[card.id]
            ? { effect: s.twistEffects[card.id] }
            : {}),
        },
        ...(outdated ? { outdated: true } : {}),
        ...(s.twistSkipped ? { twistSkipped: s.twistSkipped } : {}),
        hasSubmittedSecret: s.secretChoice !== undefined,
        hasSubmittedChoice,
        ...(s.secretChoice !== undefined && s.secretPlayerId === viewerId
          ? { mySecretChoice: s.secretChoice }
          : {}),
        nextMindReaderSecretId: this.nextMindSecret(s, card.type),
        result: s.result,
        scores: s.scores,
        stats: s.stats,
        howToPlay: {
          iAcknowledged: !!s.howToPlayAcks[viewerId],
          partnerAcknowledged: !!s.howToPlayAcks[partnerId],
        },
        ...(card.type === "CHEMISTRY" && s.phase !== "HOW_TO_PLAY"
          ? {
              chemistry: {
                stage: chemistryStage(s, viewerId),
                iConsented: !!s.votes[viewerId],
                iFinished: !!s.chemDone[viewerId],
                partnerFinished: !!s.chemDone[partnerId],
                sparksEach: 1,
                ...chemistryTiming(s, viewerId, card.durationSeconds),
              },
            }
          : {}),
        ...(s.forfeit
          ? {
              forfeit: {
                text: s.forfeit.cardId ? text(s.forfeit.cardId) : "",
                ...(s.forfeit.stage === "DRAWING"
                  ? { cards: this.forfeitSpread(s) }
                  : {}),
                stage: (s.forfeit.stage === "OFFERED" &&
                viewerId in s.forfeit.votes
                  ? "WAITING"
                  : s.forfeit.stage) as ForfeitStage,
                payerId: s.forfeit.payerId,
                iVoted: viewerId in s.forfeit.votes,
              },
            }
          : {}),
        sparkValue: 1,
        ...(s.pendingTwist ? { pendingTwist: s.pendingTwist } : {}),
        ...(s.twistNotice ? { twistNotice: s.twistNotice } : {}),
        ...(s.challengePart ? { challengePart: s.challengePart } : {}),
        ...(s.phase === "COUNTER_MIND_SUBMIT"
          ? {
              counterMind: {
                iSubmitted: viewerId in s.counter,
                partnerSubmitted: partnerId in s.counter,
                ...(s.counter[viewerId]
                  ? {
                      myChoice: s.counter[viewerId].choice,
                      myPrediction: s.counter[viewerId].prediction,
                    }
                  : {}),
              },
            }
          : {}),
        ...(s.questions ? { questions: s.questions } : {}),
        ...(s.picky
          ? {
              pickyKitty: {
                ownerId: s.picky.ownerId,
                ...(candidateIds.length
                  ? {
                      candidates: candidateIds.map((id) => {
                        const c = localized(id);
                        return {
                          id,
                          question: c?.question || "",
                          choices: (c?.choices as string[]) || [],
                          intensity: c?.intensity || 1,
                        };
                      }),
                    }
                  : {}),
              },
            }
          : {}),
        ...(s.followUp ? { followUp: s.followUp } : {}),
        ...(s.bonus
          ? {
              bonusMoment: {
                giverId: s.bonus.giverId,
                receiverId: s.bonus.receiverId,
                question: bonusCard?.question || "",
                ...(bonusCard?.challenge
                  ? { challenge: bonusCard.challenge }
                  : {}),
                stage: s.bonus.stage,
                iAccepted: !!s.bonus.votes[viewerId],
                iAnswered: viewerId in s.bonus.votes,
                iFinished: !!s.bonus.done?.[viewerId],
                partnerFinished: !!s.bonus.done?.[partnerId],
              },
            }
          : {}),
        mission: own ? toMission(viewerId, own) : undefined,
        opponentMissionDeclared: partnerDeclared
          ? toMission(partnerId, partnerDeclared)
          : undefined,
        missionsLeft:
          (s.missions[viewerId] || []).filter((m) => m.status !== "COMPLETED")
            .length +
          Math.max(
            0,
            Math.min(
              MISSIONS_PER_PLAYER - (s.missions[viewerId] || []).length,
              s.missionDeck?.[viewerId]?.length || 0,
            ),
          ),
        ...(Object.keys(draws).length ? { draws } : {}),
        inventory,
        inventoryCounts: Object.fromEntries(
          Object.entries(s.inventory).map(([id, list]) => [id, list.length]),
        ),
        inventoryLimit: INVENTORY_LIMIT,
        ...(s.rewards[viewerId] ? { lastReward: s.rewards[viewerId] } : {}),
      };
    }
    return {
      id: room.id,
      code: room.code,
      status: room.status,
      selectedGame: room.selectedGame as any,
      agreedHeat,
      expiresAt: room.expiresAt.toISOString(),
      players: room.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        isHost: p.isHost,
        connected: p.connected,
        ready: p.ready,
        maxHeat: (p.maxHeat ?? 3) as HeatLevel,
      })),
      ...(game ? { game } : {}),
    };
  }
}

export function currentMission(s: InternalState, playerId: string) {
  return (s.missions[playerId] || []).find((m) => m.status !== "COMPLETED");
}
function chemistryStage(s: InternalState, viewerId: string): ChemistryStage {
  if (s.phase === "CHEMISTRY_CONSENT")
    return viewerId in s.votes ? "WAITING_FOR_CONSENT" : "INVITATION";
  if (s.phase === "CHEMISTRY_ACCEPTED")
    return s.chemReady[viewerId] ? "WAITING_TO_START" : "MUTUALLY_ACCEPTED";
  if (s.phase === "CHEMISTRY_IN_PROGRESS")
    return s.chemDone[viewerId] ? "WAITING_FOR_COMPLETION" : "IN_PROGRESS";
  return s.result?.chemistry || "SKIPPED";
}
/**
 * Timer fields for one viewer. `serverNow` lets each client measure its own clock offset; expiry is derived from the
 * persisted deadline, so it survives reconnects and server restarts without any in-memory timeout.
 */
export function chemistryTiming(
  s: InternalState,
  viewerId: string,
  cardDuration?: number | null,
  now: Date = new Date(),
) {
  const t = s.chemTimer;
  const durationSeconds = t ? t.durationSeconds : cardDuration || undefined;
  return {
    iReady: !!s.chemReady[viewerId],
    ...(durationSeconds ? { durationSeconds } : {}),
    ...(t ? { startedAt: t.startedAt } : {}),
    ...(t?.endsAt ? { endsAt: t.endsAt } : {}),
    ...(s.chemDoneAt[viewerId] ? { iFinishedAt: s.chemDoneAt[viewerId] } : {}),
    serverNow: now.toISOString(),
    timerExpired: !!t?.endsAt && now.getTime() >= Date.parse(t.endsAt),
  };
}
/** The live countdown deadline of a session, if a timed Chemistry challenge is running. */
export function chemistryDeadline(s: InternalState) {
  return s.phase === "CHEMISTRY_IN_PROGRESS" && s.chemTimer?.endsAt
    ? Date.parse(s.chemTimer.endsAt)
    : undefined;
}
/**
 * Fills fields added after a session was persisted, so a restart or reconnect reads the same game. It never changes what
 * a dealt card means: a session from an older ruleset keeps its stored cards untouched and is reported as outdated.
 */
export function normalize(raw: unknown): InternalState {
  const s = raw as any;
  const players = (s.players || Object.keys(s.scores || {})) as [
    string,
    string,
  ];
  if (s.phase === "CHEMISTRY_CONFIRM") s.phase = "CHEMISTRY_IN_PROGRESS";
  const missions: Record<string, MissionState[]> = {};
  for (const [id, m] of Object.entries(s.missions || {}))
    missions[id] = (Array.isArray(m) ? m : [m]).map((x: any) => ({
      notYet: 0,
      ...x,
    }));
  const stats: Record<string, PlayerStats> = {};
  for (const p of players)
    stats[p] = { ...emptyStats(), ...(s.stats?.[p] || {}) };
  return {
    seed: 0,
    heat: 3,
    forfeitIds: [],
    wrongGuesses: 0,
    rewards: {},
    howToPlayAcks: {},
    chemDone: {},
    chemReady: {},
    chemDoneAt: {},
    votes: {},
    desires: {},
    twistAcks: {},
    inventory: {},
    counter: {},
    followUpAskers: {},
    bonusCardIds: [],
    forfeitQueue: [],
    predictions: [],
    ...s,
    players,
    missions,
    stats,
    ...(s.confirmations ? { chemDone: s.chemDone || s.confirmations } : {}),
  };
}
