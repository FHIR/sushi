export const STRUCTURE_DEFINITION_R4_BASE = {
  resourceType: 'StructureDefinition',
  id: 'Base',
  url: 'http://hl7.org/fhir/StructureDefinition/Base',
  version: '4.0.1',
  name: 'Base',
  status: 'active',
  date: '2021-04-15T12:25:09+10:00',
  publisher: 'HL7 FHIR Standard',
  description:
    'Base StructureDefinition for Base Type: Base definition for all types defined in FHIR type system.',
  fhirVersion: '4.0.1',
  mapping: [
    {
      identity: 'rim',
      name: 'RIM Mapping',
      uri: 'http://hl7.org/v3'
    }
  ],
  kind: 'complex-type',
  abstract: true,
  type: 'Base',
  snapshot: {
    element: [
      {
        id: 'Base',
        path: 'Base',
        min: 0,
        max: '*',
        base: {
          path: 'Base',
          min: 0,
          max: '*'
        },
        constraint: [
          {
            key: 'ele-1',
            severity: 'error',
            human: 'All FHIR elements must have a @value or children',
            expression: 'hasValue() or (children().count() > id.count())',
            xpath: '@value|f:*|h:div',
            source: 'http://hl7.org/fhir/StructureDefinition/Element'
          }
        ],
        isModifier: false
      }
    ]
  },
  differential: {
    element: [
      {
        id: 'Base',
        path: 'Base',
        min: 0,
        max: '*'
      }
    ]
  }
};
