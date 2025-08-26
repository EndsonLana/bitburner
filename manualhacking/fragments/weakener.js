/** @param {NS} ns */
export async function main(ns) {
  var servername = ns.args[0]
  await ns.weaken(servername)
}
