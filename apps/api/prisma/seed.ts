import { PrismaClient } from '@prisma/client';
import * as vi from './content/read-my-mind.vi';
const db = new PrismaClient();
// Game-level intensity: 2 Flirty · 3–4 Hot · 5 After Dark.
const games = [
  ['read-my-mind','Read My Mind','Can you guess what I want?','Hide an answer, read your partner, and earn Sparks for every right guess.','30–45 min',2,true],
  ['dare-me','Dare Me','How bold can you be?','Playful challenges and escalating double dares.','20–40 min',5,false],
  ['no-secrets','No Secrets',"What haven't you told me?",'Private choices become mutual discoveries.','40–60 min',4,false],
  ['take-control','Take Control','Your turn. Your rules.','Trade the lead and set the tone together.','45–60 min',5,false],
  ['lucky-tonight','Lucky Tonight','Let chance decide.','Unexpected prompts, rewards, and wild cards.','15–30 min',4,false],
] as const;

// Heat: 1 Sweet · 2 Flirty · 3 Spicy · 4 Daring · 5 Wild. Every level holds enough of each category for a full 12-card session.
// Card content stays natural adult flirting. Naughty Cats wordplay is kept for events: the UI catalogs and the Plot Twist
// headlines below (the twist card shows the functional effect name and rules from the UI next to its headline).
type Heat=1|2|3|4|5;
const mindReader:Record<Heat,Array<[string,string[]]>>={
 1:[
  ['If I catch you staring at me, what do I want you to do next?',['Look away and pretend nothing happened','Stare right back until I crack up','Walk over and kiss me without a word']],
  ['I’m glued to my phone. The sneakiest way to steal my attention is…',['Slip your hand into mine','Kiss my shoulder until I look up','Snatch the phone and make me chase you']],
  ['To make me blush on purpose, the trick that never fails is…',['A compliment out of nowhere','Reading my cheesiest old text out loud','Smiling at me like you know a secret']],
  ['The move I secretly wish you made more often…',['Pulling me in by the hand','A sneaky kiss on the back of my neck','Wrapping your arms around me from behind']],
  ['We’re in a pillow fight. My real plan is to…',['Win, fair and square','Lose on purpose and land in your arms','Call a truce and steal a kiss']],
  ['The name I most want to hear you say, right against my ear…',['Something sugary sweet','A cheeky nickname only we get','My real name, said slowly']],
 ],
 2:[
  ['Which of your flirting moves makes me give in fastest?',['Holding eye contact with a knowing smile','Whispering something daring in my ear','Stealing a quick kiss and walking away']],
  ['Across a crowded room, the signal that would make me come straight to you…',['One slow wink','A text that just says “now”','Looking at me and biting your lip']],
  ['Lips almost touching. How long do I hold out before I close the gap?',['Three seconds, tops','Until you crack first','I never do. I make you come to me']],
  ['The moment you’re impossible for me to resist…',['Laugh with your whole body','Get completely lost in something you love','Wake up sleepy with messy hair']],
  ['The text from you that would wreck my focus at work…',['“Still thinking about last night”','“Guess what I’m wearing”','“Come home early. We need to talk.”']],
  ['Between us, who really makes the first move?',['Me, obviously','You, but I set it up so it feels like your idea','Neither. We just collide']],
 ],
 3:[
  ['Where do you have to kiss me to make me forget what I was saying?',['The side of my neck','Right behind my ear','The inside of my wrist']],
  ['If you had to tease me without using your hands, I’d most want…',['Your breath on my neck','Kisses that stop just short of my lips','Your voice telling me what comes next']],
  ['If I’m a little jealous, which move of yours softens me fastest?',['Kissing me mid-sulk','Telling me exactly why it’s only me','Pulling me onto your lap and waiting']],
  ['The kind of torture I can’t stand, in the best way…',['You undoing one button, then stopping','Your hand on my thigh, not moving','You saying “later” in that voice']],
  ['If I make the first move tonight, I start by…',['Pinning you to the sofa with a kiss','Climbing into your lap','Pulling you in by the collar']],
  ['Mid-kiss, the thing that makes me melt is…',['You saying my name','You smiling into the kiss','You pulling back just to look at me']],
 ],
 4:[
  ['If you took control for ten minutes, the first rule I’d want you to set…',['I’m not allowed to touch you','My eyes stay closed the whole time','I have to ask for every kiss']],
  ['When the clothes start coming off tonight, I want it…',['So slow you get impatient','Lights on, eyes on each other','Done by me, while you keep your hands still']],
  ['Be honest: the thing I’m most curious to try with you is…',['Being blindfolded','A massage with oil and nowhere to be','Swapping who’s in charge']],
  ['If I had to lose control somewhere at home right now, I’d pick…',['Up against the bedroom door','On the kitchen counter','The sofa, lights off']],
  ['The confession that would undo me fastest…',['What you thought about me today','Something you want to try but never said','The exact moment tonight you started wanting me']],
  ['If I’m in charge, I’d make you…',['Wait with your hands behind your back','Kiss only where I point','Tell me what you want, in detail, before you get it']],
 ],
 5:[
  ['A night with no limits but ours: which fantasy would I actually say yes to?',['Strangers meeting at a hotel bar','A whole night with you in charge','No rules, no plan, pure instinct']],
  ['Blindfolded, the first thing I’d want to feel is…',['Your lips somewhere unexpected','Something cool, then something warm','Nothing at all. Just the waiting']],
  ['If I let it all out, my dirty-talk style would be…',['Sweet, but teasing','Bossy and direct','Barely a word, but always at the right moment']],
  ['In bed, the side of me you haven’t fully seen yet is…',['Bossier than you think','More patient at teasing than you think','A lot louder than you think']],
  ['If tonight were one long chase, I’d want to be…',['The one chasing, all night','The one being chased, and caught','Both, switching without warning']],
  ['If we tried light restraints, with a stop word agreed first, which role would I pick?',['I hold your wrists','You hold mine','Let’s talk it through first']],
 ],
};
const chemistry:Record<Heat,Array<[string,string]>>={
 1:[
  ['Kiss tag: land a kiss on each other’s cheek while dodging theirs.','Thirty seconds, both of you at once. Most cheek kisses landed wins.'],
  ['Staring contest, flirting allowed.','Eyes locked. Funny faces and sweet lines are fair game. Whoever laughs or looks away first kisses the winner’s hand.'],
  ['Recreate your first kiss, only better.','Same nerves, one take. Then you both vote on whether it beat the original.'],
  ['Back scratches until the other one sighs: thirty seconds each.','The one being scratched picks the spot and the pressure. Then swap.'],
 ],
 2:[
  ['Countdown kiss: lean in slowly and stop just before your lips touch.','Hold it for five seconds. Whoever closes the gap first loses, and then you kiss anyway.'],
  ['Pickup-line duel: three lines each, face to face.','Cheesiest, smoothest, boldest. The other person picks the winner of each round.'],
  ['Slow dance with no music: one of you hums the song.','Dance until the song ends. The hummer picks it; the dancer isn’t allowed to laugh.'],
  ['Kiss chase: one of you has thirty seconds to steal a kiss, the other dodges within arm’s reach.','Then swap. No running off, no grabbing. Keep it playful.'],
 ],
 3:[
  ['Share the slowest ten-second kiss you’ve ever had.','Count silently. If either of you speeds up, start the count again.'],
  ['Spell a secret word on each other’s back with one fingertip.','Over or under clothing, as you both prefer. Three guesses each, and the word should make the guesser blush.'],
  ['Sit face to face in one lap for the whole next round.','Stay there until the next card is done. Either of you can call it off.'],
  ['Kiss a slow line from ear to collarbone, then swap.','The one being kissed sets the pace with one word: “slower” or “stop”.'],
 ],
 4:[
  ['Take off one item of clothing from each other, slowly, without breaking eye contact.','Each of you chooses which of your own items comes off. Look away and you start that one again.'],
  ['Statue game: one of you stays perfectly still for a minute while the other teases with kisses above the waist.','The statue names any no-go zones first. Move, and you swap roles.'],
  ['Temptation test: thirty seconds to make the other one reach for you first. No tickling.','The one being tempted keeps their hands at their sides. Words, a look, a touch over clothing: all fair. Then swap. Whoever lasts longer chooses one kiss.'],
  ['Wandering massage: two minutes, and the receiver guides where the hands go.','The receiver sets limits first and steers by moving the giver’s hand. Stop means stop.'],
 ],
 5:[
  ['Hand your partner control for two minutes: one instruction at a time.','Agree on a stop word first. One instruction at a time, and any of them can be turned down.'],
  ['Blindfold round: one of you closes their eyes while the other leads three slow kisses.','Agree on where first. Use a scarf or just closed eyes. Swap if you both want.'],
  ['Whisper your boldest wish for tonight, then hear theirs.','Mouth to ear, both of you. The answer can be yes, later, or no, with no explanation needed.'],
  ['One reckless minute: make out like the lights are about to come on.','One full minute, right where you are. Either of you can pause it with a tap on the shoulder.'],
 ],
};
const desires:Record<Heat,string[]>={
 1:['Would you like a kiss tax: whoever walks through the door first pays one kiss?','Would you like a secret signal that means “come here and kiss me”?','Would you like a lazy Sunday where nobody gets dressed before noon?'],
 2:['Would you like an evening where one of us does the chasing and the other plays hard to get?','Would you like a flirting-only date where kissing is banned until the very end?','Would you like a jar of kiss coupons, redeemable any time, no questions asked?'],
 3:['Would you like a night where one of us is in charge from dinner to bedtime?','Would you like a candlelit massage night with oil and no phones?','Would you like a whole evening of teasing where nothing goes further until midnight?'],
 4:['Would you like to try a blindfold together sometime?','Would you like a hotel night just for us, with the do-not-disturb sign on the door?','Would you like to each write down one fantasy and swap them, just to read?'],
 5:['Would you like to try light restraints, with a stop word we choose together?','Would you like a night of role-play as two strangers who can’t keep their hands off each other?','Would you like a night where whoever says “switch” hands the lead to the other?'],
};
const missions:Record<Heat,string[]>={
 1:['Get a compliment from your partner without fishing for it.','Sneak three kisses onto your partner (cheek, hand or shoulder) before the game ends.','Make your partner blush with a compliment so specific they can’t brush it off.','Get your partner to hold your hand for a whole round.'],
 2:['Get your partner to call you by a pet name.','Wink at your partner and get a wink back.','Steal a kiss on the lips, then act like nothing happened for a full round.','Get your partner to play with your hair or touch your face.'],
 3:['Get your partner to kiss you first.','Give your partner goosebumps with nothing but a whisper.','Get your partner to tell you what they find sexiest about you.','Leave your partner speechless for three full seconds.'],
 4:['Make your partner bite their lip.','Get a kiss on your neck without asking for one.','Distract your partner so well they forget whose turn it is.','Start the next kiss before your partner sees it coming.'],
 5:['Get your partner to tell you one thing they want later tonight.','Make your partner lose their train of thought mid-sentence.','Get your partner to pull you onto their lap.','Get your partner to admit they can’t wait for this game to end.'],
};
// Optional and only if both say yes. The guesser who missed pays.
const forfeits:Record<Heat,string[]>={
 1:['Do your best impression of your partner trying to flirt.','Sing your partner one line of a love song, eyes locked.','Your partner names you something silly, and you answer to it for the rest of the game.','Confess the moment you first thought “uh-oh, I like this one”.'],
 2:['Win back your partner’s attention with your most dramatic apology.','Your partner picks where you sit for the next round.','Describe your partner’s best feature like a nature documentary narrator.','Text your partner the flirtiest line you can think of, right now, while they watch you type.'],
 3:['Kiss your partner wherever they point, from the shoulders up.','Confess the last time you daydreamed about them, and where you were.','Whisper what you’d do if you guess the next one right.','Earn your way back: thirty seconds of kisses on their hand, wrist and shoulder.'],
 4:['Take off one accessory or item of clothing, your choice.','Your partner gives you one playful order for the next round. You can veto it once.','Confess your most distracting thought about your partner tonight.','Hands behind your back: give your partner a thirty-second kiss without using them.'],
 5:['Wear a blindfold, or keep your eyes closed, for the next round.','Whisper the boldest thing you want to try with them. No explanations.','Offer two items of clothing; your partner picks which one comes off.','Hands off: your partner teases you for thirty seconds, and you can’t touch back.'],
};
// Four distinct effects; a session deals two of them. Ids are stable, so persisted sessions still resolve their twist cards.
const twists:Array<[string,string,string]>=[
 ['twist-01','Claws Out!','ROLE_REVERSAL'],
 ['twist-02','Double Trouble!','DOUBLE_CHALLENGE'],
 ['twist-04','The Mouse Bites Back!','COUNTER_MIND'],
 ['twist-05','Curiosity Pays!','ONE_MORE_QUESTION'],
];
const art={mind:['/images/ask-it-anyway.png','/images/no-hands.png'],chemistry:['/images/no-hands.png','/images/read-my-mind-cover.png'],desire:'/images/read-my-mind-cover.png',twist:'/images/roll-for-it.png',mission:'/images/ask-it-anyway.png'};

