/* ============================================
   COMPREHENSIVE D&D 5E ECONOMY TRACKER
   200+ Items with Full Market Features
   ============================================ */

const dndItems = [
    // WEAPONS
    { name: "Club", category: "weapons", basePrice: 0.1, unit: "gp" },
    { name: "Dagger", category: "weapons", basePrice: 2, unit: "gp" },
    { name: "Greatclub", category: "weapons", basePrice: 0.2, unit: "gp" },
    { name: "Handaxe", category: "weapons", basePrice: 5, unit: "gp" },
    { name: "Javelin", category: "weapons", basePrice: 0.5, unit: "gp" },
    { name: "Light Hammer", category: "weapons", basePrice: 2, unit: "gp" },
    { name: "Mace", category: "weapons", basePrice: 5, unit: "gp" },
    { name: "Quarterstaff", category: "weapons", basePrice: 0.2, unit: "gp" },
    { name: "Sickle", category: "weapons", basePrice: 1, unit: "gp" },
    { name: "Spear", category: "weapons", basePrice: 1, unit: "gp" },
    { name: "Crossbow, Light", category: "weapons", basePrice: 25, unit: "gp" },
    { name: "Dart", category: "weapons", basePrice: 0.05, unit: "gp" },
    { name: "Shortbow", category: "weapons", basePrice: 25, unit: "gp" },
    { name: "Sling", category: "weapons", basePrice: 0.1, unit: "gp" },
    { name: "Battleaxe", category: "weapons", basePrice: 10, unit: "gp" },
    { name: "Flail", category: "weapons", basePrice: 10, unit: "gp" },
    { name: "Glaive", category: "weapons", basePrice: 20, unit: "gp" },
    { name: "Greataxe", category: "weapons", basePrice: 30, unit: "gp" },
    { name: "Greatsword", category: "weapons", basePrice: 50, unit: "gp" },
    { name: "Halberd", category: "weapons", basePrice: 20, unit: "gp" },
    { name: "Lance", category: "weapons", basePrice: 10, unit: "gp" },
    { name: "Longsword", category: "weapons", basePrice: 15, unit: "gp" },
    { name: "Maul", category: "weapons", basePrice: 10, unit: "gp" },
    { name: "Morningstar", category: "weapons", basePrice: 15, unit: "gp" },
    { name: "Pike", category: "weapons", basePrice: 5, unit: "gp" },
    { name: "Rapier", category: "weapons", basePrice: 25, unit: "gp" },
    { name: "Scimitar", category: "weapons", basePrice: 25, unit: "gp" },
    { name: "Shortsword", category: "weapons", basePrice: 10, unit: "gp" },
    { name: "Trident", category: "weapons", basePrice: 5, unit: "gp" },
    { name: "War Pick", category: "weapons", basePrice: 5, unit: "gp" },
    { name: "Warhammer", category: "weapons", basePrice: 15, unit: "gp" },
    { name: "Whip", category: "weapons", basePrice: 2, unit: "gp" },
    { name: "Blowgun", category: "weapons", basePrice: 10, unit: "gp" },
    { name: "Crossbow, Hand", category: "weapons", basePrice: 75, unit: "gp" },
    { name: "Crossbow, Heavy", category: "weapons", basePrice: 50, unit: "gp" },
    { name: "Longbow", category: "weapons", basePrice: 50, unit: "gp" },
    { name: "Net", category: "weapons", basePrice: 1, unit: "gp" },
    
    // AMMUNITION
    { name: "Arrows (20)", category: "weapons", basePrice: 1, unit: "gp" },
    { name: "Blowgun Needles (50)", category: "weapons", basePrice: 1, unit: "gp" },
    { name: "Crossbow Bolts (20)", category: "weapons", basePrice: 1, unit: "gp" },
    { name: "Sling Bullets (20)", category: "weapons", basePrice: 0.04, unit: "gp" },
    
    // ARMOR
    { name: "Padded Armor", category: "armor", basePrice: 5, unit: "gp" },
    { name: "Leather Armor", category: "armor", basePrice: 10, unit: "gp" },
    { name: "Studded Leather", category: "armor", basePrice: 45, unit: "gp" },
    { name: "Hide Armor", category: "armor", basePrice: 10, unit: "gp" },
    { name: "Chain Shirt", category: "armor", basePrice: 50, unit: "gp" },
    { name: "Scale Mail", category: "armor", basePrice: 50, unit: "gp" },
    { name: "Breastplate", category: "armor", basePrice: 400, unit: "gp" },
    { name: "Half Plate", category: "armor", basePrice: 750, unit: "gp" },
    { name: "Ring Mail", category: "armor", basePrice: 30, unit: "gp" },
    { name: "Chain Mail", category: "armor", basePrice: 75, unit: "gp" },
    { name: "Splint Armor", category: "armor", basePrice: 200, unit: "gp" },
    { name: "Plate Armor", category: "armor", basePrice: 1500, unit: "gp" },
    { name: "Shield", category: "armor", basePrice: 10, unit: "gp" },
    
    // ADVENTURING GEAR
    { name: "Abacus", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Acid (flask)", category: "adventuring-gear", basePrice: 25, unit: "gp" },
    { name: "Alchemist's Fire", category: "adventuring-gear", basePrice: 50, unit: "gp" },
    { name: "Ammunition Box", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Antitoxin (vial)", category: "adventuring-gear", basePrice: 50, unit: "gp" },
    { name: "Backpack", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Ball Bearings (bag of 1000)", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Barrel", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Basket", category: "adventuring-gear", basePrice: 0.4, unit: "gp" },
    { name: "Bedroll", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Bell", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Blanket", category: "adventuring-gear", basePrice: 0.5, unit: "gp" },
    { name: "Block and Tackle", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Book", category: "adventuring-gear", basePrice: 25, unit: "gp" },
    { name: "Bottle, Glass", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Bucket", category: "adventuring-gear", basePrice: 0.05, unit: "gp" },
    { name: "Caltrops", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Candle", category: "adventuring-gear", basePrice: 0.01, unit: "gp" },
    { name: "Case, Crossbow Bolt", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Case, Map or Scroll", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Chain (10 feet)", category: "adventuring-gear", basePrice: 5, unit: "gp" },
    { name: "Chalk (1 piece)", category: "adventuring-gear", basePrice: 0.01, unit: "gp" },
    { name: "Chest", category: "adventuring-gear", basePrice: 5, unit: "gp" },
    { name: "Climber's Kit", category: "adventuring-gear", basePrice: 25, unit: "gp" },
    { name: "Clothes, Common", category: "adventuring-gear", basePrice: 0.5, unit: "gp" },
    { name: "Clothes, Costume", category: "adventuring-gear", basePrice: 5, unit: "gp" },
    { name: "Clothes, Fine", category: "adventuring-gear", basePrice: 15, unit: "gp" },
    { name: "Clothes, Traveler's", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Component Pouch", category: "adventuring-gear", basePrice: 25, unit: "gp" },
    { name: "Crowbar", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Fishing Tackle", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Flask or Tankard", category: "adventuring-gear", basePrice: 0.02, unit: "gp" },
    { name: "Grappling Hook", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Hammer", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Hammer, Sledge", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Healer's Kit", category: "adventuring-gear", basePrice: 5, unit: "gp" },
    { name: "Hourglass", category: "adventuring-gear", basePrice: 25, unit: "gp" },
    { name: "Hunting Trap", category: "adventuring-gear", basePrice: 5, unit: "gp" },
    { name: "Ink (1 ounce bottle)", category: "adventuring-gear", basePrice: 10, unit: "gp" },
    { name: "Ink Pen", category: "adventuring-gear", basePrice: 0.02, unit: "gp" },
    { name: "Jug or Pitcher", category: "adventuring-gear", basePrice: 0.02, unit: "gp" },
    { name: "Ladder (10-foot)", category: "adventuring-gear", basePrice: 0.1, unit: "gp" },
    { name: "Lamp", category: "adventuring-gear", basePrice: 0.5, unit: "gp" },
    { name: "Lantern, Bullseye", category: "adventuring-gear", basePrice: 10, unit: "gp" },
    { name: "Lantern, Hooded", category: "adventuring-gear", basePrice: 5, unit: "gp" },
    { name: "Lock", category: "adventuring-gear", basePrice: 10, unit: "gp" },
    { name: "Magnifying Glass", category: "adventuring-gear", basePrice: 100, unit: "gp" },
    { name: "Manacles", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Mess Kit", category: "adventuring-gear", basePrice: 0.2, unit: "gp" },
    { name: "Mirror, Steel", category: "adventuring-gear", basePrice: 5, unit: "gp" },
    { name: "Oil (flask)", category: "adventuring-gear", basePrice: 0.1, unit: "gp" },
    { name: "Paper (sheet)", category: "adventuring-gear", basePrice: 0.2, unit: "gp" },
    { name: "Parchment (sheet)", category: "adventuring-gear", basePrice: 0.1, unit: "gp" },
    { name: "Perfume (vial)", category: "adventuring-gear", basePrice: 5, unit: "gp" },
    { name: "Pick, Miner's", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Piton", category: "adventuring-gear", basePrice: 0.05, unit: "gp" },
    { name: "Poison, Basic (vial)", category: "adventuring-gear", basePrice: 100, unit: "gp" },
    { name: "Pole (10-foot)", category: "adventuring-gear", basePrice: 0.05, unit: "gp" },
    { name: "Pot, Iron", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Potion of Healing", category: "adventuring-gear", basePrice: 50, unit: "gp" },
    { name: "Pouch", category: "adventuring-gear", basePrice: 0.5, unit: "gp" },
    { name: "Quiver", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Ram, Portable", category: "adventuring-gear", basePrice: 4, unit: "gp" },
    { name: "Rations (1 day)", category: "adventuring-gear", basePrice: 0.5, unit: "gp" },
    { name: "Robes", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Rope, Hempen (50 feet)", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Rope, Silk (50 feet)", category: "adventuring-gear", basePrice: 10, unit: "gp" },
    { name: "Sack", category: "adventuring-gear", basePrice: 0.01, unit: "gp" },
    { name: "Scale, Merchant's", category: "adventuring-gear", basePrice: 5, unit: "gp" },
    { name: "Sealing Wax", category: "adventuring-gear", basePrice: 0.5, unit: "gp" },
    { name: "Shovel", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Signal Whistle", category: "adventuring-gear", basePrice: 0.05, unit: "gp" },
    { name: "Signet Ring", category: "adventuring-gear", basePrice: 5, unit: "gp" },
    { name: "Soap", category: "adventuring-gear", basePrice: 0.02, unit: "gp" },
    { name: "Spellbook", category: "adventuring-gear", basePrice: 50, unit: "gp" },
    { name: "Spikes, Iron (10)", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Spyglass", category: "adventuring-gear", basePrice: 1000, unit: "gp" },
    { name: "Tent, Two-Person", category: "adventuring-gear", basePrice: 2, unit: "gp" },
    { name: "Tinderbox", category: "adventuring-gear", basePrice: 0.5, unit: "gp" },
    { name: "Torch", category: "adventuring-gear", basePrice: 0.01, unit: "gp" },
    { name: "Vial", category: "adventuring-gear", basePrice: 1, unit: "gp" },
    { name: "Waterskin", category: "adventuring-gear", basePrice: 0.2, unit: "gp" },
    { name: "Whetstone", category: "adventuring-gear", basePrice: 0.01, unit: "gp" },
    
    // TOOLS
    { name: "Alchemist's Supplies", category: "tools", basePrice: 50, unit: "gp" },
    { name: "Brewer's Supplies", category: "tools", basePrice: 20, unit: "gp" },
    { name: "Calligrapher's Supplies", category: "tools", basePrice: 10, unit: "gp" },
    { name: "Carpenter's Tools", category: "tools", basePrice: 8, unit: "gp" },
    { name: "Cartographer's Tools", category: "tools", basePrice: 15, unit: "gp" },
    { name: "Cobbler's Tools", category: "tools", basePrice: 5, unit: "gp" },
    { name: "Cook's Utensils", category: "tools", basePrice: 1, unit: "gp" },
    { name: "Glassblower's Tools", category: "tools", basePrice: 30, unit: "gp" },
    { name: "Jeweler's Tools", category: "tools", basePrice: 25, unit: "gp" },
    { name: "Leatherworker's Tools", category: "tools", basePrice: 5, unit: "gp" },
    { name: "Mason's Tools", category: "tools", basePrice: 10, unit: "gp" },
    { name: "Painter's Supplies", category: "tools", basePrice: 10, unit: "gp" },
    { name: "Potter's Tools", category: "tools", basePrice: 10, unit: "gp" },
    { name: "Smith's Tools", category: "tools", basePrice: 20, unit: "gp" },
    { name: "Tinker's Tools", category: "tools", basePrice: 50, unit: "gp" },
    { name: "Weaver's Tools", category: "tools", basePrice: 1, unit: "gp" },
    { name: "Woodcarver's Tools", category: "tools", basePrice: 1, unit: "gp" },
    { name: "Disguise Kit", category: "tools", basePrice: 25, unit: "gp" },
    { name: "Forgery Kit", category: "tools", basePrice: 15, unit: "gp" },
    { name: "Dice Set", category: "tools", basePrice: 1, unit: "gp" },
    { name: "Playing Card Set", category: "tools", basePrice: 0.2, unit: "gp" },
    { name: "Herbalism Kit", category: "tools", basePrice: 5, unit: "gp" },
    { name: "Healer's Kit", category: "tools", basePrice: 5, unit: "gp" },
    { name: "Medicine Kit", category: "tools", basePrice: 10, unit: "gp" },
    { name: "Poisoner's Kit", category: "tools", basePrice: 50, unit: "gp" },
    { name: "Thieves' Tools", category: "tools", basePrice: 25, unit: "gp" },
    { name: "Navigation Tools", category: "tools", basePrice: 25, unit: "gp" },
    { name: "Land Vehicle", category: "tools", basePrice: 50, unit: "gp" },
    
    // MOUNTS & VEHICLES
    { name: "Horse, Draft", category: "mounts", basePrice: 25, unit: "gp" },
    { name: "Horse, Riding", category: "mounts", basePrice: 75, unit: "gp" },
    { name: "Mule", category: "mounts", basePrice: 8, unit: "gp" },
    { name: "Pony", category: "mounts", basePrice: 30, unit: "gp" },
    { name: "Warhorse", category: "mounts", basePrice: 400, unit: "gp" },
    { name: "Camel", category: "mounts", basePrice: 50, unit: "gp" },
    { name: "Elephant", category: "mounts", basePrice: 200, unit: "gp" },
    { name: "Griffon", category: "mounts", basePrice: 500, unit: "gp" },
    { name: "Pegasus", category: "mounts", basePrice: 1000, unit: "gp" },
    { name: "Cart", category: "mounts", basePrice: 15, unit: "gp" },
    { name: "Chariot", category: "mounts", basePrice: 250, unit: "gp" },
    { name: "Carriage", category: "mounts", basePrice: 100, unit: "gp" },
    { name: "Saddle, Military", category: "mounts", basePrice: 20, unit: "gp" },
    { name: "Saddle, Riding", category: "mounts", basePrice: 10, unit: "gp" },
    { name: "Saddlebags", category: "mounts", basePrice: 4, unit: "gp" },
    { name: "Sled", category: "mounts", basePrice: 20, unit: "gp" },
    { name: "Stabling (per day)", category: "mounts", basePrice: 0.5, unit: "gp" },
    { name: "Feed (per day)", category: "mounts", basePrice: 0.05, unit: "gp" },
    
    // TRADE GOODS
    { name: "Ale (gallon)", category: "trade-goods", basePrice: 0.2, unit: "gp" },
    { name: "Bread (loaf)", category: "trade-goods", basePrice: 0.02, unit: "gp" },
    { name: "Cheese (wedge)", category: "trade-goods", basePrice: 0.1, unit: "gp" },
    { name: "Chicken", category: "trade-goods", basePrice: 0.2, unit: "gp" },
    { name: "Fish, Fresh", category: "trade-goods", basePrice: 0.1, unit: "gp" },
    { name: "Meat, Chunk", category: "trade-goods", basePrice: 0.3, unit: "gp" },
    { name: "Wine (bottle)", category: "trade-goods", basePrice: 2, unit: "gp" },
    { name: "Wine, Fine (bottle)", category: "trade-goods", basePrice: 10, unit: "gp" },
    { name: "Salt (pound)", category: "trade-goods", basePrice: 0.5, unit: "gp" },
    { name: "Spices (pound)", category: "trade-goods", basePrice: 5, unit: "gp" },
    { name: "Sugar (pound)", category: "trade-goods", basePrice: 0.2, unit: "gp" },
    { name: "Flour (pound)", category: "trade-goods", basePrice: 0.01, unit: "gp" },
    { name: "Grain (bushel)", category: "trade-goods", basePrice: 0.5, unit: "gp" },
    { name: "Hay (bale)", category: "trade-goods", basePrice: 0.1, unit: "gp" },
    { name: "Wood (cord)", category: "trade-goods", basePrice: 1, unit: "gp" },
    { name: "Coal (bag)", category: "trade-goods", basePrice: 0.5, unit: "gp" },
    { name: "Iron (pound)", category: "trade-goods", basePrice: 0.1, unit: "gp" },
    { name: "Steel (pound)", category: "trade-goods", basePrice: 0.5, unit: "gp" },
    { name: "Copper (pound)", category: "trade-goods", basePrice: 0.05, unit: "gp" },
    { name: "Silver (pound)", category: "trade-goods", basePrice: 5, unit: "gp" },
    { name: "Gold (pound)", category: "trade-goods", basePrice: 50, unit: "gp" },
    { name: "Platinum (pound)", category: "trade-goods", basePrice: 500, unit: "gp" },
    { name: "Gemstones (100gp)", category: "trade-goods", basePrice: 100, unit: "gp" },
    { name: "Gemstones (500gp)", category: "trade-goods", basePrice: 500, unit: "gp" },
    { name: "Gemstones (1000gp)", category: "trade-goods", basePrice: 1000, unit: "gp" },
    { name: "Art Object (25gp)", category: "trade-goods", basePrice: 25, unit: "gp" },
    { name: "Art Object (250gp)", category: "trade-goods", basePrice: 250, unit: "gp" },
    { name: "Art Object (750gp)", category: "trade-goods", basePrice: 750, unit: "gp" },
    { name: "Silk (yard)", category: "trade-goods", basePrice: 10, unit: "gp" },
    { name: "Velvet (yard)", category: "trade-goods", basePrice: 20, unit: "gp" },
    { name: "Linen (yard)", category: "trade-goods", basePrice: 1, unit: "gp" },
    { name: "Wool (yard)", category: "trade-goods", basePrice: 0.5, unit: "gp" },
    { name: "Leather (square yard)", category: "trade-goods", basePrice: 1, unit: "gp" },
    { name: "Fur (pelt)", category: "trade-goods", basePrice: 5, unit: "gp" },
    { name: "Dragon Scale", category: "trade-goods", basePrice: 100, unit: "gp" },
    { name: "Phoenix Feather", category: "trade-goods", basePrice: 250, unit: "gp" },
    { name: "Unicorn Horn", category: "trade-goods", basePrice: 1000, unit: "gp" },
    
    // CONSUMABLES
    { name: "Potion of Healing", category: "consumables", basePrice: 50, unit: "gp" },
    { name: "Potion of Greater Healing", category: "consumables", basePrice: 150, unit: "gp" },
    { name: "Potion of Superior Healing", category: "consumables", basePrice: 500, unit: "gp" },
    { name: "Potion of Supreme Healing", category: "consumables", basePrice: 1000, unit: "gp" },
    { name: "Potion of Invisibility", category: "consumables", basePrice: 300, unit: "gp" },
    { name: "Potion of Flying", category: "consumables", basePrice: 400, unit: "gp" },
    { name: "Potion of Fire Breath", category: "consumables", basePrice: 100, unit: "gp" },
    { name: "Potion of Climbing", category: "consumables", basePrice: 100, unit: "gp" },
    { name: "Potion of Water Breathing", category: "consumables", basePrice: 100, unit: "gp" },
    { name: "Elixir of Health", category: "consumables", basePrice: 500, unit: "gp" },
    { name: "Oil of Slipperiness", category: "consumables", basePrice: 500, unit: "gp" },
    { name: "Oil of Etherealness", category: "consumables", basePrice: 1000, unit: "gp" },
    { name: "Antidote", category: "consumables", basePrice: 50, unit: "gp" },
    { name: "Antitoxin", category: "consumables", basePrice: 50, unit: "gp" },
    { name: "Alchemist's Fire", category: "consumables", basePrice: 50, unit: "gp" },
    { name: "Acid", category: "consumables", basePrice: 25, unit: "gp" },
    { name: "Holy Water", category: "consumables", basePrice: 25, unit: "gp" },
    { name: "Flask of Oil", category: "consumables", basePrice: 0.1, unit: "gp" },
    { name: "Scroll of Protection", category: "consumables", basePrice: 500, unit: "gp" },
    { name: "Spell Scroll (Cantrip)", category: "consumables", basePrice: 25, unit: "gp" },
    { name: "Spell Scroll (1st Level)", category: "consumables", basePrice: 50, unit: "gp" },
    { name: "Spell Scroll (2nd Level)", category: "consumables", basePrice: 150, unit: "gp" },
    { name: "Spell Scroll (3rd Level)", category: "consumables", basePrice: 300, unit: "gp" },
    { name: "Spell Scroll (4th Level)", category: "consumables", basePrice: 500, unit: "gp" },
    { name: "Spell Scroll (5th Level)", category: "consumables", basePrice: 1000, unit: "gp" },
    
    // MAGIC ITEMS (Common-Uncommon)
    { name: "Bag of Holding", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Cloak of Protection", category: "magic-items", basePrice: 1000, unit: "gp" },
    { name: "Ring of Protection", category: "magic-items", basePrice: 1000, unit: "gp" },
    { name: "Wand of Magic Missiles", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Wand of Secrets", category: "magic-items", basePrice: 300, unit: "gp" },
    { name: "Staff of Power", category: "magic-items", basePrice: 5000, unit: "gp" },
    { name: "Amulet of Health", category: "magic-items", basePrice: 2000, unit: "gp" },
    { name: "Boots of Speed", category: "magic-items", basePrice: 1500, unit: "gp" },
    { name: "Bracers of Defense", category: "magic-items", basePrice: 1500, unit: "gp" },
    { name: "Cloak of Elvenkind", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Gloves of Thievery", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Hat of Disguise", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Headband of Intellect", category: "magic-items", basePrice: 2000, unit: "gp" },
    { name: "Necklace of Fireballs", category: "magic-items", basePrice: 1500, unit: "gp" },
    { name: "Pearl of Power", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Ring of Jumping", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Ring of Swimming", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Ring of Warmth", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Rope of Climbing", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Sentinel Shield", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Slippers of Spider Climbing", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Stone of Good Luck", category: "magic-items", basePrice: 500, unit: "gp" },
    { name: "Weapon, +1", category: "magic-items", basePrice: 1000, unit: "gp" },
    { name: "Weapon, +2", category: "magic-items", basePrice: 5000, unit: "gp" },
    { name: "Weapon, +3", category: "magic-items", basePrice: 15000, unit: "gp" },
    { name: "Armor, +1", category: "magic-items", basePrice: 1000, unit: "gp" },
    { name: "Armor, +2", category: "magic-items", basePrice: 5000, unit: "gp" },
    { name: "Armor, +3", category: "magic-items", basePrice: 15000, unit: "gp" },
    { name: "Dragon Slayer Sword", category: "magic-items", basePrice: 3000, unit: "gp" },
    { name: "Flame Tongue", category: "magic-items", basePrice: 2000, unit: "gp" },
    { name: "Frost Brand", category: "magic-items", basePrice: 2000, unit: "gp" },
    { name: "Holy Avenger", category: "magic-items", basePrice: 20000, unit: "gp" },
    { name: "Vorpal Sword", category: "magic-items", basePrice: 25000, unit: "gp" },
];

const STORAGE_KEY = 'dnd_economy_full_data';
const FLUCTUATION_PERCENT = 15;
const UPDATE_INTERVAL = 15 * 60 * 1000;

// Initialize economy data
function initEconomy() {
    let economyData = localStorage.getItem(STORAGE_KEY);
    
    if (!economyData) {
        economyData = {
            lastUpdate: Date.now(),
            items: dndItems.map(item => ({
                ...item,
                currentPrice: item.basePrice,
                previousPrice: item.basePrice,
                changePercent: 0,
                priceHistory: Array(7).fill(item.basePrice)
            }))
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(economyData));
    } else {
        economyData = JSON.parse(economyData);
    }
    
    return economyData;
}

// Calculate new prices
function fluctuatePrices(economyData) {
    economyData.items = economyData.items.map(item => {
        const fluctuation = (Math.random() * 2 - 1) * (FLUCTUATION_PERCENT / 100);
        const newPrice = item.basePrice * (1 + fluctuation);
        const changePercent = ((newPrice - item.currentPrice) / item.currentPrice) * 100;
        
        // Update price history (7-day trend)
        const newHistory = [...item.priceHistory.slice(1), newPrice];
        
        return {
            ...item,
            previousPrice: item.currentPrice,
            currentPrice: Math.max(0.01, parseFloat(newPrice.toFixed(2))),
            changePercent: parseFloat(changePercent.toFixed(2)),
            priceHistory: newHistory
        };
    });
    
    economyData.lastUpdate = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(economyData));
    
    return economyData;
}

// Format price
function formatPrice(price, unit) {
    if (price < 0.01) {
        return `${(price * 100).toFixed(0)} cp`;
    } else if (unit === 'cp') {
        return `${price.toFixed(0)} cp`;
    } else if (unit === 'sp') {
        return `${price.toFixed(2)} sp`;
    } else {
        if (price >= 1000) {
            return `${(price / 1000).toFixed(2)}k gp`;
        }
        return `${price.toFixed(2)} gp`;
    }
}

// Get change indicator
function getChangeHTML(changePercent) {
    if (changePercent > 0.5) {
        return `<span class="change-cell up">▲ +${changePercent.toFixed(2)}%</span>`;
    } else if (changePercent < -0.5) {
        return `<span class="change-cell down">▼ ${changePercent.toFixed(2)}%</span>`;
    } else {
        return `<span class="change-cell stable">● 0%</span>`;
    }
}

// Get trend bar
function getTrendBar(priceHistory) {
    const min = Math.min(...priceHistory);
    const max = Math.max(...priceHistory);
    const range = max - min || 1;
    const current = priceHistory[priceHistory.length - 1];
    const position = ((current - min) / range) * 100;
    
    return `<div class="trend-bar"><div class="trend-fill" style="width: ${position}%;"></div></div>`;
}

// Render table
function renderTable(items) {
    const tbody = document.getElementById('items-table-body');
    if (!tbody) return;
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px;">No items found</td></tr>';
        return;
    }
    
    tbody.innerHTML = items.map(item => `
        <tr>
            <td class="item-name-cell">${item.name}</td>
            <td class="item-category">${item.category}</td>
            <td class="price-cell">${formatPrice(item.basePrice, item.unit)}</td>
            <td class="price-cell">${formatPrice(item.currentPrice, item.unit)}</td>
            <td>${getChangeHTML(item.changePercent)}</td>
            <td>${getTrendBar(item.priceHistory)}</td>
        </tr>
    `).join('');
}

// Update overview stats
function updateOverview(economyData) {
    const items = economyData.items;
    const up = items.filter(i => i.changePercent > 0.5).length;
    const down = items.filter(i => i.changePercent < -0.5).length;
    const stable = items.length - up - down;
    
    document.getElementById('total-items').textContent = items.length;
    document.getElementById('items-up').textContent = up;
    document.getElementById('items-down').textContent = down;
    document.getElementById('items-stable').textContent = stable;
    
    // Market status
    const avgChange = items.reduce((sum, i) => sum + i.changePercent, 0) / items.length;
    const statusEl = document.getElementById('market-status');
    if (avgChange > 1) {
        statusEl.innerHTML = '<span class="dot" style="background: #4caf50;"></span><span class="text">Bullish</span>';
    } else if (avgChange < -1) {
        statusEl.innerHTML = '<span class="dot" style="background: #f44336;"></span><span class="text">Bearish</span>';
    } else {
        statusEl.innerHTML = '<span class="dot" style="background: #888;"></span><span class="text">Stable</span>';
    }
    
    // Countdown
    const timeSince = Date.now() - economyData.lastUpdate;
    const minutesLeft = Math.max(0, 15 - Math.floor(timeSince / 60000));
    const secondsLeft = 59 - Math.floor((timeSince % 60000) / 1000);
    document.getElementById('countdown').textContent = 
        `${minutesLeft.toString().padStart(2, '0')}:${secondsLeft.toString().padStart(2, '0')}`;
}

// Update analysis
function updateAnalysis(economyData) {
    const items = [...economyData.items].sort((a, b) => b.changePercent - a.changePercent);
    
    // Hot items (top 5 gainers)
    const hotItems = items.slice(0, 5);
    document.getElementById('hot-items').innerHTML = hotItems.map(item => 
        `<li><span>${item.name}</span><span class="up">+${item.changePercent.toFixed(2)}%</span></li>`
    ).join('');
    
    // Cold items (bottom 5 losers)
    const coldItems = items.slice(-5).reverse();
    document.getElementById('cold-items').innerHTML = coldItems.map(item => 
        `<li><span>${item.name}</span><span class="down">${item.changePercent.toFixed(2)}%</span></li>`
    ).join('');
    
    // Market insights
    const avgChange = items.reduce((sum, i) => sum + i.changePercent, 0) / items.length;
    const mostVolatile = [...items].sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent))[0];
    const expensiveItem = [...items].sort((a, b) => b.currentPrice - a.currentPrice)[0];
    
    document.getElementById('market-insights').innerHTML = `
        <li><span>Avg Market Change:</span><span>${avgChange > 0 ? '+' : ''}${avgChange.toFixed(2)}%</span></li>
        <li><span>Most Volatile:</span><span>${mostVolatile.name}</span></li>
        <li><span>Highest Priced:</span><span>${expensiveItem.name}</span></li>
    `;
}

// Filter and sort
function filterAndSort(economyData) {
    let items = [...economyData.items];
    
    // Search filter
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    if (searchTerm) {
        items = items.filter(item => item.name.toLowerCase().includes(searchTerm));
    }
    
    // Category filter
    const category = document.getElementById('category-filter').value;
    if (category !== 'all') {
        items = items.filter(item => item.category === category);
    }
    
    // Sort
    const sortBy = document.getElementById('sort-filter').value;
    switch(sortBy) {
        case 'name':
            items.sort((a, b) => a.name.localeCompare(b.name));
            break;
        case 'price-low':
            items.sort((a, b) => a.currentPrice - b.currentPrice);
            break;
        case 'price-high':
            items.sort((a, b) => b.currentPrice - a.currentPrice);
            break;
        case 'change-up':
            items.sort((a, b) => b.changePercent - a.changePercent);
            break;
        case 'change-down':
            items.sort((a, b) => a.changePercent - b.changePercent);
            break;
    }
    
    return items;
}

// Force update
function forceEconomyUpdate() {
    const economyData = initEconomy();
    const updatedData = fluctuatePrices(economyData);
    renderFullPage(updatedData);
}

// Render full page
function renderFullPage(economyData) {
    const filteredItems = filterAndSort(economyData);
    renderTable(filteredItems);
    updateOverview(economyData);
    updateAnalysis(economyData);
}

// Check and update
function checkAndUpdateEconomy() {
    const economyData = initEconomy();
    const timeSince = Date.now() - economyData.lastUpdate;
    
    if (timeSince >= UPDATE_INTERVAL) {
        const updatedData = fluctuatePrices(economyData);
        renderFullPage(updatedData);
    } else {
        renderFullPage(economyData);
    }
    
    // Update countdown every second
    updateOverview(economyData);
    setTimeout(checkAndUpdateEconomy, 1000);
}

// Sort table by column
function sortTable(column) {
    const economyData = initEconomy();
    let items = filterAndSort(economyData);
    
    switch(column) {
        case 'name':
            items.sort((a, b) => a.name.localeCompare(b.name));
            document.getElementById('sort-filter').value = 'name';
            break;
        case 'category':
            items.sort((a, b) => a.category.localeCompare(b.category));
            break;
        case 'basePrice':
            items.sort((a, b) => a.basePrice - b.basePrice);
            document.getElementById('sort-filter').value = 'price-low';
            break;
        case 'currentPrice':
            items.sort((a, b) => a.currentPrice - b.currentPrice);
            document.getElementById('sort-filter').value = 'price-low';
            break;
        case 'changePercent':
            items.sort((a, b) => a.changePercent - b.changePercent);
            document.getElementById('sort-filter').value = 'change-down';
            break;
    }
    
    renderTable(items);
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    
    document.getElementById('search-input').addEventListener('input', () => {
        const economyData = initEconomy();
        renderFullPage(economyData);
    });
    
    document.getElementById('category-filter').addEventListener('change', () => {
        const economyData = initEconomy();
        renderFullPage(economyData);
    });
    
    document.getElementById('sort-filter').addEventListener('change', () => {
        const economyData = initEconomy();
        renderFullPage(economyData);
    });
    
    checkAndUpdateEconomy();
});
