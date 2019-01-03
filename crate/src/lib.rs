#[macro_use]
extern crate cfg_if;
extern crate web_sys;
extern crate wasm_bindgen;

use wasm_bindgen::prelude::*;

cfg_if! {
    // When the `console_error_panic_hook` feature is enabled, we can call the
    // `set_panic_hook` function to get better error messages if we ever panic.
    if #[cfg(feature = "console_error_panic_hook")] {
        extern crate console_error_panic_hook;
        use console_error_panic_hook::set_once as set_panic_hook;
    } else {
        #[inline]
        fn set_panic_hook() {}
    }
}

cfg_if! {
    // When the `wee_alloc` feature is enabled, use `wee_alloc` as the global
    // allocator.
    if #[cfg(feature = "wee_alloc")] {
        extern crate wee_alloc;
        #[global_allocator]
        static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;
    }
}

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
        return State { ..self };
    }
}


#[cfg(test)]
mod test {
    use State;
    use Resource;
    use Building;

    #[test]
    fn test_state_new() {
        let state = State::new();
        assert_eq!(state.resources.electricity.resource, Resource::Electricity);
        assert_eq!(state.resources.ore.resource, Resource::Ore);
        assert_eq!(state.resources.metal.resource, Resource::Metal);
        assert_eq!(state.resources.satellites.resource, Resource::Satellite);
        assert_eq!(state.resources.electricity.count, 0);
        assert_eq!(state.resources.ore.count, 0);
        assert_eq!(state.resources.metal.count, 0);
        assert_eq!(state.resources.satellites.count, 0);

        assert_eq!(state.buildings.collectors.building, Building::SolarCollector);
        assert_eq!(state.buildings.miners.building, Building::Miner);
        assert_eq!(state.buildings.refiners.building, Building::Refiner);
        assert_eq!(state.buildings.satellite_factories.building, Building::SatelliteFactory);
        assert_eq!(state.buildings.launchers.building, Building::Launcher);
        assert_eq!(state.buildings.collectors.count, 0);
        assert_eq!(state.buildings.miners.count, 0);
        assert_eq!(state.buildings.refiners.count, 0);
        assert_eq!(state.buildings.satellite_factories.count, 0);
        assert_eq!(state.buildings.launchers.count, 0);
    }

    #[test]
    fn test_add_collector() {
        let state = State::new();
        let post_action_state = state.add_collector();
        assert_eq!(post_action_state.buildings.collectors.count, 1);
    }
}