type Card={id:string;type:string;question:string;choices:string[];intensity:number;artworkPath:string;challenge:string|null;durationSeconds?:number|null};
type Translation={question:string;choices:string[];challenge:string|null};
/** Fails the seed if a translated list drifts out of position: a card must keep its id and every answer its index. */
function same<T>(label:string,en:readonly T[],other:readonly T[]|undefined){if(!other||other.length!==en.length)throw new Error(`Vietnamese ${label}: expected ${en.length} entries, found ${other?.length??0}`);return other}
const translations=new Map<string,Translation>();
function deck():Card[]{
 const cards:Card[]=[];const heats=[1,2,3,4,5] as Heat[];
 // Countdowns only where the instructions name a length (30s, 30s each, 5s, 10s, one or two minutes; the statue game is one
 // minute). The rest end on an event (a song, a guess, a round), so they stay untimed and are seeded with null.
 const chemistryDurations:Record<string,number>={'chem-h1-1':30,'chem-h1-4':60,'chem-h2-1':5,'chem-h2-4':60,'chem-h3-1':10,'chem-h4-2':60,'chem-h4-3':60,'chem-h4-4':120,'chem-h5-1':120,'chem-h5-4':60};
 for(const h of heats){
  same(`mind reader h${h}`,mindReader[h],vi.mindReader[h]).forEach(([question,choices],i)=>{same(`mind reader h${h}-${i+1} choices`,mindReader[h][i][1],choices);translations.set(`rmm-h${h}-${i+1}`,{question,choices,challenge:null})});
  same(`chemistry h${h}`,chemistry[h],vi.chemistry[h]).forEach(([question,challenge],i)=>translations.set(`chem-h${h}-${i+1}`,{question,choices:['Agree','Decline'],challenge}));
  same(`desires h${h}`,desires[h],vi.desires[h]).forEach((question,i)=>translations.set(`desire-h${h}-${i+1}`,{question,choices:['YES','MAYBE','NO'],challenge:null}));
  same(`missions h${h}`,missions[h],vi.missions[h]).forEach((question,i)=>translations.set(`mission-h${h}-${i+1}`,{question,choices:[],challenge:null}));
  same(`forfeits h${h}`,forfeits[h],vi.forfeits[h]).forEach((question,i)=>translations.set(`forfeit-h${h}-${i+1}`,{question,choices:[],challenge:null}));
  mindReader[h].forEach(([question,choices],i)=>cards.push({id:`rmm-h${h}-${i+1}`,type:'MIND_READER',question,choices,intensity:h,artworkPath:art.mind[i%2],challenge:null}));
  chemistry[h].forEach(([question,challenge],i)=>{const id=`chem-h${h}-${i+1}`;cards.push({id,type:'CHEMISTRY',question,choices:['Agree','Decline'],intensity:h,artworkPath:art.chemistry[i%2],challenge,durationSeconds:chemistryDurations[id]??null})});
  desires[h].forEach((question,i)=>cards.push({id:`desire-h${h}-${i+1}`,type:'MUTUAL_DESIRE',question,choices:['YES','MAYBE','NO'],intensity:h,artworkPath:art.desire,challenge:null}));
  missions[h].forEach((question,i)=>cards.push({id:`mission-h${h}-${i+1}`,type:'SECRET_MISSION',question,choices:[],intensity:h,artworkPath:art.mission,challenge:null}));
  forfeits[h].forEach((question,i)=>cards.push({id:`forfeit-h${h}-${i+1}`,type:'FORFEIT',question,choices:[],intensity:h,artworkPath:art.twist,challenge:null}));
 }
 for(const [id,question,effect] of twists){cards.push({id,type:'PLOT_TWIST',question,choices:[effect],intensity:1,artworkPath:art.twist,challenge:null});const t=vi.twists[id];if(!t)throw new Error(`Vietnamese twist ${id} missing`);translations.set(id,{question:t,choices:[effect],challenge:null})}
 return cards;
}
async function main(){
 for(const [id,title,tagline,description,duration,intensity,available] of games) await db.game.upsert({where:{id},update:{title,tagline,description,duration,intensity,available},create:{id,title,tagline,description,duration,intensity,available}});
 const cards=deck();
 for(const {id,...card} of cards)await db.gameCard.upsert({where:{id},update:{...card,enabled:true},create:{id,gameId:'read-my-mind',...card}});
 // Translations are keyed by (card id, locale), so re-running the seed updates them in place and never duplicates.
 for(const [gameId,t] of Object.entries(vi.games)){const title=games.find(g=>g[0]===gameId)![1];await db.gameTranslation.upsert({where:{gameId_locale:{gameId,locale:'vi'}},update:{title,...t},create:{gameId,locale:'vi',title,...t}})}
 for(const [cardId,t] of translations)await db.gameCardTranslation.upsert({where:{cardId_locale:{cardId,locale:'vi'}},update:t,create:{cardId,locale:'vi',...t}});
 // Retire earlier mild cards rather than deleting them, so persisted sessions can still resolve their card ids.
 const retired=await db.gameCard.updateMany({where:{gameId:'read-my-mind',id:{notIn:cards.map(c=>c.id)}},data:{enabled:false}});
 console.log(`Seeded ${cards.length} Read My Mind cards (${translations.size} Vietnamese translations); retired ${retired.count}.`);
}
main().finally(()=>db.$disconnect());
