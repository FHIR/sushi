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
  'Valedictorian of the School of FSH',
  "If you're FSHing for compliments, you got it!",
  'Tank you for the great job',
  "We don't have to print these puns, but we do it for the halibut",
  "You've proven any-fin is possible"
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
  'Whale, whale, whale, what happened here?',
  'Did you do this on porpoise?'
];

const ERROR_PUNS = [
  'Ick! Errors!',
  'Some-fin went wrong...',
  'Unfor-tuna-tely, there are errors.',
  'That really smelt.',
  'You spawned some errors.',
  'Just keep swimming, Dory.',
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
  "Looks like you're floundering",
  'Let minnow if you need help',
  "Don't be koi about asking for help"
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
