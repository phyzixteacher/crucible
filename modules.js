// Module definitions
const MODULES = {
    // Default modules
    "AutoCannon": {
        name: "Auto Cannon",
        icon: "AC",
        class: "Default",
        description: "Basic rapid-fire weapon with good tracking",
        type: "weapon",
        damagePerShot: 10,
        fireRate: 0.3, // shots per second
        tracking: 90, // degrees per second
        optimalRange: 300,
        falloffRange: 200,
        veskarPerShot: 0.33, // 3 shots per Veskar
        cooldown: 0,
        default: true
    },
    
    // Pummeler class
    "FlakCannon": {
        name: "Flak Cannon",
        icon: "FC",
        class: "Pummeler",
        description: "High damage at close range",
        type: "weapon",
        damagePerShot: 30,
        fireRate: 0.5,
        tracking: 60,
        optimalRange: 200,
        falloffRange: 100,
        veskarPerShot: 1,
        cooldown: 0.5,
        effect: "shieldOnDamage"
    },
    
    "Nanoaegis": {
        name: "Nanoaegis",
        icon: "NA",
        class: "Pummeler",
        description: "Efficient shield regeneration",
        type: "defense",
        shieldRegenMultiplier: 2,
        activationCost: 5, // Veskar
        cooldown: 10,
        effect: "regenerateShield"
    },
    
    "StasisSnare": {
        name: "Stasis Snare",
        icon: "SS",
        class: "Pummeler",
        description: "Reduces enemy speed by 50%",
        type: "ewar",
        range: 300,
        duration: 10, // seconds
        activationCost: 8, // Veskar
        cooldown: 15,
        effect: "slowEnemy"
    },
    
    // Hunter class
    "IonRepeater": {
        name: "Ion Repeater",
        icon: "IR",
        class: "Hunter",
        description: "Medium-range balanced weapon",
        type: "weapon",
        damagePerShot: 15,
        fireRate: 0.4,
        tracking: 70,
        optimalRange: 400,
        falloffRange: 200,
        veskarPerShot: 0.5,
        cooldown: 0.2,
        effect: "shieldPiercing"
    },
    
    "PhaseSight": {
        name: "Phase Sight",
        icon: "PS",
        class: "Hunter",
        description: "Increases tracking speed",
        type: "utility",
        trackingBonus: 40, // percent
        duration: 15, // seconds
        activationCost: 6, // Veskar
        cooldown: 20,
        effect: "improvedTracking"
    },
    
    "ImpulseDrive": {
        name: "Impulse Drive",
        icon: "ID",
        class: "Hunter",
        description: "Quick burst of speed",
        type: "drive",
        speedMultiplier: 3,
        duration: 3, // seconds
        activationCost: 5, // Veskar
        cooldown: 12,
        effect: "boostSpeed"
    },
    
    // Infiltrator class
    "PlasmaCleaver": {
        name: "Plasma Cleaver",
        icon: "PC",
        class: "Infiltrator",
        description: "High damage at close range",
        type: "weapon",
        damagePerShot: 40,
        fireRate: 0.6,
        tracking: 50,
        optimalRange: 150,
        falloffRange: 50,
        veskarPerShot: 1.5,
        cooldown: 0.8,
        effect: "flankingBonus"
    },
    
    "Overclock": {
        name: "Overclock",
        icon: "OC",
        class: "Infiltrator",
        description: "Increases weapon damage",
        type: "utility",
        damageMultiplier: 1.5,
        duration: 8, // seconds
        activationCost: 8, // Veskar
        cooldown: 25,
        effect: "increaseDamage"
    },
    
    "WhisperDrive": {
        name: "Whisper Drive",
        icon: "WD",
        class: "Infiltrator",
        description: "Temporary invisibility",
        type: "drive",
        duration: 5, // seconds
        activationCost: 10, // Veskar
        cooldown: 30,
        effect: "cloaking"
    },
    
    // Artillerist class
    "ArcboltCannon": {
        name: "Arcbolt Cannon",
        icon: "AB",
        class: "Artillerist",
        description: "Extreme damage at long range",
        type: "weapon",
        damagePerShot: 100,
        fireRate: 0.1,
        tracking: 30,
        optimalRange: 700,
        falloffRange: 300,
        veskarPerShot: 5,
        lockTime: 5, // seconds
        cooldown: 5,
        effect: "healthBasedDamage"
    },
    
    "NullLattice": {
        name: "Null Lattice",
        icon: "NL",
        class: "Artillerist",
        description: "Creates a safe zone",
        type: "defense",
        radius: 200,
        duration: 8, // seconds
        activationCost: 12, // Veskar
        cooldown: 35,
        effect: "preventLocking"
    },
    
    "FoldstreamDrive": {
        name: "Foldstream Drive",
        icon: "FD",
        class: "Artillerist",
        description: "Teleports to target location",
        type: "drive",
        range: 600,
        chargeTime: 3, // seconds
        activationCost: 15, // Veskar
        cooldown: 45,
        effect: "teleport"
    },
    
    // Harvester class
    "LodePiercer": {
        name: "Lode Piercer",
        icon: "LP",
        class: "Harvester",
        description: "Efficient at mining resources",
        type: "weapon",
        damagePerShot: 8,
        fireRate: 0.5,
        tracking: 80,
        optimalRange: 350,
        falloffRange: 150,
        veskarPerShot: 0.25,
        nodeMultiplier: 3, // Triple damage to resource nodes
        cooldown: 0.1,
        effect: "remoteCollection"
    },
    
    "Forgeplate": {
        name: "Forgeplate",
        icon: "FP",
        class: "Harvester",
        description: "Converts Veskar to armor",
        type: "defense",
        conversionRate: 5, // Veskar per 10% armor
        duration: 0, // Passive
        cooldown: 0,
        effect: "resourceConversion"
    },
    
    "PhotobeamDrive": {
        name: "Photobeam Drive",
        icon: "PD",
        class: "Harvester",
        description: "High speed but low maneuverability",
        type: "drive",
        speedMultiplier: 2.5,
        turnRateReduction: 0.5, // 50% turning rate
        duration: 10, // seconds
        activationCost: 7, // Veskar
        cooldown: 15,
        effect: "linearBoost"
    }
};

