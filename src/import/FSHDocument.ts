import { Profile, Extension, Instance } from '../fshtypes';

export class FSHDocument {
  readonly aliases: Map<string, string>;
  readonly profiles: Map<string, Profile>;
  readonly extensions: Map<string, Extension>;
  readonly instances: Map<string, Instance>;

  constructor(public readonly file: string) {
    this.aliases = new Map();
    this.profiles = new Map();
    this.extensions = new Map();
    this.instances = new Map();
  }
}
