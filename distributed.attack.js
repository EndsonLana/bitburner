/** @param {NS} ns */
export async function main(ns) {
	disable_logs(ns)
  /* 10 times search */
  var max_search = 10
  let iter = 0
  let servers = Array(ns.scan())[0]
  let serv_set = Array(servers)
  serv_set.push("home")
	for (iter < max_search) {
		let i = 0
		while (i < servers.length) {
			let server = servers[i]
			if (!ns.hasRootAccess(server) && ns.getServerRequiredHackingLevel(server) <= ns.getHackingLevel() && !IGNORE.includes(server)) {
				ns.print("attempting to hack ", server)
				ns.run("hacking/worm.js", 1, server)
				await ns.sleep(10)
			}
			let s = ns.scan(server)
			for (let j in s) {
				let con = s[j]
				if (!serv_set.includes(con)) {
				//if (serv_set.indexOf(con) < 0) {
					serv_set.push(con)
					servers.push(con)
				}
			}
			i += 1
		}

		await ns.sleep(10)
	}

}
