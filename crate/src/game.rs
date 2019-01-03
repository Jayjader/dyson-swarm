use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Debug, Hash, Eq, PartialEq, Copy, Clone)]
pub enum Resource {
    Electricity,
    Ore,
    Metal,
    Satellite,
}

#[wasm_bindgen]
#[derive(Debug, Hash, Eq, PartialEq, Copy, Clone)]
pub enum Building {
    SolarCollector,
    Miner,
    Refiner,
    SatelliteFactory,
    Launcher,
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub struct ResourceCount {
    pub resource: Resource,
    pub count: u32,
}

#[wasm_bindgen]
#[derive(Debug, Copy, Clone)]
pub struct BuildingCount {
    pub building: Building,
    pub count: u32,
}

#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct StateResources {
    pub electricity: ResourceCount,
    pub ore: ResourceCount,
    pub metal: ResourceCount,
    pub satellites: ResourceCount,
}

#[wasm_bindgen]
#[derive(Copy, Clone)]
pub struct StateBuildings {
    pub collectors: BuildingCount,
    pub miners: BuildingCount,
    pub refiners: BuildingCount,
    pub satellite_factories: BuildingCount,
    pub launchers: BuildingCount,
}

#[wasm_bindgen]
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
    pub fn tick(self) -> State {
        return State { ..self };
    }
}
