import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { FHIRDefinitions } from '../fhirdefs';
import { Configuration } from '../fshtypes';
import { CACHE_FORMAT } from './CacheStore';

export function fileStamp(file: string): string {
  const stat = fs.statSync(file);
  return `${stat.size}:${stat.mtimeMs}`;
}

function listFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      listFiles(full, out);
    } else if (/\.(c|m)?(js|ts)$/.test(entry.name)) {
      // compiled files, or sources when run with a TypeScript loader
      out.push(full);
    }
  }
  return out.sort();
}

/**
 * Identifies the SUSHI build that is running: its version, the files it is made of (compiled, or
 * TypeScript sources when it runs from them), and the Node.js version running it. Parsed FSH is
 * reusable only by the same build.
 */
export function toolKey(sushiVersion: string): string {
  const hash = createHash('sha256');
  hash.update(`${CACHE_FORMAT}\n${sushiVersion}\n${process.version}\n`);
  const distDir = path.resolve(__dirname, '..');
  for (const file of listFiles(distDir)) {
    hash.update(`${path.relative(distDir, file)}:${fileStamp(file)}\n`);
  }
  return hash.digest('base64url');
}

/**
 * Identifies everything other than the FSH itself that the export depends on: the SUSHI build,
 * the command line options, the configuration, and every loaded dependency and predefined
 * resource. Exported results are reusable only when all of these are unchanged.
 */
export function exportKey(
  tool: string,
  options: any,
  config: Configuration,
  configText: string,
  defs: FHIRDefinitions
): string {
  const hash = createHash('sha256');
  const update = (label: string, value: string) =>
    hash.update(`${label}:${value.length}:${value}\n`);
  update('tool', tool);
  update('options', JSON.stringify(options ?? {}));
  update('config', JSON.stringify(config ?? null));
  update('configText', configText ?? '');
  for (const info of defs.findPackageInfos('*')) {
    update(
      'package',
      JSON.stringify([info.name, info.version, info.packagePath, info.packageJSONPath])
    );
    if (info.packageJSONPath && fs.existsSync(info.packageJSONPath)) {
      update('packageJSON', fileStamp(info.packageJSONPath));
    }
  }
  for (const info of defs.findResourceInfos('*')) {
    update('resource', JSON.stringify(info));
    if (info.resourcePath && fs.existsSync(info.resourcePath)) {
      update('resourceFile', fileStamp(info.resourcePath));
    }
  }
  update('predefined', JSON.stringify(defs.allPredefinedResources()));
  return hash.digest('base64url');
}
