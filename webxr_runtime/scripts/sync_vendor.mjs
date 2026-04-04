import { cp, mkdir, rm, access, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

const nodeModules = path.join(projectRoot, 'node_modules');
const vendorRoot = path.join(projectRoot, 'static', 'vendor');

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(target) {
  await mkdir(target, { recursive: true });
}

async function copyRequired(src, dst) {
  if (!(await exists(src))) {
    throw new Error(`Missing required file for vendor sync: ${src}`);
  }
  await ensureDir(path.dirname(dst));
  await copyFile(src, dst);
}

async function copySpark(vendorSparkPath) {
  const candidates = [
    path.join(nodeModules, '@sparkjsdev', 'spark', 'spark.module.min.js'),
    path.join(nodeModules, '@sparkjsdev', 'spark', 'spark.module.js'),
    path.join(nodeModules, '@sparkjsdev', 'spark', 'dist', 'spark.module.min.js'),
    path.join(nodeModules, '@sparkjsdev', 'spark', 'dist', 'spark.module.js'),
    path.join(nodeModules, '@sparkjsdev', 'spark', 'build', 'spark.module.min.js'),
    path.join(nodeModules, '@sparkjsdev', 'spark', 'build', 'spark.module.js'),
  ];

  for (const candidate of candidates) {
    if (await exists(candidate)) {
      await copyRequired(candidate, vendorSparkPath);
      return { copied: true, source: candidate };
    }
  }

  const fallback = [
    'throw new Error("Spark module was not found in node_modules.");',
    'throw new Error("Check @sparkjsdev/spark package contents and update scripts/sync_vendor.mjs.");',
    '',
  ].join('\n');

  await ensureDir(path.dirname(vendorSparkPath));
  await writeFile(vendorSparkPath, fallback, 'utf-8');
  return { copied: false, source: null };
}

async function main() {
  await rm(vendorRoot, { recursive: true, force: true });
  await ensureDir(vendorRoot);

  const threeSrc = path.join(nodeModules, 'three', 'build', 'three.module.js');
  const threeDst = path.join(vendorRoot, 'three', 'three.module.js');
  await copyRequired(threeSrc, threeDst);

  const threeCoreSrc = path.join(nodeModules, 'three', 'build', 'three.core.js');
  const threeCoreDst = path.join(vendorRoot, 'three', 'three.core.js');
  await copyRequired(threeCoreSrc, threeCoreDst);

  const examplesSrc = path.join(nodeModules, 'three', 'examples', 'jsm');
  const examplesDst = path.join(vendorRoot, 'three', 'examples', 'jsm');
  if (!(await exists(examplesSrc))) {
    throw new Error(`Missing three examples folder: ${examplesSrc}`);
  }
  await ensureDir(path.dirname(examplesDst));
  await cp(examplesSrc, examplesDst, { recursive: true, force: true });

  const bvhSrc = path.join(nodeModules, 'three-mesh-bvh', 'build', 'index.module.js');
  const bvhDst = path.join(vendorRoot, 'three-mesh-bvh', 'index.module.js');
  await copyRequired(bvhSrc, bvhDst);

  const sparkDst = path.join(vendorRoot, 'spark', 'spark.module.min.js');
  const sparkResult = await copySpark(sparkDst);

  console.log('[vendor:sync] copied three =>', threeDst);
  console.log('[vendor:sync] copied three core =>', threeCoreDst);
  console.log('[vendor:sync] copied three examples =>', examplesDst);
  console.log('[vendor:sync] copied three-mesh-bvh =>', bvhDst);
  if (sparkResult.copied) {
    console.log('[vendor:sync] copied spark =>', sparkResult.source);
  } else {
    console.warn('[vendor:sync] spark module could not be auto-detected; placeholder emitted at', sparkDst);
  }
}

main().catch((error) => {
  console.error('[vendor:sync] failed', error);
  process.exitCode = 1;
});
