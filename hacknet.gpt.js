/** 
 * Hacknet Auto-Buyer (safe & configurable)
 * Buys the single cheapest upgrade across Level/RAM/Cores or a new Node.
 * 
 * Usage examples:
 *   run hacknet-autobuy.js
 *   run hacknet-autobuy.js --reserve 1e6 --maxCores 8 --maxLevel 200 --maxRam 64
 *   run hacknet-autobuy.js --once      (buy only one thing and exit)
 *   run hacknet-autobuy.js --delay 3000
 * 
 * Flags:
 *   --reserve   : money to keep on 'home' (default: 0)
 *   --delay     : loop delay ms (default: 2000)
 *   --maxLevel  : do not level nodes above this (default: 200)
 *   --maxRam    : do not upgrade RAM above this (default: 64)
 *   --maxCores  : do not upgrade cores above this (default: 16)
 *   --once      : purchase a single upgrade then exit (default: false)
 *   --quiet     : reduce logging (default: false)
 */

/** @param {NS} ns **/

export async function main(ns) {
  const flags = ns.flags([
    ["reserve", 0],
    ["delay", 2000],
    ["maxLevel", 1000],
    ["maxRam", 64],
    ["maxCores", 8],
    ["once", false],
    ["quiet", false],
  ]);

  ns.disableLog("sleep");
  ns.disableLog("getServerMoneyAvailable");

  const fmt = (n) => ns.nFormat(n, "0.00a");
  const log = (msg) => { if (!flags.quiet) ns.print(msg); };

  while (true) {
    const myMoney = ns.getServerMoneyAvailable("home");
    const budget = Math.max(0, myMoney - flags.reserve);

    // Find the single cheapest action we’re allowed to buy.
    const best = findCheapest(ns, flags);

    if (!best || !isFinite(best.cost)) {
      log("No valid Hacknet purchases found (all capped?)");
      if (flags.once) return;
      await ns.sleep(flags.delay);
      continue;
    }

    if (budget < best.cost) {
      log(`Cheapest: ${best.desc} costs ${fmt(best.cost)} but budget is ${fmt(budget)}. Waiting…`);
      if (flags.once) return;
      await ns.sleep(flags.delay);
      continue;
    }

    const ok = execute(ns, best);
    if (ok) {
      log(`Bought: ${best.desc} for ${fmt(best.cost)}`);
    } else {
      // If a race condition or insufficient funds after recheck—just wait
      log(`Purchase failed: ${best.desc} (cost ${fmt(best.cost)}). Retrying…`);
    }

    if (flags.once) return;

    // brief delay so we don’t spin too fast
    await ns.sleep(200);
  }
}

/**
 * Determine the single cheapest valid thing to buy.
 * Considers: new Node, +1 Level/RAM/Core on each node (subject to caps).
 * @param {NS} ns
 * @param {{maxLevel:number, maxRam:number, maxCores:number}} flags
 * @returns {{type:string, idx:number, cost:number, desc:string}|null}
 */
function findCheapest(ns, flags) {
  let best = { type: "None", idx: -1, cost: Infinity, desc: "" };

  // New Node
  const nodeCost = ns.hacknet.getPurchaseNodeCost();
  if (nodeCost < best.cost) {
    best = { type: "Node", idx: -1, cost: nodeCost, desc: "New Node" };
  }

  const nodes = ns.hacknet.numNodes();
  for (let i = 0; i < nodes; i++) {
    const s = ns.hacknet.getNodeStats(i);

    // Level
    if (s.level < flags.maxLevel) {
      const c = ns.hacknet.getLevelUpgradeCost(i, 1);
      if (isFinite(c) && c < best.cost) best = { type: "Level", idx: i, cost: c, desc: `Level+1 @ Node ${i} (now ${s.level}→)` };
    }

    // RAM (must be power of 2; Bitburner handles that internally)
    if (s.ram < flags.maxRam) {
      const c = ns.hacknet.getRamUpgradeCost(i, 1);
      if (isFinite(c) && c < best.cost) best = { type: "RAM", idx: i, cost: c, desc: `RAM+1 tier @ Node ${i} (now ${s.ram}→)` };
    }

    // Cores
    if (s.cores < flags.maxCores) {
      const c = ns.hacknet.getCoreUpgradeCost(i, 1);
      if (isFinite(c) && c < best.cost) best = { type: "Cores", idx: i, cost: c, desc: `Core+1 @ Node ${i} (now ${s.cores}→)` };
    }
  }

  return isFinite(best.cost) ? best : null;
}

/**
 * Executes the chosen upgrade if still affordable.
 * @param {NS} ns
 * @param {{type:string, idx:number, cost:number}} best
 * @returns {boolean}
 */
function execute(ns, best) {
  const money = ns.getServerMoneyAvailable("home");
  if (money < best.cost) return false;

  switch (best.type) {
    case "Node":
      return ns.hacknet.purchaseNode() !== -1;

    case "Level":
      return ns.hacknet.upgradeLevel(best.idx, 1);

    case "RAM":
      return ns.hacknet.upgradeRam(best.idx, 1);

    case "Cores":
      return ns.hacknet.upgradeCore(best.idx, 1);

    default:
      return false;
  }
}
