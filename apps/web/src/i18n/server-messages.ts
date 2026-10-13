import type {Messages} from './config';

// The API speaks English internally. These tables map its messages to translation keys, so raw server text never
// reaches the screen: anything unrecognised falls back to a generic, localized message.
export type ActionErrorKey=keyof Messages['errors']['action'];
export type PageErrorKey=Exclude<keyof Messages['errors'],'action'>;
export type PowerReasonKey=keyof Messages['powers']['reasons'];

const ACTION_ERRORS:Array<[RegExp,ActionErrorKey]>=[
 [/stale|duplicate/i,'stale'],
 [/write conflict|deadlock|could not serialize/i,'conflict'],
 [/only the host can select/i,'hostOnlyGame'],
 [/only the host can set the heat/i,'hostOnlyHeat'],
 [/only the host can start/i,'hostOnlyStart'],
 [/only the host can return/i,'hostOnlyLobby'],
 [/partner is not in yet|both players must be ready/i,'partnerNotIn'],
 [/coming soon|unknown game/i,'comingSoon'],
 [/heat is locked|finish the current game/i,'heatLocked'],
 [/not your turn|only the guesser|you are not seated/i,'notYourTurn'],
 [/finish the briefing/i,'briefing'],
 [/already answered|already pressed start|already confirmed/i,'alreadyAnswered'],
 [/already sealed/i,'alreadySealed'],
 [/answer the forfeit first/i,'forfeitFirst'],
 [/round is not complete/i,'roundNotDone'],
 [/game is over|no active game/i,'gameOver'],
 [/no mission to claim/i,'missionNone'],
 [/no mission is waiting/i,'missionVerdict'],
 [/only your partner can confirm/i,'missionPartnerOnly'],
 [/power card not owned/i,'powerNotOwned'],
 [/already crossed out/i,'crossedOut'],
 [/consent is closed|twist is closed|briefing is over|already settled|nothing to stop|not ready to start|not in progress|no forfeit to answer/i,'closed'],
 [/authenticate first/i,'authenticate'],
 [/not enough secret missions/i,'deckEmpty'],
];

/** The server's reasons for an unusable Power Card, by exact text. */
const POWER_REASONS:Record<string,PowerReasonKey>={
 'Armed. It triggers when you lock in your guess this round.':'armed',
 'Power Cards work during Mind Reader rounds.':'phase',
 'Save it. Power Cards only work on Mind Reader cards.':'notMindReader',
 'Too late for this card. Use it before the secret answer is locked.':'tooLateSecret',
 'Roles were already swapped this round.':'alreadySwapped',
 'Too late. The guess is already in.':'tooLateGuess',
 'Only the guesser can use this. Wait for your turn to read.':'guesserOnly',
 'Your second chance is already in play.':'secondChanceLive',
 'One of these is already armed.':'oneArmed',
};

export function actionErrorKey(message:string):ActionErrorKey{
 return ACTION_ERRORS.find(([pattern])=>pattern.test(message))?.[1]??'generic';
}

/** Power Card rejections reuse the card's own explanation. */
export const powerReasonKey=(reason?:string):PowerReasonKey|undefined=>reason?POWER_REASONS[reason]:undefined;

/** Errors that replace a whole screen (room forms, rejoin). */
export function pageErrorKey(message:string):PageErrorKey{
 const text=message.toLowerCase();
 if(text.includes('too many'))return 'tooMany';
 if(text.includes('full'))return 'full';
 if(text.includes('expired'))return 'expired';
 if(text.includes('nickname'))return 'nickname';
 if(/code must (match|be longer|be shorter)/.test(text))return 'codeFormat';
 if(text.includes('not found')||text.includes('code'))return 'invalidCode';
 if(text.includes('credential')||text.includes('access')||text.includes('authenticate'))return 'private';
 if(text.includes('connect')||text.includes('network')||text.includes('fetch'))return 'connection';
 return 'fallback';
}
