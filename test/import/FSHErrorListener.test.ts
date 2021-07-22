import { loggerSpy } from '../testhelpers/loggerSpy';
import { importSingleText } from '../testhelpers/importSingleText';

describe('FSHErrorListener', () => {
  beforeEach(() => loggerSpy.reset());

  it('should not log any errors for valid FSH', () => {
    /*
    Profile: MyPatient
    Parent: Patient
    * active = true
    */
    const input = 'Profile: MyPatient\nParent: Patient\n* active = true';
    importSingleText(input, 'MyPatient.fsh');
    expect(loggerSpy.getAllMessages('error')).toBeEmpty();
  });

  it('should report mismatched input errors from antlr', () => {
    const input = `
    Profile: MismatchedPizza
    Pizza: Large
    `;
    importSingleText(input, 'Pizza.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Pizza\.fsh.*Line: 3\D*/s);
  });

  it('should report extraneous input errors from antlr', () => {
    const input = `
    Profile: Something Spaced
    Parent: Spacious
    `;
    importSingleText(input, 'Space.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(/File: Space\.fsh.*Line: 2\D*/s);
  });

  // ########################################################################
  // # Missing space around =                                               #
  // ########################################################################

  it('should make sense of errors due to no space before = in an Alias definition', () => {
    const input = `
    Alias: $OrgType= http://terminology.hl7.org/CodeSystem/organization-type
    `;
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Alias declarations must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 2\D*/s
    );
  });

  it('should make sense of errors due to no space after = in an Alias definition', () => {
    const input = `
    Alias: $OrgType =http://terminology.hl7.org/CodeSystem/organization-type
    `;
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Alias declarations must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 2\D*/s
    );
  });

  it('should make sense of errors due to no space around = in an Alias definition', () => {
    const input = `
    Alias: $OrgType=http://terminology.hl7.org/CodeSystem/organization-type
    `;
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Alias declarations must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 2\D*/s
    );
  });

  it('should make sense of errors due to no space before = in an assignment rule', () => {
    /*
    Profile: SampleObservation
    Parent: Observation
    * component= FOO#bar
    */
    const input = '\nProfile: SampleObservation\nParent: Observation\n* component= FOO#bar';
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Assignment rules must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 4\D*/s
    );

    // Test with a multi-word string as well since sometimes that results in a different error
    loggerSpy.reset();
    /*
    Profile: SampleObservation
    Parent: Observation
    * valueString= "My Value"
    */
    const input2 = '\nProfile: SampleObservation\nParent: Observation\n* valueString= "My Value"';
    importSingleText(input2, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Assignment rules must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 4\D*/s
    );
  });

  it('should make sense of errors due to no space after = in an assignment rule', () => {
    /*
     Profile: SampleObservation
    Parent: Observation
    * component =FOO#bar
    */
    const input = '\nProfile: SampleObservation\nParent: Observation\n* component =FOO#bar';
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Assignment rules must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 4\D*/s
    );

    // Test with a multi-word string as well since sometimes that results in a different error
    loggerSpy.reset();
    /*
    Profile: SampleObservation
    Parent: Observation
    * valueString ="My Value"
    */
    const input2 = '\nProfile: SampleObservation\nParent: Observation\n* valueString ="My Value"';
    importSingleText(input2, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Assignment rules must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 4\D*/s
    );
  });

  it('should make sense of errors due to no space around = in an assignment rule', () => {
    /*
    Profile: SampleObservation
    Parent: Observation
    * component=FOO#bar
    */
    const input = '\nProfile: SampleObservation\nParent: Observation\n* component=FOO#bar';
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Assignment rules must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 4\D*/s
    );

    // Test with a multi-word string as well since sometimes that results in a different error
    loggerSpy.reset();
    /*
    Profile: SampleObservation
    Parent: Observation
    * valueString="My Value"
    */
    const input2 = '\nProfile: SampleObservation\nParent: Observation\n* valueString="My Value"';
    importSingleText(input2, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Assignment rules must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 4\D*/s
    );
  });

  it('should make sense of errors due to no space before = in a caret rule', () => {
    /*
    Profile: SampleObservation
    Parent: Observation
    * component ^short= "Component1"
    */
    const input =
      '\nProfile: SampleObservation\nParent: Observation\n* component ^short= "Component1"';
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Assignment rules must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 4\D*/s
    );

    // Test with a multi-word string as well since sometimes that results in a different error
    loggerSpy.reset();
    /*
    Profile: SampleObservation
    Parent: Observation
    * component ^short= "A component"
    */
    const input2 =
      '\nProfile: SampleObservation\nParent: Observation\n* component ^short= "A component"';
    importSingleText(input2, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Assignment rules must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 4\D*/s
    );
  });

  it('should make sense of errors due to no space after = in a caret rule', () => {
    /*
    Profile: SampleObservation
    Parent: Observation
    * component ^short ="Component1"
    */
    const input =
      '\nProfile: SampleObservation\nParent: Observation\n* component ^short ="Component1"';
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Assignment rules must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 4\D*/s
    );

    // Test with a multi-word string as well since sometimes that results in a different error
    loggerSpy.reset();
    /*
    Profile: SampleObservation
    Parent: Observation
    * component ^short ="A component"
    */
    const input2 =
      '\nProfile: SampleObservation\nParent: Observation\n* component ^short ="A component"';
    importSingleText(input2, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Assignment rules must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 4\D*/s
    );
  });

  it('should make sense of errors due to no space around = in a caret rule', () => {
    /*
    Profile: SampleObservation
    Parent: Observation
    * component ^short="Component1"
    */
    const input =
      '\nProfile: SampleObservation\nParent: Observation\n* component ^short="Component1"';
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Assignment rules must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 4\D*/s
    );

    // Test with a multi-word string as well since sometimes that results in a different error
    loggerSpy.reset();
    /*
    Profile: SampleObservation
    Parent: Observation
    * component ^short="A component"
    */
    const input2 =
      '\nProfile: SampleObservation\nParent: Observation\n* component ^short="A component"';
    importSingleText(input2, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Assignment rules must include at least one space both before and after the '=' sign.*File: Invalid\.fsh.*Line: 4\D*/s
    );
  });

  // ########################################################################
  // # Missing spaces around ->                                             #
  // ########################################################################

  it('should make sense of errors due to no space after -> in a mapping rule', () => {
    /*
    Mapping:  USCorePatientToArgonaut
    Source:   USCorePatient
    Target:   "http://unknown.org/Argonaut-DQ-DSTU2"
    Title:    "Argonaut DSTU2"
    Id:       argonaut-dq-dstu2
    * identifier ->"Patient.identifier"
    */
    const input =
      '\nMapping:  USCorePatientToArgonaut\nSource:   USCorePatient\nTarget:   "http://unknown.org/Argonaut-DQ-DSTU2"\nTitle:    "Argonaut DSTU2"\nId:       argonaut-dq-dstu2\n* identifier ->"Patient.identifier"';
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Mapping rules must include at least one space both before and after the '->' operator.*File: Invalid\.fsh.*Line: 7\D*/s
    );

    // Test with a multi-word string as well since sometimes that results in a different error
    loggerSpy.reset();
    /*
    Mapping:  USCorePatientToArgonaut
    Source:   USCorePatient
    Target:   "http://unknown.org/Argonaut-DQ-DSTU2"
    Title:    "Argonaut DSTU2"
    Id:       argonaut-dq-dstu2
    * identifier ->"Patient identifier"
    */
    const input2 =
      '\nMapping:  USCorePatientToArgonaut\nSource:   USCorePatient\nTarget:   "http://unknown.org/Argonaut-DQ-DSTU2"\nTitle:    "Argonaut DSTU2"\nId:       argonaut-dq-dstu2\n* identifier ->"Patient identifier"';
    importSingleText(input2, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Mapping rules must include at least one space both before and after the '->' operator.*File: Invalid\.fsh.*Line: 7\D*/s
    );
  });

  it('should make sense of errors due to no space before -> in a mapping rule', () => {
    /*
    Mapping:  USCorePatientToArgonaut
    Source:   USCorePatient
    Target:   "http://unknown.org/Argonaut-DQ-DSTU2"
    Title:    "Argonaut DSTU2"
    Id:       argonaut-dq-dstu2
    * identifier-> "Patient.identifier"
    */
    const input =
      '\nMapping:  USCorePatientToArgonaut\nSource:   USCorePatient\nTarget:   "http://unknown.org/Argonaut-DQ-DSTU2"\nTitle:    "Argonaut DSTU2"\nId:       argonaut-dq-dstu2\n* identifier-> "Patient.identifier"';
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Mapping rules must include at least one space both before and after the '->' operator.*File: Invalid\.fsh.*Line: 7\D*/s
    );

    // Test with a multi-word string as well since sometimes that results in a different error
    loggerSpy.reset();
    /*
    Mapping:  USCorePatientToArgonaut
    Source:   USCorePatient
    Target:   "http://unknown.org/Argonaut-DQ-DSTU2"
    Title:    "Argonaut DSTU2"
    Id:       argonaut-dq-dstu2
    * identifier-> "Patient identifier"
    */
    const input2 =
      '\nMapping:  USCorePatientToArgonaut\nSource:   USCorePatient\nTarget:   "http://unknown.org/Argonaut-DQ-DSTU2"\nTitle:    "Argonaut DSTU2"\nId:       argonaut-dq-dstu2\n* identifier-> "Patient identifier"';
    importSingleText(input2, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Mapping rules must include at least one space both before and after the '->' operator.*File: Invalid\.fsh.*Line: 7\D*/s
    );
  });

  it('should make sense of errors due to no space around -> in a mapping rule', () => {
    /*
    Mapping:  USCorePatientToArgonaut
    Source:   USCorePatient
    Target:   "http://unknown.org/Argonaut-DQ-DSTU2"
    Title:    "Argonaut DSTU2"
    Id:       argonaut-dq-dstu2
    * identifier->"Patient.identifier"
    */
    const input =
      '\nMapping:  USCorePatientToArgonaut\nSource:   USCorePatient\nTarget:   "http://unknown.org/Argonaut-DQ-DSTU2"\nTitle:    "Argonaut DSTU2"\nId:       argonaut-dq-dstu2\n* identifier->"Patient.identifier"';
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Mapping rules must include at least one space both before and after the '->' operator.*File: Invalid\.fsh.*Line: 7\D*/s
    );

    // Test with a multi-word string as well since sometimes that results in a different error
    loggerSpy.reset();
    /*
    Mapping:  USCorePatientToArgonaut
    Source:   USCorePatient
    Target:   "http://unknown.org/Argonaut-DQ-DSTU2"
    Title:    "Argonaut DSTU2"
    Id:       argonaut-dq-dstu2
    * identifier->"Patient identifier"
    */
    const input2 =
      '\nMapping:  USCorePatientToArgonaut\nSource:   USCorePatient\nTarget:   "http://unknown.org/Argonaut-DQ-DSTU2"\nTitle:    "Argonaut DSTU2"\nId:       argonaut-dq-dstu2\n* identifier->"Patient identifier"';
    importSingleText(input2, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Mapping rules must include at least one space both before and after the '->' operator.*File: Invalid\.fsh.*Line: 7\D*/s
    );
  });

  // ########################################################################
  // # Missing space after *                                                #
  // ########################################################################

  it('should make sense of errors due to no space after * in a rule', () => {
    /*
    Profile: SampleObservation
    Parent: Observation
    *component = FOO#bar
    */
    const input = '\nProfile: SampleObservation\nParent: Observation\n*component = FOO#bar';
    importSingleText(input, 'Invalid.fsh');
    expect(loggerSpy.getLastMessage('error')).toMatch(
      /Rules must start with a '\*' symbol followed by at least one space.*File: Invalid\.fsh.*Line: 4\D*/s
    );
  });
});
