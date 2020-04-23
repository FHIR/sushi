export class FixingNonResourceError extends Error {
  constructor(public resourceType: string, public id: string) {
    super(
      `Instance ${id} of type ${resourceType} is not an Instance of a Resource or Profile of a Resource. Only Instances of Resources or Profiles of Resources may be assigned to other Instances.`
    );
  }
}
