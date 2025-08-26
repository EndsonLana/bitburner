/** @param {NS} ns */
function buyHacknet(seq, hardware, cost){
  var availMoney = ns.getServerMoneyAvailable('home')
  var topay = 0
  switch(hardware){
    case "Node": 
      topay = ns.hacknet.getPurchaseNodeCost()
      if (availMoney > topay){
        ns.hacknet.purchaseNode()
      }
      break
    case "Level": 
      topay = ns.hacknet.getLevelUpgradeCost(seq,1)
      if (availMoney > topay){
        ns.hacknet.upgradeLevel(seq, 1)
      }
      break
    case "RAM": 
      topay = ns.hacknet.getRamUpgradeCost(seq,1)
      if (availMoney > topay){
        ns.hacknet.upgradeRam(seq, 1)
      }
      break
  }
}

export async function main(ns) {
  var ownHacknet =  ns.hacknet.numNodes()
  var cheapestHacknetSeq = 0
  var cheapestHacknetHardware = 'Level'
  var cheapestCost = 0.0

  let i = 0
  while (i < ownHacknet){
    hacknetData = ns.hacknet.getNodeStats(i)
    var coreNum = hacknetData['cores']
    if (coreNum < 8){
      buyCores = True
    }else{
      buyCores = False
    }

    var aveLevelCost = ns.hacknet.getLevelUpgradeCost(i,1)/1.5
    var aveRAMCost = ns.hacknet.getRamUpgradeCost(i,1)/1.375
    var aveCoresCost = ns.hacknet.getCoreUpgradeCost(i,1)/6.5
    if (i = 0){
      if (buyCores){
        cheapestCost = Math.min([aveLevelCost, aveRAMCost, aveCoresCost])
      }else{
        cheapestCost = Math.min([aveLevelCost, aveRAMCost])
      }
    }

    var localCheapestCost = 0.0
    if (buyCores){
      localCheapestCost = aveCoresCost
      tobuyHardware = 'Cores'
    }
    if (aveRAMCost < cheapestCost){
      localCheapestCost = aveRAMCost
      tobuyHardware = 'RAM'
    }
    if (aveLevelCost < cheapestCost){
      localCheapestCost = aveLevelCost
      tobuyHardware = 'Level'
    }

    if (localCheapestCost <= cheapestCost){
      cheapestHacknetSeq = i
      cheapestHacknetHardware = tobuyHardware
    }
  }

  if (cheapestCost > ns.hacknet.getPurchaseNodeCost){
    cheapestHacknetHardware = 'Node'
  }

  buyHacknet(cheapestHacknetSeq, cheapestHacknetHardware)
  ns.sleep(1000)
}

