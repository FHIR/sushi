import { artifactScopeKey, instanceScopeKey } from '../../src/export/artifactScopeKeys';
import { FshCodeSystem, FshValueSet, Instance, Profile } from '../../src/fshtypes';
import { AssignmentRule, CaretValueRule } from '../../src/fshtypes/rules';

describe('artifactScopeKeys', () => {
  const canonical = 'http://example.org';

  const urlCaretRule = (url: string): CaretValueRule => {
    const rule = new CaretValueRule('');
    rule.caretPath = 'url';
    rule.value = url;
    return rule;
  };

  describe('#artifactScopeKey', () => {
    it('builds a scope key url from the configured canonical', () => {
      const profile = new Profile('MyProfile');
      profile.id = 'my-profile';

      expect(artifactScopeKey('StructureDefinition', profile, canonical)).toEqual({
        resourceType: 'StructureDefinition',
        id: 'my-profile',
        url: 'http://example.org/StructureDefinition/my-profile'
      });
    });

    it('honors a ^url caret rule when building a scope key', () => {
      const profile = new Profile('MyProfile');
      profile.id = 'my-profile';
      profile.rules.push(urlCaretRule('http://other.org/StructureDefinition/renamed'));

      expect(artifactScopeKey('StructureDefinition', profile, canonical).url).toBe(
        'http://other.org/StructureDefinition/renamed'
      );
    });

    it('builds ValueSet and CodeSystem scope keys with their own resource type', () => {
      const valueSet = new FshValueSet('MyValueSet');
      valueSet.id = 'my-vs';
      const codeSystem = new FshCodeSystem('MyCodeSystem');
      codeSystem.id = 'my-cs';

      expect(artifactScopeKey('ValueSet', valueSet, canonical).url).toBe(
        'http://example.org/ValueSet/my-vs'
      );
      expect(artifactScopeKey('CodeSystem', codeSystem, canonical).url).toBe(
        'http://example.org/CodeSystem/my-cs'
      );
    });

    it('omits the url when no canonical is configured', () => {
      const profile = new Profile('MyProfile');
      profile.id = 'my-profile';

      expect(artifactScopeKey('StructureDefinition', profile)).toEqual({
        resourceType: 'StructureDefinition',
        id: 'my-profile'
      });
    });
  });

  describe('#instanceScopeKey', () => {
    it('carries an assigned instance url on an instance scope key', () => {
      const instance = new Instance('MySearchParameter');
      instance.id = 'my-sp';
      instance.instanceOf = 'SearchParameter';
      const rule = new AssignmentRule('url');
      rule.value = 'http://example.org/SearchParameter/my-sp';
      instance.rules.push(rule);

      expect(instanceScopeKey(instance)).toEqual({
        id: 'my-sp',
        url: 'http://example.org/SearchParameter/my-sp'
      });
    });

    it('omits the url from an instance scope key when none is assigned', () => {
      const instance = new Instance('MySearchParameter');
      instance.id = 'my-sp';
      instance.instanceOf = 'SearchParameter';

      expect(instanceScopeKey(instance)).toEqual({ id: 'my-sp' });
    });
  });
});
