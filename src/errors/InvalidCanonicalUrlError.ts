export class InvalidCanonicalUrlError extends Error {
  constructor(public entityName: string) {
    super(
      `Cannot use canonical URL of ${entityName} because it does not exist. Be sure that ${entityName} exists and it has a URL.`
    );
  }
}
