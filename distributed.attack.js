/** Perpetual Distributed Attack (no-kill, weaken-first, time-ratio fill)
 * - Top $ server is the main target. We NEVER kill jobs.
 * - Phase 1: Keep weakening until sec <= minSec + 2 (all free threads → weaken).
 * - Phase 2: Fill remaining free threads each tick by time-ratios (W > G > H priority).
 * - On the target itself, launch testpoor.js → second-top using any free RAM @ 2.4 GB/thread.
 *
 * Requires on HOME (will be scp'ed):
 *   fragments/weakener.js  (1.75 GB)
 *   fragments/grower.js    (1.75 GB)
 *   fragments/hacker.js    (1.75 GB)
 *   testpoor.js            (2.40 GB)
 *
 * Usage:
 *   run distributed.attack.nokill.js
 *   run distributed.attack.nokill.js --tick 15000 --quiet
 */

/** @param {NS} ns */
export async function main(ns) {
  const flags = ns.flags([
    ["tick", 15000],  // ms between checks/fills
    ["quiet", false],
  ]);
  const log = (...a) => { if (!flags.quiet) ns.tprint(...a); };

  ns.disableLog("scan");
  ns.disableLog("sleep");
  ns.disableLog("getServerUsedRam");
  ns.disableLog("getServerMaxRam");

  // --- constants ---
  const COST = { role: 1.75, test: 2.40 };
  const W_SCRIPT = "fragments/weakener.js";
  const G_SCRIPT = "fragments/grower.js";
  const H_SCRIPT = "fragments/hacker.js";
  const T_SCRIPT = "testpoor.js";
  const OUR_SCRIPTS = [W_SCRIPT, G_SCRIPT, H_SCRIPT, T_SCRIPT];
  const EPS = 1e-6;

  while (true) {
    try {
      // 1) discover rooted servers (exclude home)
      const rooted = getAllServers(ns, { rootedOnly: true, includeHome: false });
      const moneyHosts = rooted.filter(s => ns.getServerMaxMoney(s) > 0);
      if (moneyHosts.length === 0) { await ns.sleep(flags.tick); continue; }

      // 2) choose target & second-top
      moneyHosts.sort((a, b) => ns.getServerMaxMoney(b) - ns.getServerMaxMoney(a));
      const target    = moneyHosts[0];
      const secondTop = moneyHosts[1] || moneyHosts[0];

      // 3) workers = rooted except target (home already excluded)
      const workers = rooted.filter(s => s !== target);

      // 4) ensure scripts are present
      for (const host of [...workers, target]) { try { await ns.scp(OUR_SCRIPTS, host, "home"); } catch {} }

      // 5) on the target, use any free RAM to run testpoor.js → secondTop (2.4 GB/thread)
      fillWith(ns, target, T_SCRIPT, COST.test, secondTop);

      // 6) decide phase for main target
      const minSec = ns.getServerMinSecurityLevel(target);
      const curSec = ns.getServerSecurityLevel(target);
      const threshold = minSec + 2;

      // 7) snapshot free threads on workers (role scripts all 1.75 GB)
      const caps = workers.map(h => ({ host: h, free: maxThreadsOn(ns, h, COST.role) }))
                          .filter(x => x.free > 0);

      if (caps.length === 0) { await ns.sleep(flags.tick); continue; }

      if (curSec > threshold + EPS) {
        // Phase 1: weaken-only fill (no killing; we just add more if free)
        for (const { host, free } of caps) {
          if (free > 0) ns.exec(W_SCRIPT, host, free, target);
        }
      } else {
        // Phase 2: time-ratio fill of remaining free capacity
        const tW = ns.getWeakenTime(target);
        const tG = ns.getGrowTime(target);
        const tH = ns.getHackTime(target);
        const sumT = Math.max(EPS, tW + tG + tH);

        // compute global desired mix for *newly free* threads
        const totalFree = caps.reduce((a, x) => a + x.free, 0);
        if (totalFree > 0) {
          let planW = Math.floor(totalFree * (tW / sumT));
          let planG = Math.floor(totalFree * (tG / sumT));
          let planH = Math.floor(totalFree * (tH / sumT));

          // zero-proof and leftover distribution with priority W > G > H
          const plans = { W: planW, G: planG, H: planH };
          let left = totalFree - (planW + planG + planH);
          for (const k of ["W", "G", "H"]) if (plans[k] === 0 && totalFree > 0) { plans[k]++; left--; }
          for (const k of ["W", "G", "H"]) { while (left > 0) { plans[k]++; left--; } }

          // per-host fill, priority W > G > H (never kill; just use free slots)
          let rem = { ...plans };
          for (const cap of caps) {
            let free = cap.free;
            if (free <= 0) continue;

            const w = Math.min(free, rem.W); free -= w; rem.W -= w;
            const g = Math.min(free, rem.G); free -= g; rem.G -= g;
            const h = Math.min(free, rem.H); free -= h; rem.H -= h;

            if (w > 0) ns.exec(W_SCRIPT, cap.host, w, target);
            if (g > 0) ns.exec(G_SCRIPT, cap.host, g, target);
            if (h > 0) ns.exec(H_SCRIPT, cap.host, h, target);

            if (rem.W + rem.G + rem.H <= 0) break;
          }
        }
      }

      await ns.sleep(flags.tick);
    } catch (e) {
      if (!flags.quiet) ns.tprint(`controller error: ${String(e)}`);
      await ns.sleep(flags.tick);
    }
  }
}

/** launch as many threads of `script` on `host` as current free RAM allows, args passed to each */
function fillWith(ns, host, script, ramPerThread, ...args) {
  const free = Math.floor(Math.max(0, ns.getServerMaxRam(host) - ns.getServerUsedRam(host)) / ramPerThread);
  if (free > 0) ns.exec(script, host, free, ...args);
}

/** max threads available on host for given ram/thread */
function maxThreadsOn(ns, host, ramPerThread) {
  const freeRam = Math.max(0, ns.getServerMaxRam(host) - ns.getServerUsedRam(host));
  return Math.floor(freeRam / ramPerThread);
}

/** BFS discovery with options */
export function getAllServers(ns, opts = {}) {
  const { includeHome = false, rootedOnly = false, ignore = [] } = opts;
  const seen = new Set(), out = [], q = ["home"];
  while (q.length) {
    const h = q.shift(); if (seen.has(h)) continue; seen.add(h);
    const isHome = h === "home";
    const skip = ignore.includes(h) || (rootedOnly && !ns.hasRootAccess(h));
    if (!skip && (!isHome || includeHome)) out.push(h);
    for (const n of ns.scan(h)) if (!seen.has(n)) q.push(n);
  }
  return out.sort();
}
