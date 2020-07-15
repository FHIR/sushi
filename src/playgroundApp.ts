//#!/usr/bin/env node
import { FSHTank, RawFSH } from './import';
import { exportFHIR } from './export';
import { logger, Type } from './utils';
import { FHIRDefinitions } from './fhirdefs';
import { Configuration } from './fshtypes';
import {
  loadExternalDependenciesPlayground,
  fillTank,
  readConfigPlayground
} from './utils/Processing';

export async function playgroundApp(input: string) {
  // Hard Code config
  let config: Configuration;
  try {
    config = readConfigPlayground();
  } catch {
    console.log('uh oh, error with config');
  }

  // Load dependencies
  const defs = new FHIRDefinitions();
  const version = 1;
  await loadExternalDependenciesPlayground(defs, version);

  // Load and fill FSH Tank
  let tank: FSHTank;
  try {
    const rawFSH = [new RawFSH(input)];
    tank = fillTank(rawFSH, config);
  } catch (e) {
    console.log(e);
  }

  //Check for StructureDefinition
  const structDef = defs.fishForFHIR('StructureDefinition', Type.Resource);
  if (structDef?.version !== '4.0.1') {
    logger.error(
      'StructureDefinition resource not found for v4.0.1. The FHIR R4 package in local cache' +
        ' may be corrupt. Local FHIR cache can be found at <home-directory>/.fhir/packages.' +
        ' For more information, see https://wiki.hl7.org/FHIR_Package_Cache#Location.'
    );
  }

  const outPackage = exportFHIR(tank, defs);
  return outPackage;
  //TODO - Write/output this JSON outPackage
  // writeFHIRResources(outDir, outPackage, program.snapshot);
}

// function printResults(pkg: Package, isIG: boolean) {
//   // NOTE: These variables are creatively names to align well in the strings below while keeping prettier happy
//   const prNum = pad(pkg.profiles.length.toString(), 8);
//   const extnNum = pad(pkg.extensions.length.toString(), 10);
//   const vstNum = pad(pkg.valueSets.length.toString(), 9);
//   const cdsysNum = pad(pkg.codeSystems.length.toString(), 11);
//   const insNum = pad(pkg.instances.length.toString(), 9);
//   const errorNumMsg = pad(`${stats.numError} Error${stats.numError !== 1 ? 's' : ''}`, 13);
//   const wrNumMsg = padStart(`${stats.numWarn} Warning${stats.numWarn !== 1 ? 's' : ''}`, 12);
//   let resultStatus: ResultStatus;
//   if (stats.numError === 0 && stats.numWarn === 0) {
//     resultStatus = 'clean';
//   } else if (stats.numError > 0) {
//     resultStatus = 'errors';
//   } else {
//     resultStatus = 'warnings';
//   }
//   const aWittyMessageInvolvingABadFishPun = padEnd(sample(MESSAGE_MAP[resultStatus]), 36);
//   const clr = COLOR_MAP[resultStatus];

//   // NOTE: Doing some funky things w/ strings on some lines to keep overall alignment in the code
//   const results = [
//     clr('╔' + '════════════════════════ SUSHI RESULTS ══════════════════════════' + '' + '╗'),
//     clr('║') + ' ╭──────────┬────────────┬───────────┬─────────────┬───────────╮ ' + clr('║'),
//     clr('║') + ' │ Profiles │ Extensions │ ValueSets │ CodeSystems │ Instances │ ' + clr('║'),
//     clr('║') + ' ├──────────┼────────────┼───────────┼─────────────┼───────────┤ ' + clr('║'),
//     clr('║') + ` │ ${prNum} │ ${extnNum} │ ${vstNum} │ ${cdsysNum} │ ${insNum} │ ` + clr('║'),
//     clr('║') + ' ╰──────────┴────────────┴───────────┴─────────────┴───────────╯ ' + clr('║'),
//     clr('║' + '                                                                 ' + '' + '║'),
//     clr('║') + ' See SUSHI-GENERATED-FILES.md for details on generated IG files. ' + clr('║'),
//     clr('╠' + '═════════════════════════════════════════════════════════════════' + '' + '╣'),
//     clr('║') + ` ${aWittyMessageInvolvingABadFishPun} ${errorNumMsg} ${wrNumMsg} ` + clr('║'),
//     clr('╚' + '═════════════════════════════════════════════════════════════════' + '' + '╝')
//   ];
//   if (!isIG) {
//     results.splice(7, 1);
//   }
//   results.forEach(r => console.log(r));
// }

// type ResultStatus = 'clean' | 'warnings' | 'errors';

// const MESSAGE_MAP: { [key in ResultStatus]: string[] } = {
//   clean: [
//     'That went swimmingly!',
//     'O-fish-ally error free!',
//     "Nice! You're totally krilling it!",
//     'Cool and So-fish-ticated!',
//     'Well hooked and landed!',
//     'You earned a PhD in Ichthyology!',
//     'You rock, lobster!',
//     'Everything is ship-shape!',
//     'Ex-clam-ation point!',
//     'Ac-clam-ations!',
//     'Fin-tastic job!'
//   ],
//   warnings: [
//     'Not bad, but you cod do batter!',
//     'Something smells fishy...',
//     'Warnings... Water those about?',
//     'Looks like you are casting about.',
//     'A bit pitchy, but tuna-ble.'
//   ],
//   errors: [
//     'Ick! Errors!',
//     'Some-fin went wrong...',
//     'Unfor-tuna-tely, there are errors.',
//     'That really smelt.',
//     'You spawned some errors.',
//     'Just keep swimming, Dory.',
//     'This is the one that got away.',
//     'The docs might be bene-fish-al.',
//     'This was a turtle disaster.',
//     'Something went eely wrong there.'
//   ]
// };

// const COLOR_MAP: { [key in ResultStatus]: chalk.Chalk } = {
//   clean: chalk.green,
//   warnings: chalk.rgb(179, 98, 0),
//   errors: chalk.red
// };

export default playgroundApp;