// Enhanced variations of modules for special shops
const ENHANCED_MODULES = {
    "FlakCannon+": {
        base: "FlakCannon",
        name: "Flak Cannon+",
        icon: "FC+",
        description: "Enhanced damage and shield regeneration",
        damageMultiplier: 1.25,
        effectStrength: 1.5
    },
    
    "Nanoaegis+": {
        base: "Nanoaegis",
        name: "Nanoaegis+",
        icon: "NA+",
        description: "Instant shield regeneration",
        cooldownReduction: 0.5,
        instantActivation: true
    },
    
    "IonRepeater+": {
        base: "IonRepeater",
        name: "Ion Repeater+",
        icon: "IR+",
        description: "Improved tracking and range",
        trackingBonus: 20,
        rangeBonus: 100
    },
    
    "PhaseSight+": {
        base: "PhaseSight",
        name: "Phase Sight+",
        icon: "PS+",
        description: "Target multiple ships at once",
        trackingBonus: 60,
        multiTargeting: true
    },
    
    "PlasmaCleaver+": {
        base: "PlasmaCleaver",
        name: "Plasma Cleaver+",
        icon: "PC+",
        description: "Disables engines on flank hits",
        damageMultiplier: 1.2,
        engineDisable: true
    },
    
    "ArcboltCannon+": {
        base: "ArcboltCannon",
        name: "Arcbolt Cannon+",
        icon: "AB+",
        description: "Increased damage based on target health",
        healthDamageMultiplier: 1.5,
        lockTimeReduction: 1
    },
    
    "LodePiercer+": {
        base: "LodePiercer",
        name: "Lode Piercer+",
        icon: "LP+",
        description: "Collects resources at range",
        nodeMultiplier: 4,
        collectionRange: 200
    }
};

// Utility function to get random modules for shop
function getRandomShopModules(count = 3, playerModules = [], isSpecialShop = false) {
    let availableModules = Object.keys(MODULES).filter(key => 
        !MODULES[key].default && 
        !playerModules.includes(key)
    );
    
    // For special shops, add enhanced variations
    const modulePool = isSpecialShop ? 
        [...availableModules, ...Object.keys(ENHANCED_MODULES)] : 
        availableModules;
    
    // If player has modules, weight toward synergistic modules
    let weightedPool = [...modulePool];
    
    if (playerModules.length > 0) {
        // Count classes to find player preference
        const classCount = {};
        playerModules.forEach(modKey => {
            const mod = MODULES[modKey];
            if (mod && mod.class) {
                classCount[mod.class] = (classCount[mod.class] || 0) + 1;
            }
        });
        
        // Find preferred class (if any)
        let preferredClass = null;
        let maxCount = 0;
        
        Object.entries(classCount).forEach(([className, count]) => {
            if (count > maxCount) {
                maxCount = count;
                preferredClass = className;
            }
        });
        
        // Add more of the preferred class to the pool
        if (preferredClass && maxCount >= 2) {
            modulePool.forEach(modKey => {
                const mod = MODULES[modKey] || 
                    (ENHANCED_MODULES[modKey] ? 
                        MODULES[ENHANCED_MODULES[modKey].base] : null);
                
                if (mod && mod.class === preferredClass) {
                    // Add 3 more copies to increase chance
                    weightedPool.push(modKey, modKey, modKey);
                }
            });
        }
    }
    
    // Select random modules
    const selected = [];
    for (let i = 0; i < count; i++) {
        if (weightedPool.length === 0) break;
        
        const randomIndex = Math.floor(Math.random() * weightedPool.length);
        const selectedKey = weightedPool[randomIndex];
        
        // Remove all instances of this module from the pool
        weightedPool = weightedPool.filter(key => key !== selectedKey);
        
        selected.push(selectedKey);
    }
    
    return selected;
}
