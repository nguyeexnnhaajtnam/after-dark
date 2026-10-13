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
  ForfeitStage,
  GameAction,
  GamePhase,
  GameStateView,
  HeatLevel,
  Locale,
  PlayerStats,
  PowerCardView,
  PowerKind,
  RewardView,
  RoomView,
  RoundResult,
  TwistKind,
  TwistNotice,
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
type PowerState = { id: string; kind: PowerKind; armed?: boolean };
type ForfeitState = {
  cardId: string;
  payerId: string;
  votes: Record<string, boolean>;
  stage: "OFFERED" | "ACCEPTED" | "PASSED";
};
/** One authoritative countdown: the deadline is fixed at start and every view derives from it. */
export type ChemistryTimer = {
  startedAt: string;
  durationSeconds?: number;
  endsAt?: string;
};
export type InternalState = {
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
  lastMindSecretId?: string;
  secretChoice?: number;
  guessChoice?: number;
  firstMiss?: number;
  result?: RoundResult;
  scores: Record<string, number>;
  stats: Record<string, PlayerStats>;
  missions: Record<string, MissionState[]>;
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
  pendingTwists: TwistKind[];
  twistNotice?: TwistNotice;
  roleSwappedThisRound?: boolean;
};

export const TOTAL_ROUNDS = 12;
export const INVENTORY_LIMIT = 2;
export const MISSIONS_PER_PLAYER = 2;
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
]);
export const POWER_COPY: Record<
  PowerKind,
  { title: string; description: string; requirement: string }
