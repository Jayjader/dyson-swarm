use serde_derive;
use wasm_bindgen::prelude::*;

pub const REFINER_ELECTRICITY_CONSUMPTION: i32 = 50;
pub const REFINER_ORE_CONSUMPTION: i32 = 5;
pub const REFINER_METAL_PRODUCTION: i32 = 1;
pub const MINER_ELECTRICITY_CONSUMPTION: i32 = 15;
pub const MINER_ORE_PRODUCTION: i32 = 3;
pub const COLLECTOR_ELECTRICITY_PRODUCTION: i32 = 1;
pub const SATELLITE_FACTORY_ELECTRICITY_CONSUMPTION: i32 = 45;
pub const SATELLITE_FACTORY_METAL_CONSUMPTION: i32 = 15;

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
pub struct ResourceCount {
    pub resource: Resource,
    pub count: i32,
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
pub struct BuildingCount {
    pub building: Building,
    pub count: i32,
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
pub struct StateResources {
    pub electricity: ResourceCount,
    pub ore: ResourceCount,
    pub metal: ResourceCount,
    pub satellites: ResourceCount,
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
pub struct StateBuildings {
    pub collectors: BuildingCount,
    pub miners: BuildingCount,
    pub refiners: BuildingCount,
    pub satellite_factories: BuildingCount,
    pub launchers: BuildingCount,
}

impl StateBuildings {
    pub fn new() -> StateBuildings {
        StateBuildings {
            collectors: BuildingCount {
                building: Building::SolarCollector,
                count: 0,
            },
            miners: BuildingCount {
                building: Building::Miner,
                count: 0,
            },
            refiners: BuildingCount {
                building: Building::Refiner,
                count: 0,
            },
            satellite_factories: BuildingCount {
                building: Building::SatelliteFactory,
                count: 0,
            },
            launchers: BuildingCount {
                building: Building::Launcher,
                count: 0,
            },
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
                electricity: ResourceCount {
                    resource: Resource::Electricity,
                    count: 0,
                },
                ore: ResourceCount {
                    resource: Resource::Ore,
                    count: 0,
                },
                metal: ResourceCount {
                    resource: Resource::Metal,
                    count: 0,
                },
                satellites: ResourceCount {
                    resource: Resource::Satellite,
                    count: 0,
                },
            },
            buildings: StateBuildings {
                collectors: BuildingCount {
                    building: Building::SolarCollector,
                    count: 0,
                },
                miners: BuildingCount {
                    building: Building::Miner,
                    count: 0,
                },
                refiners: BuildingCount {
                    building: Building::Refiner,
                    count: 0,
                },
                satellite_factories: BuildingCount {
                    building: Building::SatelliteFactory,
                    count: 0,
                },
                launchers: BuildingCount {
                    building: Building::Launcher,
                    count: 0,
                },
            },
        }
    }

    #[wasm_bindgen]
    pub fn add_collector(self) -> State {
        return State {
            buildings: StateBuildings {
                collectors: BuildingCount {
                    building: Building::SolarCollector,
                    count: self.buildings.collectors.count + 1,
                },
                ..self.buildings
            },
            resources: self.resources,
        };
    }
    #[wasm_bindgen]
    pub fn add_miner(self) -> State {
        return State {
            buildings: StateBuildings {
                miners: BuildingCount {
                    building: Building::Miner,
                    count: self.buildings.miners.count + 1,
                },
                ..self.buildings
            },
            resources: self.resources,
        };
    }

    #[wasm_bindgen]
    pub fn add_refiner(self) -> State {
        return State {
            buildings: StateBuildings {
                refiners: BuildingCount {
                    building: Building::Refiner,
                    count: self.buildings.refiners.count + 1,
                },
                ..self.buildings
            },
            resources: self.resources,
        };
    }

    #[wasm_bindgen]
    pub fn add_satellite_factory(self) -> State {
        return State {
            buildings: StateBuildings {
                satellite_factories: BuildingCount {
                    building: Building::SatelliteFactory,
                    count: self.buildings.satellite_factories.count + 1,
                },
                ..self.buildings
            },
            resources: self.resources,
        };
    }

    #[wasm_bindgen]
    pub fn add_launcher(self) -> State {
        return State {
            buildings: StateBuildings {
                launchers: BuildingCount {
                    building: Building::Launcher,
                    count: self.buildings.launchers.count + 1,
                },
                ..self.buildings
            },
            resources: self.resources,
        };
    }

    #[wasm_bindgen]
    pub fn tick(&self) -> State {
        let metal_budget = &mut self.resources.metal.count.clone();
        let ore_budget = &mut self.resources.ore.count.clone();
        let electricity_budget = &mut self.resources.electricity.count.clone();
        let mut satellites_produced = 0;

        *electricity_budget += self.buildings.collectors.count * COLLECTOR_ELECTRICITY_PRODUCTION;

        for _i in 0..self.buildings.satellite_factories.count {
            if *metal_budget >= SATELLITE_FACTORY_METAL_CONSUMPTION
                && *electricity_budget >= SATELLITE_FACTORY_ELECTRICITY_CONSUMPTION
            {
                satellites_produced += 1;
                *electricity_budget -= SATELLITE_FACTORY_ELECTRICITY_CONSUMPTION;
                *metal_budget -= SATELLITE_FACTORY_METAL_CONSUMPTION;
            }
        }

        for _i in 0..self.buildings.refiners.count {
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

        for _i in 0..self.buildings.miners.count {
            if *electricity_budget >= MINER_ELECTRICITY_CONSUMPTION {
                *ore_budget += MINER_ORE_PRODUCTION;
                *electricity_budget -= MINER_ELECTRICITY_CONSUMPTION;
            }
        }

        return State {
            resources: StateResources {
                electricity: ResourceCount {
                    resource: Resource::Electricity,
                    count: *electricity_budget,
                },
                ore: ResourceCount {
                    resource: Resource::Ore,
                    count: *ore_budget,
                },
                metal: ResourceCount {
                    resource: Resource::Metal,
                    count: *metal_budget,
                },
                satellites: ResourceCount {
                    resource: Resource::Satellite,
                    count: self.resources.satellites.count + satellites_produced,
                },
            },
            buildings: self.buildings,
        };
    }
}
