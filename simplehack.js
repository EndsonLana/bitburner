/** @param {NS} ns */
export async function main(ns) {
  var servername = ns.args[0]

  while(true) {
    if (ns.getServerSecurityLevel(servername) > 3 + ns.getServerMinSecurityLevel(servername)) {
        await ns.weaken(servername);
    } else if (ns.getServerMoneyAvailable(servername) < 0.8 * ns.getServerMaxMoney(servername)) {
        await ns.grow(servername);
    } else {
        await ns.hack(servername);
    }
  }
  
}
