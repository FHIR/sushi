import { FshEntity } from './FshEntity';

export class ValueSetComponent extends FshEntity {
  public system?: string;
  public rule?: ValueSetConcept | ValueSetFilter | ValueSetReference;

  public withSystem(system: string): ValueSetComponent {
    this.system = system;
    return this;
  }

  public withRule(rule: ValueSetConcept | ValueSetFilter | ValueSetReference): ValueSetComponent {
    this.rule = rule;
    return this;
  }
}

export class ValueSetConcept {
  public code: string;
  public display: string;
}

export class ValueSetFilter {
  public property: string;
  public op:
    | '='
    | 'is-a'
    | 'descendant-of'
    | 'is-not-a'
    | 'regex'
    | 'in'
    | 'not-in'
    | 'generalizes'
    | 'exists';
  public value: string;
}

export type ValueSetReference = string;
