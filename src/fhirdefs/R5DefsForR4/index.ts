// Base is needed as a parent of R4 logical models
import Base from './StructureDefinition-Base.json';

// The following resources are "Special Types" allowed to be instantiated, but not profiled, in R4
// See: https://chat.fhir.org/#narrow/stream/215610-shorthand/topic/using.20R5.20resources.20in.20FSH/near/377870473
// List of Types: https://github.com/HL7/fhir-ig-publisher/blob/master/org.hl7.fhir.publisher.core/src/main/java/org/hl7/fhir/igtools/publisher/SpecialTypeHandler.java#L12-L13
import ActorDefinition from './StructureDefinition-ActorDefinition.json';
import Requirements from './StructureDefinition-Requirements.json';
import SubscriptionTopic from './StructureDefinition-SubscriptionTopic.json';
import TestPlan from './StructureDefinition-TestPlan.json';

// CodeableReference is needed because the above "SpecialTypes" depend on it
import CodeableReference from './StructureDefinition-CodeableReference.json';

// DataType is needed because CodeableReference declares it as its baseDefinition
import DataType from './StructureDefinition-DataType.json';

export const R5_DEFINITIONS_NEEDED_IN_R4 = [
  Base,
  ActorDefinition,
  Requirements,
  SubscriptionTopic,
  TestPlan,
  CodeableReference,
  DataType
];
// Flag these R5 resources so we know they're from the future!
R5_DEFINITIONS_NEEDED_IN_R4.forEach((def: any) => (def._timeTraveler = true));
