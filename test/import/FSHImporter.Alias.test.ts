import { importText, RawFSH } from '../../src/import';
import { AssignmentRule, BindingRule } from '../../src/fshtypes/rules';
import { FshCode } from '../../src/fshtypes';
import { importSingleText } from '../testhelpers/importSingleText';
import { loggerSpy } from '../testhelpers';
import { leftAlign } from '../utils/leftAlign';

// Aliases are tested as part of the other entity tests where aliases are allowed
// but these tests ensure that aliases work generally and can be in any order

describe('FSHImporter', () => {
  beforeEach(() => loggerSpy.reset());

  describe('Alias', () => {
    it('should collect and return aliases in result', () => {
      const input = leftAlign(`
      Alias: LOINC = http://loinc.org
      Alias: SCT = http://snomed.info/sct

      Profile: ObservationProfile
      Parent: Observation

      Alias: RXNORM = http://www.nlm.nih.gov/research/umls/rxnorm

      Profile: AnotherObservationProfile
      Parent: Observation

      Alias: UCUM = http://unitsofmeasure.org
      `);

      const result = importSingleText(input);
      expect(result.aliases.size).toBe(4);
      expect(result.aliases.get('LOINC')).toBe('http://loinc.org');
      expect(result.aliases.get('SCT')).toBe('http://snomed.info/sct');
      expect(result.aliases.get('RXNORM')).toBe('http://www.nlm.nih.gov/research/umls/rxnorm');
      expect(result.aliases.get('UCUM')).toBe('http://unitsofmeasure.org');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should parse aliases that replicate the syntax of a code', () => {
      const input = leftAlign(`
      Alias: LOINC = http://loinc.org#1234
      `);

      const result = importSingleText(input);
      expect(result.aliases.size).toBe(1);
      expect(result.aliases.get('LOINC')).toBe('http://loinc.org#1234');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should report when the same alias is defined twice w/ different values in the same file', () => {
      const input = leftAlign(`
      Alias: USCoreRace = http://hl7.org/fhir/us/core/ValueSet/omb-race-category
      Alias: USCoreRace = http://hl7.org/fhir/us/core/StructureDefinition/us-core-race
      `);

      const result = importSingleText(input);
      expect(result.aliases.size).toBe(1);
      expect(result.aliases.get('USCoreRace')).toBe(
        'http://hl7.org/fhir/us/core/ValueSet/omb-race-category'
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Alias USCoreRace cannot be redefined to http:\/\/hl7.org\/fhir\/us\/core\/StructureDefinition\/us-core-race; it is already defined as http:\/\/hl7.org\/fhir\/us\/core\/ValueSet\/omb-race-category\..*Line: 3\D*/s
      );
    });

    it('should report when the same alias is defined twice w/ different values in different files', () => {
      const input = leftAlign(`
      Alias: USCoreRace = http://hl7.org/fhir/us/core/ValueSet/omb-race-category
      `);
      const input2 = leftAlign(`
      Alias: USCoreRace = http://hl7.org/fhir/us/core/StructureDefinition/us-core-race
      `);

      const results = importText([
        new RawFSH(input, 'Alias1.fsh'),
        new RawFSH(input2, 'Alias2.fsh')
      ]);
      expect(results).toHaveLength(2);
      expect(results[0].aliases.size).toBe(1);
      expect(results[0].aliases.get('USCoreRace')).toBe(
        'http://hl7.org/fhir/us/core/ValueSet/omb-race-category'
      );
      expect(results[1].aliases.size).toBe(0);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(
        /Alias USCoreRace cannot be redefined to http:\/\/hl7.org\/fhir\/us\/core\/StructureDefinition\/us-core-race; it is already defined as http:\/\/hl7.org\/fhir\/us\/core\/ValueSet\/omb-race-category\..*File: Alias2\.fsh.*Line: 2\D*/s
      );
    });

    it('should not report an error when the same alias is defined multiple times w/ the same values', () => {
      const input = leftAlign(`
      Alias: USCoreRace = http://hl7.org/fhir/us/core/StructureDefinition/us-core-race
      Alias: USCoreRace = http://hl7.org/fhir/us/core/StructureDefinition/us-core-race
      `);
      const input2 = leftAlign(`
      Alias: USCoreRace = http://hl7.org/fhir/us/core/StructureDefinition/us-core-race
      `);

      const results = importText([
        new RawFSH(input, 'Alias1.fsh'),
        new RawFSH(input2, 'Alias2.fsh')
      ]);
      expect(results).toHaveLength(2);
      expect(results[0].aliases.size).toBe(1);
      expect(results[0].aliases.get('USCoreRace')).toBe(
        'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
      );
      expect(results[1].aliases.size).toBe(1);
      expect(results[1].aliases.get('USCoreRace')).toBe(
        'http://hl7.org/fhir/us/core/StructureDefinition/us-core-race'
      );
      expect(loggerSpy.getAllLogs('error').length).toBe(0);
    });

    it('should translate an alias when the alias is defined before its use', () => {
      const input = leftAlign(`
      Alias: LOINC = http://loinc.org

      Profile: ObservationProfile
      Parent: Observation
      * code from LOINC
      `);

      const result = importSingleText(input);
      const rule = result.profiles.get('ObservationProfile').rules[0] as BindingRule;
      expect(rule.valueSet).toBe('http://loinc.org');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should translate an alias when the alias is defined after its use', () => {
      const input = leftAlign(`
      Profile: ObservationProfile
      Parent: Observation
      * code from LOINC

      Alias: LOINC = http://loinc.org
      `);

      const result = importSingleText(input);
      const rule = result.profiles.get('ObservationProfile').rules[0] as BindingRule;
      expect(rule.valueSet).toBe('http://loinc.org');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should not translate an alias when the alias does not match', () => {
      const input = leftAlign(`
      Alias: LOINC = http://loinc.org

      Profile: ObservationProfile
      Parent: Observation
      * code from LAINC
      `);

      const result = importSingleText(input);
      const rule = result.profiles.get('ObservationProfile').rules[0] as BindingRule;
      expect(rule.valueSet).toBe('LAINC');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should translate an alias from any input file', () => {
      const input = leftAlign(`
      Profile: ObservationProfile
      Parent: Observation
      * code from LOINC
      `);
      const input2 = leftAlign(`
      Alias: LOINC = http://loinc.org
      `);

      const results = importText([new RawFSH(input), new RawFSH(input2)]);
      expect(results.length).toBe(2);
      const rule = results[0].profiles.get('ObservationProfile').rules[0] as BindingRule;
      expect(rule.valueSet).toBe('http://loinc.org');
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log an error when an aliased code prefixed with $ does not resolve', () => {
      const input = leftAlign(`
      Alias: $LOINC = http://loinc.org

      Profile: ObservationProfile
      Parent: Observation
      * code = $LOINCZ#foo
      `);

      const results = importText([new RawFSH(input, 'Loinc.fsh')]);
      expect(results.length).toBe(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/\$LOINCZ.*\$/);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Loinc.fsh.*Line: 6\D*/s);
    });

    it('should log an error when an aliased value set rule prefixed with $ does not resolve', () => {
      const input = leftAlign(`
      Alias: $LOINC = http://loinc.org

      Profile: ObservationProfile
      Parent: Observation
      * code from $LOINCZ
      `);

      const results = importText([new RawFSH(input, 'Loinc.fsh')]);
      expect(results.length).toBe(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/\$LOINCZ.*\$/);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Loinc.fsh.*Line: 6\D*/s);
    });

    it('should log an error when an aliased reference prefixed with $ does not resolve', () => {
      const input = leftAlign(`
      Alias: $MYPATIENT = http://hl7.org/fhir/StructureDefinition/mypatient.html

      Profile: ObservationProfile
      Parent: Observation
      * subject only Reference($MYPATIENTZ)
      `);

      const results = importText([new RawFSH(input, 'MyPatient.fsh')]);
      expect(results.length).toBe(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/\$MYPATIENT.*\$/);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: MyPatient.fsh.*Line: 6\D*/s);
    });

    it('should log an error when an assignment rule aliased reference prefixed with $ does not resolve', () => {
      const input = leftAlign(`
      Alias: $MYPATIENT = http://hl7.org/fhir/StructureDefinition/mypatient.html

      Profile: ObservationProfile
      Parent: Observation
      * subject = Reference($MYPATIENTZ)
      `);

      const results = importText([new RawFSH(input, 'MyPatient.fsh')]);
      expect(results.length).toBe(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/\$MYPATIENTZ.*\$/);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: MyPatient.fsh.*Line: 6\D*/s);
    });

    it('should log an error when an only rule aliased reference prefixed with $ does not resolve', () => {
      const input = leftAlign(`
      Alias: $MYPATIENT = http://hl7.org/fhir/StructureDefinition/mypatient.html

      Profile: ObservationProfile
      Parent: Observation
      * subject only Reference($MYPATIENTZ)
      `);

      const results = importText([new RawFSH(input, 'MyPatient.fsh')]);
      expect(results.length).toBe(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/\$MYPATIENTZ.*\$/);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: MyPatient.fsh.*Line: 6\D*/s);
    });

    it('should not log an error when a contains rule aliased extension prefixed with $ does not resolve', () => {
      loggerSpy.reset();
      const input = leftAlign(`
      Alias: $MYEXTENSION = http://hl7.org/fhir/StructureDefinition/mypatient-extension.html

      Profile: ObservationProfile
      Parent: Observation
      * extension contains $TYPO 1..1
      `);

      const results = importText([new RawFSH(input, 'MyExtension.fsh')]);
      expect(results.length).toBe(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log an error when an aliased contains rule type prefixed with $ does not resolve', () => {
      const input = leftAlign(`
      Alias: $EXT = http://fhir.org/extension

      Profile: MyObservation
      Parent: Observation
      * extension contains $EXTZ named ext 1..1
      `);

      const results = importText([new RawFSH(input, 'Ext.fsh')]);
      expect(results.length).toBe(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/\$EXTZ.*\$/);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Ext.fsh.*Line: 6\D*/s);
    });

    it('should log an error when an aliased value set system prefixed with $ does not resolve', () => {
      const input = leftAlign(`
      Alias: $LOINC = http://loinc.org

      ValueSet: MySet
      * codes from system $LOINCZ
      `);

      const results = importText([new RawFSH(input, 'Loinc.fsh')]);
      expect(results.length).toBe(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/\$LOINCZ.*\$/);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Loinc.fsh.*Line: 5\D*/s);
    });

    it('should log an error when an aliased value set prefixed with $ does not resolve', () => {
      const input = leftAlign(`
      Alias: $LOINC = http://loinc.org

      ValueSet: MySet
      * codes from valueset $LOINCZ
      `);

      const results = importText([new RawFSH(input, 'Loinc.fsh')]);
      expect(results.length).toBe(1);
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/\$LOINCZ.*\$/);
      expect(loggerSpy.getLastMessage('error')).toMatch(/File: Loinc.fsh.*Line: 5\D*/s);
    });

    it('should resolve an alias while accounting for a version', () => {
      const input = leftAlign(`
      Alias: LOINC = http://loinc.org

      Profile: ObservationProfile
      Parent: Observation
      * code = LOINC|123#foo
      `);

      const results = importText([new RawFSH(input, 'Loinc.fsh')]);
      expect(results.length).toBe(1);
      const rule = results[0].profiles.get('ObservationProfile').rules[0] as AssignmentRule;
      expect(rule.value).toEqual(
        new FshCode('foo', 'http://loinc.org|123')
          .withFile('Loinc.fsh')
          .withLocation([6, 10, 6, 22])
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should resolve an alias while ignoring an empty version', () => {
      const input = leftAlign(`
      Alias: LOINC = http://loinc.org

      Profile: ObservationProfile
      Parent: Observation
      * code = LOINC|#foo
      `);

      const results = importText([new RawFSH(input, 'Loinc.fsh')]);
      expect(results.length).toBe(1);
      const rule = results[0].profiles.get('ObservationProfile').rules[0] as AssignmentRule;
      expect(rule.value).toEqual(
        new FshCode('foo', 'http://loinc.org').withFile('Loinc.fsh').withLocation([6, 10, 6, 19])
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should log an error when an alias contains reserved characters', () => {
      const input = leftAlign(`
      Alias: BAD|LOINC = http://loinc.org

      Profile: ObservationProfile
      Parent: Observation
      * code = BAD|LOINC#foo
      `);

      const results = importText([new RawFSH(input, 'Loinc.fsh')]);
      expect(results.length).toBe(1);
      const rule = results[0].profiles.get('ObservationProfile').rules[0] as AssignmentRule;
      // The BAD|LOINC alias does not resolve, since it is not created
      expect(rule.value).toEqual(
        new FshCode('foo', 'BAD|LOINC').withFile('Loinc.fsh').withLocation([6, 10, 6, 22])
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('error')).toMatch(/BAD\|LOINC cannot include "\|"/);
    });

    it('should resolve an alias with all supported characters', () => {
      // The only supported characters in Aliases are ASCII letters, numbers, _, -, .
      const input = leftAlign(`
      Alias: Foo_McBar-Baz_Jr.3 = http://example.org

      Profile: ObservationProfile
      Parent: Observation
      * code = Foo_McBar-Baz_Jr.3#foo
      `);

      const results = importText([new RawFSH(input, 'Alias.fsh')]);
      expect(results.length).toBe(1);
      const rule = results[0].profiles.get('ObservationProfile').rules[0] as AssignmentRule;
      expect(rule.value).toEqual(
        new FshCode('foo', 'http://example.org').withFile('Alias.fsh').withLocation([6, 10, 6, 31])
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
    });

    it('should resolve but log a warning when an alias contains unsupported characters', () => {
      // The only supported characters in Aliases are ASCII letters, numbers, _, -, .
      const input = leftAlign(`
      Alias: B@dAlias = http://example.org

      Profile: ObservationProfile
      Parent: Observation
      * code = B@dAlias#foo
      `);

      const results = importText([new RawFSH(input, 'Alias.fsh')]);
      expect(results.length).toBe(1);
      const rule = results[0].profiles.get('ObservationProfile').rules[0] as AssignmentRule;
      // The B@dAlias alias does still resolve because only a warning is logged
      expect(rule.value).toEqual(
        new FshCode('foo', 'http://example.org').withFile('Alias.fsh').withLocation([6, 10, 6, 21])
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(/B@dAlias includes unsupported characters/);
    });

    it('should resolve but log a warning when an alias contains unsupported characters and starts with $', () => {
      // The only supported characters in Aliases are ASCII letters, numbers, _, -, .
      const input = leftAlign(`
      Alias: $N*tAll*wed = http://example.org

      Profile: ObservationProfile
      Parent: Observation
      * code = $N*tAll*wed#foo
      `);

      const results = importText([new RawFSH(input, 'Alias.fsh')]);
      expect(results.length).toBe(1);
      const rule = results[0].profiles.get('ObservationProfile').rules[0] as AssignmentRule;
      // The $N*tAll*wed alias does still resolve because only a warning is logged
      expect(rule.value).toEqual(
        new FshCode('foo', 'http://example.org').withFile('Alias.fsh').withLocation([6, 10, 6, 24])
      );
      expect(loggerSpy.getAllMessages('error')).toHaveLength(0);
      expect(loggerSpy.getAllMessages('warn')).toHaveLength(1);
      expect(loggerSpy.getLastMessage('warn')).toMatch(
        /\$N\*tAll\*wed includes unsupported characters/
      );
    });
  });
});
