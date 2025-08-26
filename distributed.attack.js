/** Get all discovered servers with optional filters.
 * @param {NS} ns
 * @param {{
 *   includeHome?: boolean,   // include "home" in the returned list
 *   rootedOnly?: boolean,    // return only servers you already have root on
 *   ignore?: string[],       // skip these hosts entirely (e.g. ["darkweb"])
 * }} opts
 * @returns {string[]} Sorted list of servers (home excluded by default)
 */
export function getAllServers(ns, opts = {}) {
  const {
    includeHome = false,
    rootedOnly = false,
    ignore = [],
  } = opts;

  const visited = new Set();
  const out = [];
  const queue = ["home"];

  while (queue.length > 0) {
    const host = queue.shift();
    if (visited.has(host)) continue;
    visited.add(host);

    // Decide whether to include this host in results
    const isHome = host === "home";
    const skip = ignore.includes(host) || (rootedOnly && !ns.hasRootAccess(host));
    if (!skip && (!isHome || includeHome)) out.push(host);

    // Enqueue neighbors
    for (const nxt of ns.scan(host)) {
      if (!visited.has(nxt)) queue.push(nxt);
    }
  }

  // Exclude home by default (already handled above), return sorted for convenience
  return out.sort();
}

/** Demo / CLI entry
 * Usage examples:
 *  run servers.js                 -> list all discovered servers (no home)
 *  run servers.js --rooted        -> only servers with root access
 *  run servers.js --includeHome   -> include "home"
 *  run servers.js --ignore darkweb n00dles
 */
/** @param {NS} ns */
export async function main(ns) {
  ns.disableLog("scan");

  const flags = ns.flags([
    ["rooted", true],
    ["includeHome", false],
    ["ignore", []], // pass multiple names after --ignore
  ]);

  const servers = getAllServers(ns, {
    includeHome: !!flags.includeHome,
    rootedOnly:  !!flags.rooted,
    ignore: Array.isArray(flags.ignore) ? flags.ignore : [flags.ignore],
  });

  //ns.tprint(`Found ${servers.length} server(s):\n${servers.join(", ")}`);




















  
}
