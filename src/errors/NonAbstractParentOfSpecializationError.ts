export class NonAbstractParentOfSpecializationError extends Error {
  constructor(public invalidType: string, public nonAbstractParent: string) {
    super(
      `The type ${nonAbstractParent} is not abstract, so it cannot be constrained to the specialization ${invalidType}.`
    );
  }
}
