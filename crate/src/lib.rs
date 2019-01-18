#[macro_use]
extern crate cfg_if;
extern crate wasm_bindgen;
extern crate web_sys;
#[macro_use]
extern crate serde_derive;
extern crate serde_json;

use wasm_bindgen::prelude::*;

pub mod game;

mod test_game;

use game::*;

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
pub fn new_game_state() -> State {
    return State {
        buildings: StateBuildings {
            collectors: BuildingCount {
                building: Building::SolarCollector,
                count: 1,
            },
            miners: BuildingCount {
                building: Building::Miner,
                count: 1,
            },
            refiners: BuildingCount {
                building: Building::Refiner,
                count: 1,
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
    };
}

#[wasm_bindgen]
pub fn serialize_game_state(state: &State) -> String {
    return serde_json::to_string(state).unwrap();
}

#[wasm_bindgen]
pub fn deserialize_game_state(s: &str) -> State {
    return serde_json::from_str(s).unwrap();
}
