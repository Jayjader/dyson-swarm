#[macro_use]
extern crate cfg_if;
#[macro_use]
extern crate serde_derive;
extern crate serde_json;
extern crate wasm_bindgen;
extern crate web_sys;

use wasm_bindgen::prelude::*;

use game::*;

pub mod game;

mod test_game;

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
impl State {
    pub fn collector_count(&self) -> String {
        format!("{}", self.buildings.collectors)
    }
    pub fn miner_count(&self) -> String {
        format!("{}", self.buildings.miners)
    }
    pub fn refiner_count(&self) -> String {
        format!("{}", self.buildings.refiners)
    }
    pub fn satellite_factory_count(&self) -> String {
        format!("{}", self.buildings.satellite_factories)
    }
    pub fn launcher_count(&self) -> String {
        format!("{}", self.buildings.launchers)
    }
    pub fn electricity_count(&self) -> String {
        format!("{}", self.resources.electricity)
    }
    pub fn ore_count(&self) -> String {
        format!("{}", self.resources.ore)
    }
    pub fn metal_count(&self) -> String {
        format!("{}", self.resources.metal)
    }
    pub fn satellite_count(&self) -> String {
        format!("{}", self.resources.satellites)
    }
}

#[wasm_bindgen]
pub fn new_game_state() -> State {
    set_panic_hook();
    return State {
        buildings: Buildings {
            collectors: 1,
            miners: 0,
            refiners: 0,
            satellite_factories: 0,
            launchers: 0,
        },
        resources: Resources {
            electricity: 500,
            ore: 0,
            metal: 200,
            satellites: 0,
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
