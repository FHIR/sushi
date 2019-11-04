import { Profile, Extension } from '../fshtypes';

export class FSHDocument {
  readonly aliases: Map<string, string>;
  readonly profiles: Map<string, Profile>;
  readonly extensions: Map<string, Extension>;

  constructor(public readonly file: string) {
    this.aliases = new Map();
    this.profiles = new Map();
    this.extensions = new Map();
  }
}
