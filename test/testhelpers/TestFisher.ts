import { FHIRDefinitions } from '../../src/fhirdefs/FHIRDefinitions';
import { Type } from '../../src/utils/Fishable';
import { StructureDefinition } from '../../src/fhirtypes';
import { MasterFisher } from '../../src/utils';
import { FSHTank } from '../../src/import';
import { Package } from '../../src/export';

// NOTE: This class used to have a capability to automatically load requested core FHIR resources
// from the FHIR cache and then save them to the fixtures if they weren't already there. This was
// primarily for convenience in early test writing. This feature has been removed since it was
// not used consistently, had some implementation bugs, and was difficult to reconcile with the new
// FHIR Package Loader that has asynchrounous loading methods. Future implementers can add this
// feature back if/when desired.
export class TestFisher extends MasterFisher {
  constructor(
    public tank?: FSHTank,
    public fhir?: FHIRDefinitions,
    public pkg?: Package
  ) {
    super(tank, fhir, pkg);
  }

  withTank(tank: FSHTank) {
    this.tank = tank;
    return this;
  }

  withFHIR(fhir: FHIRDefinitions) {
    this.fhir = fhir;
    return this;
  }

  withPackage(pkg: Package) {
    this.pkg = pkg;
    return this;
  }

  fishForStructureDefinition(
    item: string,
    ...types: (Type.Resource | Type.Type | Type.Profile | Type.Extension | Type.Logical)[]
  ) {
    const json = this.fishForFHIR(item, ...types);
    if (json) {
      return StructureDefinition.fromJSON(json);
    }
  }
}
