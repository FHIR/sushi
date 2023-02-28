import { sample } from 'lodash';

const CLEAN_RUN_PUNS = [
  'That went swimmingly!',
  'O-fish-ally error free!',
  'Cool and So-fish-ticated!',
  'Well hooked and landed!',
  'You earned a PhD in Ichthyology!',
  'You rock, lobster!',
  'Everything is ship-shape!',
  'Ex-clam-ation point!',
  'Ac-clam-ations!',
  'Fin-tastic job!',
  'You are dolphinitely doing great!',
  "It doesn't get any betta than this!",
  "You're piranha roll now!",
  'Valedictorian of the School of FSH!',
  'FSHing for compliments? Super job!',
  'Tank you very much!',
  'Why pun? Just for for the halibut.',
  "You've proven any-fin is possible.",
  'You swim with the sharks!',
  "You've found your sea legs.",
  'You really made a splash!',
  "You've earned a seal of approval.",
  "You're swimming in success!",
  "You're making waves now!",
  "You've turned the tide.",
  "You're catching on now!",
  "You're in the swim of things now!",
  "Catch of the day, right here!",
  "That was a big fish to fry!",
  "Nice job! Are you hooked yet?",
  "You've found your sea legs!",
  "That was a sea breeze!",
  "A whale of a job!",
  "Just like a perfect pearl.",
  "You're sailing along smoothly.",
  "Swish! Nothing but net."
];

const WARNING_PUNS = [
  'Not bad, but you cod do batter!',
  'Something smells fishy...',
  'Warnings... Water those about?',
  'Looks like you are casting about.',
  'A bit pitchy, but tuna-ble.',
  'Do you sea the problem?',
  'You are skating on fin ice.',
  'You should mullet over.',
  'You might need some Vitamin Sea',
  'Maybe you should scale back',
  'Whale, whale, what happened here?',
  'Did you do this on porpoise?',
  'Let minnow if you need some help',
  "You're kraken me up.",
  "Don't be koi about asking for help.",
  "You seem a bit rudderless.",
  'Keep swimming, Dory.',
  "You should gut it out.",
  "Don't get stuck in the doldrums.",
  "Are you in a no-wind situation?",
  "Sailors, take warning!",
  "You seem to be casting about.",
  "This looks a bit fishy."
];

const ERROR_PUNS = [
  'Ick! Errors!',
  'Some-fin went wrong...',
  'Unfor-tuna-tely, there are errors.',
  'That really smelt.',
  "You've spawned some errors.",
  'This is the one that got away.',
  'The docs might be bene-fish-al.',
  'This was a turtle disaster.',
  'Something went eely wrong there.',
  'Documentation may be kelp-ful.',
  'You should do some sole searching.',
  'Call a FSH sturgeon!',
  'This is giving me a haddock.',
  'You whaley need to turn this around.',
  'You are battering FSH',
  'Swim back to School of FSH',
  'You need to mullet over',
  "You're krilling me!",
  "You're fluking it up!",
  "You're drowning here.",
  "That was 'crab-tastic'.",
  "Looks like you're floundering",
  "Don't clam up, ask for help.",
  "Are you lost at sea?",
  "That was a shipwreck!",
  "You are off course, sailor!",
  "You're sailing rough seas.",
  "Don't be shell-shocked.",
  "You're up to urchin in mistakes.",
  "Is that squall you got?",
  "You're in deep water now.",
  "Don't carp about your mistakes.",
  "This run went belly up"
];

export function getRandomPun(numErrors = 0, numWarnings = 0): string {
  const puns = numErrors > 0 ? ERROR_PUNS : numWarnings > 0 ? WARNING_PUNS : CLEAN_RUN_PUNS;
  return sample(puns);
}

export function getPuns(
  includeErrors = true,
  includeWarnings = true,
  includeClean = true
): string[] {
  const puns: string[] = [];
  if (includeErrors) {
    puns.push(...ERROR_PUNS);
  }
  if (includeWarnings) {
    puns.push(...WARNING_PUNS);
  }
  if (includeClean) {
    puns.push(...CLEAN_RUN_PUNS);
  }
  return puns;
}
