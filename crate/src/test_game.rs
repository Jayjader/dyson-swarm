use game;
use game::Buildings;
use game::Resources;
use Building;
use Resource;
use State;
use COLLECTOR_ELECTRICITY_PRODUCTION;
use MINER_ELECTRICITY_CONSUMPTION;
use MINER_ORE_PRODUCTION;

#[test]
fn test_state_new() {
    let state = State::new();
    assert_eq!(state.resources.electricity, 0);
    assert_eq!(state.resources.ore, 0);
    assert_eq!(state.resources.metal, 0);
    assert_eq!(state.resources.satellites, 0);

    assert_eq!(state.buildings.collectors, 0);
    assert_eq!(state.buildings.miners, 0);
    assert_eq!(state.buildings.refiners, 0);
    assert_eq!(state.buildings.satellite_factories, 0);
    assert_eq!(state.buildings.launchers, 0);
}

#[test]
fn test_new_game_state() {
    use new_game_state;
    let state = new_game_state();
    assert_eq!(state.resources.electricity, 0);
    assert_eq!(state.resources.ore, 0);
    assert_eq!(state.resources.metal, 0);
    assert_eq!(state.resources.satellites, 0);

    assert_eq!(state.buildings.collectors, 1);
    assert_eq!(state.buildings.miners, 1);
    assert_eq!(state.buildings.refiners, 1);
    assert_eq!(state.buildings.satellite_factories, 0);
    assert_eq!(state.buildings.launchers, 0);
}

#[test]
fn test_build_collector() {
    let mut state = State::new();
    state.resources.metal = game::COLLECTOR_BUILD_COST;
    let post_action_state = state.build_collector();
    assert_eq!(post_action_state.buildings.collectors, 1);
    assert_eq!(post_action_state.resources.metal, 0);
}

#[test]
fn test_build_miner() {
    let mut state = State::new();
    state.resources.metal = game::MINER_BUILD_COST;
    let post_action_state = state.build_miner();
    assert_eq!(post_action_state.buildings.miners, 1);
    assert_eq!(post_action_state.resources.metal, 0);
}

#[test]
fn test_build_refiner() {
    let mut state = State::new();
    state.resources.metal = game::REFINER_BUILD_COST;
    let post_action_state = state.build_refiner();
    assert_eq!(post_action_state.buildings.refiners, 1);
    assert_eq!(post_action_state.resources.metal, 0);
}

#[test]
fn test_build_satellite_factory() {
    let mut state = State::new();
    state.resources.metal = game::SATELLITE_FACTORY_BUILD_COST;
    let post_action_state = state.build_satellite_factory();
    assert_eq!(post_action_state.buildings.satellite_factories, 1);
    assert_eq!(post_action_state.resources.metal, 0);
}

#[test]
fn test_build_launcher() {
    let mut state = State::new();
    state.resources.metal = game::LAUNCHER_BUILD_COST;
    let post_action_state = state.build_launcher();
    assert_eq!(post_action_state.buildings.launchers, 1);
    assert_eq!(post_action_state.resources.metal, 0);
}

#[test]
fn test_tick() {
    let state = State {
        resources: Resources {
            electricity: 0,
            ore: 0,
            metal: 0,
            satellites: 0,
        },
        buildings: Buildings {
            collectors: 1,
            miners: 0,
            refiners: 0,
            satellite_factories: 0,
            launchers: 0,
        },
    }
    .tick();
    assert_eq!(
        state.resources.electricity,
        COLLECTOR_ELECTRICITY_PRODUCTION
    );
}
