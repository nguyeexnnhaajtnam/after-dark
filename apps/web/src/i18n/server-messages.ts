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
 [/not your turn|you are not seated|only the picky kitty owner|only your partner can answer/i,'notYourTurn'],
 [/finish the briefing/i,'briefing'],
 [/already answered|already pressed start|already confirmed|already used your question/i,'alreadyAnswered'],
 [/already sealed/i,'alreadySealed'],
 [/no fresh question is left/i,'noQuestions'],
 [/older rules/i,'outdated'],
 [/no bonus moment fits/i,'noBonus'],
 [/wait for the question to be picked/i,'waitPick'],
 [/write your yes-or-no question/i,'questionEmpty'],
 [/answer the forfeit first/i,'forfeitFirst'],
 [/pick one of the face-down cards/i,'drawPick'],
 [/draw the forfeit first/i,'drawForfeitFirst'],
 [/only the player who missed draws/i,'notYourTurn'],
 [/no mission to draw|no power card to draw|no forfeit to draw|unknown draw/i,'drawNone'],
 [/round is not complete/i,'roundNotDone'],
 [/game is over|no active game/i,'gameOver'],
 [/no mission to claim/i,'missionNone'],
 [/no mission is waiting/i,'missionVerdict'],
 [/only your partner can confirm/i,'missionPartnerOnly'],
 [/power card not owned/i,'powerNotOwned'],
 [/consent is closed|twist is closed|briefing is over|already settled|nothing to stop|not ready to start|not in progress|no forfeit to answer|counter mind is closed|question time is closed|no question is waiting|no follow-up is waiting|no bonus moment to answer|no question to pick|offered questions|nothing to cancel|no answer to ask about|answer yes or no/i,'closed'],
 [/authenticate first/i,'authenticate'],
 [/not enough secret missions/i,'deckEmpty'],
];

/** The server's reasons for an unusable Power Card, by exact text. */
const POWER_REASONS:Record<string,PowerReasonKey>={
 'Choosing a question now.':'armed',
 'Power Cards work during Mind Reader rounds.':'phase',
 'Save it. Power Cards only work on Mind Reader cards.':'notMindReader',
 'Use it before anyone answers this Mind Reader card.':'tooLatePick',
 'A question was already picked for this card.':'alreadyPicked',
 'A question is already being picked.':'picking',
 'Use it once the answers are revealed.':'afterReveal',
 'Give it once this Mind Reader card is complete.':'afterComplete',
 'Settle the forfeit first.':'forfeitFirst',
 'A follow-up question is already open.':'followUpOpen',
 'You already asked about this reveal.':'alreadyAsked',
 'A Bonus Moment was already given on this card.':'presentGiven',
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
