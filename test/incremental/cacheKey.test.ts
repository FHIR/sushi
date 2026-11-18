import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { exportKey } from '../../src/incremental/cacheKey';

describe('cacheKey', () => {
  describe('#exportKey', () => {
    let dir: string;

    beforeEach(() => {
      dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sushi-cachekey-'));
    });

    afterEach(() => {
      fs.removeSync(dir);
    });

    function keyFor(packageJSONPath: string, resourcePath: string) {
      const defs: any = {
        findPackageInfos: () => [{ name: 'p', version: '1.0.0', packageJSONPath }],
        findResourceInfos: () => [{ name: 'r', resourcePath }],
        allPredefinedResources: (): any[] => []
      };
      return exportKey('tool', {}, null, 'config', defs);
    }

    it('should change when a dependency or loaded resource file changes', () => {
      const packageJSON = path.join(dir, 'package.json');
      const resource = path.join(dir, 'resource.json');
      fs.writeFileSync(packageJSON, '{}');
      fs.writeFileSync(resource, '{}');
      const key = keyFor(packageJSON, resource);
      expect(keyFor(packageJSON, resource)).toBe(key);
      fs.writeFileSync(resource, '{ }');
      const changedResource = keyFor(packageJSON, resource);
      expect(changedResource).not.toBe(key);
      fs.writeFileSync(packageJSON, '{ }');
      expect(keyFor(packageJSON, resource)).not.toBe(changedResource);
    });

    it('should not need the files to exist', () => {
      const missing = path.join(dir, 'missing.json');
      expect(keyFor(missing, missing)).toBe(keyFor(missing, missing));
      expect(keyFor(missing, missing)).not.toBe(keyFor(null, null));
    });
  });
});
