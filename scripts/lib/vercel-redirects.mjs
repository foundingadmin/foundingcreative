// Reads the redirect rules in vercel.json and matches paths against them the
// way Vercel does (path-to-regexp): :name matches one segment, :name*
// matches segments but not a trailing slash, and (regex) groups are used as
// written. Rules are tried in order and the first match wins.

import { readFileSync } from 'node:fs';

/** @typedef {{ source: string, destination: string, permanent?: boolean }} Redirect */

export const vercel = JSON.parse(readFileSync(new URL('../../vercel.json', import.meta.url), 'utf8'));

/** @param {string} source */
export function toRegExp(source) {
  const escape = (s) => s.replace(/[.+?^${}|[\]\\*]/g, '\\$&');
  let pattern = '';
  let last = 0;
  for (const m of source.matchAll(/:(\w+)(?:\(([^)]+)\))?(\*)?|\(([^)]+)\)(\?)?/g)) {
    pattern += escape(source.slice(last, m.index));
    if (m[4]) pattern += `(${m[4]})${m[5] ?? ''}`;
    else if (m[2]) pattern += `(${m[2]})`;
    else if (m[3]) pattern += '((?:[^/]+(?:/[^/]+)*)?)';
    else pattern += '([^/]+)';
    last = m.index + m[0].length;
  }
  return new RegExp(`^${pattern}${escape(source.slice(last))}$`);
}

/** The rewrite (served from another path, URL unchanged) for `path`, if any.
 * @param {string} path */
export const rewriteFor = (path) => vercel.rewrites?.find((r) => toRegExp(r.source).test(path));

/** The first redirect rule whose source matches `path`, if any.
 * @param {string} path
 * @returns {Redirect | undefined} */
export const redirectFor = (path) => vercel.redirects.find((r) => toRegExp(r.source).test(path));
