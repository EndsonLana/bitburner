/** Get all discovered servers with optional filters.
 * @param {NS} ns
 * @param {{
 *   includeHome?: boolean,   // include "home" in the returned list
 *   rootedOnly?: boolean,    // return only servers you already have root on
 *   ignore?: string[],       // skip these hosts entirely (e.g. ["darkweb"])
 * }} opts
 * @returns {string[]} Sorted list of servers (home excluded by default)
 */
function indexOfMax(arr) {
    if (arr.length === 0) {
        return -1;
    }

    var max = arr[0];
    var maxIndex = 0;

    for (var i = 1; i < arr.length; i++) {
        if (arr[i] > max) {
            maxIndex = i;
            max = arr[i];
        }
    }

    return maxIndex;
}

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
  var serverIndex = 0
  var serverMaxMoney = []
  var serverMaxRAM = []
  var serverHackTime = []
  var serverGrowTime = []
  var serverWeakenTime = []
  var serverMaxThread = []
  while (serverIndex < servers.length) {
    serverMaxMoney.push(ns.getServerMaxMoney(servers[serverIndex]))
    serverMaxRAM.push(ns.getServerMaxRam(servers[serverIndex]))
    serverMaxThread.push(Math.trunc(ns.getServerMaxRam(servers[serverIndex])/1.75))
    serverHackTime.push(ns.getHackTime(servers[serverIndex]))
    serverGrowTime.push(ns.getGrowTime(servers[serverIndex]))
    serverWeakenTime.push(ns.getWeakenTime(servers[serverIndex]))
    ns.scp('fragments/hacker.js', servers[serverIndex], 'home')
    ns.scp('fragments/weakener.js', servers[serverIndex], 'home')
    ns.scp('fragments/grower.js', servers[serverIndex], 'home')
    serverIndex = serverIndex + 1
  }

  var totalThreads = 0
  for (let i = 0; i < serverMaxThread.length; i++){
    totalThreads = totalThreads + serverMaxThread
  }
  
  var attackedServerIndex = indexOfMax(serverMaxMoney)
  var attackedServer = servers[attackedServerIndex]

  var attackedHackTime = serverHackTime[attackedServerIndex]
  var attackedWeakenTime = serverWeakenTime[attackedServerIndex]
  var attackedGrowTime = serverGrowTime[attackedServerIndex]

  var weaken2grow = Math.trunc(attackedWeakenTime/attackedGrowTime) + 1
  var grow2hack = Math.trunc(attackedGrowTime/attackedHackTime) + 1
  weaken2grow = grow2hack * weaken2grow
  divisionNum = weaken2grow + grow2hack + 1
  weakenThreadNum = Math.trunc(weaken2grow/divisionNum * totalThreads)
  growThreadNum = Math.trunc(grow2hack/divisionNum * totalThreads)
  hackThreeadNum = Math.trunc(1/divisionNum * totalThreads)
  
  while (serverIndex < servers.length) {
    switch(){
      case 'weakner': 
        ns.exec('weakener.js', servers[serverIndex], serverMaxThread[serverIndex] or weakenThreadNum - previousthresds)
        break
      case 'grower'
    }
    


  }







  
}
