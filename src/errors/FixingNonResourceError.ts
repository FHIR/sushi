export class FixingNonResourceError extends Error {
  constructor(public resourceType: string, public id: string) {
    super(
      `Instance ${id} of type ${resourceType} is not an Instance of a Resource. Only Instances of Resources may be assigned to other Instances.`
    );
  }
}
