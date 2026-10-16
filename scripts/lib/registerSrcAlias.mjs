// Node（24 以降・TypeScript の型を除いて読む機能を使う）から src/ の .ts をそのまま読むための解決フック。
// Next と同じく「@/」を src/ に読み替え、拡張子の無い指定には .ts（フォルダなら index.ts）を補う。
// next 14 は exports の対応表を持たないため、next/server などにも .js を補う。
// このファイルを先に import し、src/ を使うモジュールは後から import() で読む（静的 import は登録前に解決されるため）
import { existsSync, statSync } from 'node:fs';
import { registerHooks } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SRC_DIR = fileURLToPath(new URL('../../src/', import.meta.url));

// package.json に "type" が無いため、src/ の .ts を読むたびに「ES モジュールとして読み直した」警告が出る。
// 動きに害は無いので、その警告だけ出さない
const emitWarning = process.emitWarning;
process.emitWarning = function (warning, ...rest) {
  const code = rest[0] && typeof rest[0] === 'object' ? rest[0].code : rest[1];
  if (code === 'MODULE_TYPELESS_PACKAGE_JSON') return;
  return emitWarning.call(this, warning, ...rest);
};

const isFile = (path) => existsSync(path) && statSync(path).isFile();

// 拡張子の無いパスを .ts・index.ts の順に補う
const withTsExtension = (path) =>
  [path, `${path}.ts`, `${path}/index.ts`].find(isFile) ?? path;

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith('@/')) {
      return nextResolve(pathToFileURL(withTsExtension(SRC_DIR + specifier.slice(2))).href, context);
    }
    if (/^next\/[\w-]+$/.test(specifier)) {
      return nextResolve(`${specifier}.js`, context);
    }
    // src/ の .ts の中の相対の指定（./foo）にも .ts を補う
    if (specifier.startsWith('.') && context.parentURL?.startsWith(pathToFileURL(SRC_DIR).href)) {
      const path = fileURLToPath(new URL(specifier, context.parentURL));
      return nextResolve(pathToFileURL(withTsExtension(path)).href, context);
    }
    return nextResolve(specifier, context);
  },
});
