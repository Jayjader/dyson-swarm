use wasm_bindgen::prelude::*;

pub const REFINER_ELECTRICITY_CONSUMPTION: u32 = 50;
pub const REFINER_ORE_CONSUMPTION: u32 = 5;
pub const REFINER_METAL_PRODUCTION: u32 = 1;
pub const MINER_ELECTRICITY_CONSUMPTION: u32 = 15;
pub const MINER_ORE_PRODUCTION: u32 = 3;
pub const COLLECTOR_ELECTRICITY_PRODUCTION: u32 = 1;
pub const SATELLITE_FACTORY_ELECTRICITY_CONSUMPTION: u32 = 45;
pub const SATELLITE_FACTORY_METAL_CONSUMPTION: u32 = 15;

#[wasm_bindgen]
#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
pub enum Resource {
    Electricity,
    Ore,
    Metal,
    Satellite,
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
pub enum Building {
    SolarCollector,
    Miner,
    Refiner,
    SatelliteFactory,
    Launcher,
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
pub struct StateResources {
    pub electricity: u32,
    pub ore: u32,
    pub metal: u32,
    pub satellites: u32,
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
pub struct StateBuildings {
    pub collectors: u32,
    pub miners: u32,
    pub refiners: u32,
    pub satellite_factories: u32,
    pub launchers: u32,
}

impl StateBuildings {
    pub fn new() -> StateBuildings {
        StateBuildings {
            collectors: 0,
            miners: 0,
            refiners: 0,
            satellite_factories: 0,
            launchers: 0,
        }
    }
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
pub struct State {
    pub resources: StateResources,
    pub buildings: StateBuildings,
}

#[wasm_bindgen]
impl State {
    #[wasm_bindgen(constructor)]
    pub fn new() -> State {
        State {
            resources: StateResources {
                electricity: 0,
                ore: 0,
                metal: 0,
                satellites: 0,
            },
            buildings: StateBuildings {
                collectors: 0,
                miners: 0,
                refiners: 0,
                satellite_factories: 0,
                launchers: 0,
            },
        }
    }

    pub fn add_collector(self) -> State {
        return State {
            buildings: StateBuildings {
                collectors: self.buildings.collectors + 1,
                ..self.buildings
            },
            resources: self.resources,
        };
    }
    pub fn add_miner(self) -> State {
        return State {
            buildings: StateBuildings {
                miners: self.buildings.miners + 1,
                ..self.buildings
            },
            resources: self.resources,
        };
    }

    pub fn add_refiner(self) -> State {
        return State {
            buildings: StateBuildings {
                refiners: self.buildings.refiners + 1,
                ..self.buildings
            },
            resources: self.resources,
        };
    }

    pub fn add_satellite_factory(self) -> State {
        return State {
            buildings: StateBuildings {
                satellite_factories: self.buildings.satellite_factories + 1,
                ..self.buildings
            },
            resources: self.resources,
        };
    }

    pub fn add_launcher(self) -> State {
        return State {
            buildings: StateBuildings {
                launchers: self.buildings.launchers + 1,
                ..self.buildings
            },
            resources: self.resources,
        };
    }

    #[wasm_bindgen]
    pub fn tick(&self) -> State {
        let metal_budget = &mut self.resources.metal.clone();
        let ore_budget = &mut self.resources.ore.clone();
        let electricity_budget = &mut self.resources.electricity.clone();
        let mut satellites_produced = 0;

        *electricity_budget += self.buildings.collectors * COLLECTOR_ELECTRICITY_PRODUCTION;

        for _i in 0..self.buildings.satellite_factories {
            if *metal_budget >= SATELLITE_FACTORY_METAL_CONSUMPTION
                && *electricity_budget >= SATELLITE_FACTORY_ELECTRICITY_CONSUMPTION
            {
                satellites_produced += 1;
                *electricity_budget -= SATELLITE_FACTORY_ELECTRICITY_CONSUMPTION;
                *metal_budget -= SATELLITE_FACTORY_METAL_CONSUMPTION;
            }
        }

        for _i in 0..self.buildings.refiners {
            if *ore_budget >= REFINER_ORE_CONSUMPTION
                && *electricity_budget >= REFINER_ELECTRICITY_CONSUMPTION
            {
                *metal_budget += REFINER_METAL_PRODUCTION;
                *electricity_budget -= REFINER_ELECTRICITY_CONSUMPTION;
                *ore_budget -= REFINER_ORE_CONSUMPTION;
            } else {
                break;
            }
        }

        for _i in 0..self.buildings.miners {
            if *electricity_budget >= MINER_ELECTRICITY_CONSUMPTION {
                *ore_budget += MINER_ORE_PRODUCTION;
                *electricity_budget -= MINER_ELECTRICITY_CONSUMPTION;
            }
        }

        return State {
            resources: StateResources {
                electricity: *electricity_budget,
                ore: *ore_budget,
                metal: *metal_budget,
                satellites: self.resources.satellites + satellites_produced,
            },
            buildings: self.buildings,
        };
    }
}