> = {
  SECOND_CHANCE: {
    title: "Second Chance",
    description:
      "If your next guess misses, the miss is crossed out and you guess again. Kept if you get it right first time.",
    requirement: "Guesser only · arm before your guess",
  },
  ROLE_REVERSAL: {
    title: "Role Reversal",
    description:
      "Swap who hides the answer and who guesses on this Mind Reader card. Takes effect immediately.",
    requirement: "Either player · before the secret is locked",
  },
  DOUBLE_SPARK: {
    title: "Double Spark",
    description:
      "Double the Spark reward from your next correct Mind Reader guess. A wrong guess uses it up for nothing.",
    requirement: "Guesser only · arm before your guess",
  },
};
const emptyStats = (): PlayerStats => ({
  correctReads: 0,
  reads: 0,
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
  /** Opens with a Mind Reader card and keeps a Mind Reader card after every Plot Twist so each twist can take effect. */
  buildSchedule(byType: Record<string, string[]>) {
    const typeOf = new Map<string, string>();
    for (const [type, ids] of Object.entries(byType))
      for (const id of ids) typeOf.set(id, type);
    const all = [...typeOf.keys()];
    for (let attempt = 0; attempt < 200; attempt++) {
      const order = this.shuffle(all);
      const types = order.map((id) => typeOf.get(id));
      const lastMind = types.lastIndexOf("MIND_READER");
      if (
        types[0] === "MIND_READER" &&
        types.every((t, i) => t !== "PLOT_TWIST" || i < lastMind)
      )
        return order;
    }
    const mind = byType.MIND_READER || [],
      rest = all.filter((id) => typeOf.get(id) !== "MIND_READER");
    return [mind[0], ...rest, ...mind.slice(1)].filter(Boolean);
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
          MISSIONS_PER_PLAYER * 2,
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
        const state: InternalState = {
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
          missions: {
            [a]: missionIds
              .filter((_, i) => i % 2 === 0)
              .map((cardId) => ({ cardId, status: "ACTIVE", notYet: 0 })),
            [b]: missionIds
              .filter((_, i) => i % 2 === 1)
              .map((cardId) => ({ cardId, status: "ACTIVE", notYet: 0 })),
          },
          inventory: { [a]: [], [b]: [] },
          rewards: {},
          howToPlayAcks: {},
          votes: {},
          chemDone: {},
          chemReady: {},
          chemDoneAt: {},
          desires: {},
          twistAcks: {},
          pendingTwists: [],
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
  /** One card per twist effect, so a session never deals the same twist twice. */
  private pickTwists(cards: { id: string; choices: unknown }[]) {
    const seen = new Set<string>();
    return this.shuffle(cards)
      .filter((c) => {
        const effect = (c.choices as string[])[0];
        if (effect === "FRESH_START" || seen.has(effect)) return false;
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
    else if (a.type === "USE_POWER")
      this.usePower(s, card.type, playerId, a.powerId);
    else if (a.type === "FORFEIT_VOTE")
      this.forfeitVote(s, playerId, !!a.accept);
    else if (a.type === "SKIP") this.skip(s, card.type);
    else if (a.type === "NEXT_ROUND") await this.nextRound(tx, s, card.type);
    else if (card.type === "MIND_READER") this.mindReader(s, playerId, a);
    else if (card.type === "CHEMISTRY")
      this.chemistry(s, playerId, a, card.durationSeconds);
    else if (card.type === "MUTUAL_DESIRE") this.mutualDesire(s, playerId, a);
    else if (card.type === "PLOT_TWIST")
      this.plotTwist(s, playerId, a, card.choices as string[]);
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
  private beginRound(s: InternalState, type: string) {
    s.phase = PHASE_BY_TYPE[type];
    if (type !== "MIND_READER") return;
    const normal = s.lastMindSecretId
      ? this.other(s, s.lastMindSecretId)
      : s.players[0];
    let secret = normal;
    const reversal = s.pendingTwists.indexOf("ROLE_REVERSAL");
    if (reversal >= 0) {
      secret = this.other(s, normal);
      s.pendingTwists.splice(reversal, 1);
      s.twistNotice = {
        kind: "ROLE_REVERSAL",
        source: "PLOT_TWIST",
        normalSecretPlayerId: normal,
        secretPlayerId: secret,
      };
    }
    s.secretPlayerId = secret;
    s.guessingPlayerId = this.other(s, secret);
  }
  /** Normal alternation, before any pending twist: the current chooser while a Mind Reader card is open, otherwise the partner of the last chooser. */
  nextMindSecret(s: InternalState, cardType: string) {
    if (cardType === "MIND_READER" && s.phase !== "HOW_TO_PLAY")
      return RESOLVED_PHASES.includes(s.phase)
        ? this.other(s, s.secretPlayerId)
        : s.secretPlayerId;
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
  private disarmAll(s: InternalState) {
    for (const list of Object.values(s.inventory))
      for (const p of list) delete p.armed;
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
    this.disarmAll(s);
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
    const kinds: PowerKind[] = [
      "DOUBLE_SPARK",
      "SECOND_CHANCE",
      "ROLE_REVERSAL",
    ];
    const offset =
      (s.seed +
        s.stats[ownerId].missionsCompleted +
        (ownerId === s.players[0] ? 0 : 1)) %
      kinds.length;
    const rotated = [...kinds.slice(offset), ...kinds.slice(0, offset)];
    const kind =
      rotated.find((k) => !inventory.some((p) => p.kind === k)) || rotated[0];
    const power = { id: `${kind}-${s.version}-${ownerId}`, kind };
    inventory.push(power);
    s.rewards[ownerId] = {
      powerId: power.id,
      kind,
      title: POWER_COPY[kind].title,
      round: s.round,
      inventoryFull: false,
    };
  }

  powerAvailability(
    s: InternalState,
    cardType: string,
    playerId: string,
    power: PowerState,
  ): { usable: boolean; reason?: string } {
    if (power.armed)
      return {
        usable: false,
        reason: "Armed. It triggers when you lock in your guess this round.",
      };
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
    if (power.kind === "ROLE_REVERSAL") {
      if (s.phase !== "WAITING_FOR_SECRET")
        return {
          usable: false,
          reason:
            "Too late for this card. Use it before the secret answer is locked.",
        };
      if (s.roleSwappedThisRound)
        return {
          usable: false,
          reason: "Roles were already swapped this round.",
        };
      return { usable: true };
    }
    if (!["WAITING_FOR_SECRET", "WAITING_FOR_GUESS"].includes(s.phase))
      return { usable: false, reason: "Too late. The guess is already in." };
    if (s.guessingPlayerId !== playerId)
      return {
        usable: false,
        reason: "Only the guesser can use this. Wait for your turn to read.",
      };
    if (power.kind === "SECOND_CHANCE" && s.firstMiss !== undefined)
      return {
        usable: false,
        reason: "Your second chance is already in play.",
      };
    if (
      (s.inventory[playerId] || []).some(
        (p) => p.armed && p.kind === power.kind,
      )
    )
      return { usable: false, reason: "One of these is already armed." };
    return { usable: true };
  }
  usePower(
    s: InternalState,
    cardType: string,
    playerId: string,
    powerId?: string,
  ) {
    const inventory = s.inventory[playerId] || [];
    const index = inventory.findIndex((p) => p.id === powerId);
    if (index < 0) throw new ForbiddenException("Power Card not owned");
    const power = inventory[index];
    const availability = this.powerAvailability(s, cardType, playerId, power);
    if (!availability.usable)
      throw new BadRequestException(availability.reason);
    if (power.kind === "ROLE_REVERSAL") {
      const normal = s.secretPlayerId;
      [s.secretPlayerId, s.guessingPlayerId] = [
        s.guessingPlayerId,
        s.secretPlayerId,
      ];
      s.roleSwappedThisRound = true;
      s.twistNotice = {
        kind: "ROLE_REVERSAL",
        source: "POWER_CARD",
        normalSecretPlayerId: normal,
        secretPlayerId: s.secretPlayerId,
        byPlayerId: playerId,
      };
      this.disarmAll(s);
      inventory.splice(index, 1);
      return;
    }
    power.armed = true;
  }
  /** Twists apply to the whole round; armed cards apply only to their owner's guess. */
  sparkValue(s: InternalState, playerId: string) {
    const twist = s.pendingTwists.includes("DOUBLE_SPARK") ? 2 : 1;
    const armed = (s.inventory[playerId] || []).some(
      (p) => p.armed && p.kind === "DOUBLE_SPARK",
    )
      ? 2
      : 1;
    return twist * armed;
  }

  mindReader(s: InternalState, playerId: string, a: GameAction) {
    if (a.type === "SUBMIT_SECRET") {
      if (s.phase !== "WAITING_FOR_SECRET" || s.secretPlayerId !== playerId)
        throw new ForbiddenException("Not your turn");
      this.choice(a.choice);
      s.secretChoice = a.choice;
      s.phase = "WAITING_FOR_GUESS";
      return;
    }
    if (a.type !== "SUBMIT_GUESS")
      throw new BadRequestException("Invalid Mind Reader action");
    if (s.phase !== "WAITING_FOR_GUESS" || s.guessingPlayerId !== playerId)
      throw new ForbiddenException("Not your turn");
    this.choice(a.choice);
    if (a.choice === s.firstMiss)
      throw new BadRequestException("That answer is already crossed out");
    const inventory = s.inventory[playerId] || [];
    const correct = s.secretChoice === a.choice;
    const second = inventory.findIndex(
      (p) => p.armed && p.kind === "SECOND_CHANCE",
    );
    if (!correct && second >= 0 && s.firstMiss === undefined) {
      inventory.splice(second, 1);
      s.firstMiss = a.choice;
      return;
    }
    const sparks = correct ? this.sparkValue(s, playerId) : 0;
    const powersUsed: PowerKind[] = [
      ...(inventory.some((p) => p.armed && p.kind === "DOUBLE_SPARK")
        ? ["DOUBLE_SPARK" as const]
        : []),
      ...(s.firstMiss !== undefined ? ["SECOND_CHANCE" as const] : []),
    ];
    s.inventory[playerId] = inventory.filter(
      (p) => !(p.armed && p.kind === "DOUBLE_SPARK"),
    );
    this.disarmAll(s);
    s.pendingTwists = s.pendingTwists.filter((t) => t !== "DOUBLE_SPARK");
    s.scores[playerId] = (s.scores[playerId] || 0) + sparks;
    s.stats[playerId].reads++;
    if (correct) s.stats[playerId].correctReads++;
    s.guessChoice = a.choice;
    s.result = {
      secretChoice: s.secretChoice,
      guessChoice: a.choice,
      correct,
      sparksEarned: sparks,
      variant: this.variant(s),
      ...(s.firstMiss !== undefined ? { firstMiss: s.firstMiss } : {}),
      ...(powersUsed.length ? { powersUsed } : {}),
    };
    if (!correct && s.forfeitIds.length) {
      s.forfeit = {
        cardId: s.forfeitIds[s.wrongGuesses % s.forfeitIds.length],
        payerId: playerId,
        votes: {},
        stage: "OFFERED",
      };
      s.wrongGuesses++;
    }
    s.phase = "REVEAL";
  }
  forfeitVote(s: InternalState, playerId: string, accept: boolean) {
    const f = s.forfeit;
    if (s.phase !== "REVEAL" || !f || f.stage !== "OFFERED")
      throw new BadRequestException("There is no forfeit to answer");
    if (playerId in f.votes)
      throw new BadRequestException("You already answered");
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
    choices: string[],
  ) {
    if (a.type !== "PLOT_TWIST_ACK")
      throw new BadRequestException("Invalid Plot Twist action");
    if (s.phase !== "PLOT_TWIST")
      throw new BadRequestException("Twist is closed");
    s.twistAcks[playerId] = true;
    if (!s.players.every((p) => s.twistAcks[p])) return;
    const effect = (choices[0] || "FRESH_START") as TwistKind;
    let already = false;
    if (effect === "FRESH_START") s.pendingTwists = [];
    else if (s.pendingTwists.includes(effect)) already = true;
    else s.pendingTwists.push(effect);
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
    if (s.forfeit?.stage === "OFFERED")
      throw new BadRequestException("Answer the forfeit first, or pass");
    if (currentType === "MIND_READER") s.lastMindSecretId = s.secretPlayerId;
    if (s.round >= TOTAL_ROUNDS) {
      s.phase = "GAME_COMPLETE";
      return;
    }
    s.round++;
    this.disarmAll(s);
    delete s.secretChoice;
    delete s.guessChoice;
    delete s.firstMiss;
    delete s.result;
    delete s.forfeit;
    delete s.twistNotice;
    delete s.roleSwappedThisRound;
    s.votes = {};
    s.chemDone = {};
    s.chemReady = {};
    s.chemDoneAt = {};
    delete s.chemTimer;
    s.desires = {};
    s.twistAcks = {};
    const next = await tx.gameCard.findUniqueOrThrow({
      where: { id: s.cardIds[s.round - 1] },
    });
    this.beginRound(s, next.type);
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
      const raw = await this.db.gameCard.findUniqueOrThrow({
        where: { id: s.cardIds[s.round - 1] },
        ...(translations ? { include: { translations } } : {}),
      });
      const card = { ...raw, ...localizeCard(raw) };
      const own = currentMission(s, viewerId),
        partner = currentMission(s, partnerId),
        partnerDeclared = partner?.status === "DECLARED" ? partner : undefined;
      const lookup = [
        own?.cardId,
        partnerDeclared?.cardId,
        s.forfeit?.cardId,
      ].filter(Boolean) as string[];
      const extra = lookup.length
        ? await this.db.gameCard.findMany({
            where: { id: { in: lookup } },
            ...(translations ? { include: { translations } } : {}),
          })
        : [];
      const text = (id?: string) => {
        const c = extra.find((x) => x.id === id);
        return c ? localizeCard(c as typeof c & CardText).question : "";
      };
      const toMission = (ownerId: string, m: MissionState) => {
        const list = s.missions[ownerId] || [];
        return {
          id: m.cardId,
          text: text(m.cardId),
          status: m.status,
          ownerId,
          number: list.indexOf(m) + 1,
          total: list.length,
          notYetCount: m.notYet,
        };
      };
      const inventory: PowerCardView[] = (s.inventory[viewerId] || []).map(
        (p) => ({
          id: p.id,
          kind: p.kind,
          ...POWER_COPY[p.kind],
          status: p.armed ? "ARMED" : "READY",
          ...this.powerAvailability(s, card.type, viewerId, p),
        }),
      );
      const hasSubmittedChoice =
        card.type === "CHEMISTRY"
          ? viewerId in s.votes
          : card.type === "MUTUAL_DESIRE"
            ? viewerId in s.desires
            : card.type === "PLOT_TWIST"
              ? viewerId in s.twistAcks
              : false;
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
          ...(card.type === "PLOT_TWIST"
            ? { effect: (card.choices as string[])[0] as TwistKind }
            : {}),
        },
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
                text: text(s.forfeit.cardId),
                stage: (s.forfeit.stage === "OFFERED" &&
                viewerId in s.forfeit.votes
                  ? "WAITING"
                  : s.forfeit.stage) as ForfeitStage,
                payerId: s.forfeit.payerId,
                iVoted: viewerId in s.forfeit.votes,
              },
            }
          : {}),
        sparkValue:
          card.type === "MIND_READER" ? this.sparkValue(s, viewerId) : 1,
        pendingTwists: s.pendingTwists,
        ...(s.twistNotice ? { twistNotice: s.twistNotice } : {}),
        ...(s.firstMiss !== undefined ? { eliminatedChoice: s.firstMiss } : {}),
        mission: own ? toMission(viewerId, own) : undefined,
        opponentMissionDeclared: partnerDeclared
          ? toMission(partnerId, partnerDeclared)
          : undefined,
        missionsLeft: (s.missions[viewerId] || []).filter(
          (m) => m.status !== "COMPLETED",
        ).length,
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
/** Fills fields added after a session was persisted so older sessions keep working. */
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
    pendingTwists: s.activeModifier ? [s.activeModifier] : [],
    votes: {},
    desires: {},
    twistAcks: {},
    inventory: {},
    ...s,
    players,
    missions,
    stats,
    ...(s.confirmations ? { chemDone: s.chemDone || s.confirmations } : {}),
  };
}
