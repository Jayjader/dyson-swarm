use COLLECTOR_ELECTRICITY_PRODUCTION;
use MINER_ELECTRICITY_CONSUMPTION;
use MINER_ORE_PRODUCTION;

use Building;
use Resource;
use State;

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
fn test_add_collector() {
    let state = State::new();
    let post_action_state = state.add_collector();
    assert_eq!(post_action_state.buildings.collectors, 1);
}

#[test]
fn test_add_miner() {
    let state = State::new();
    let post_action_state = state.add_miner();
    assert_eq!(post_action_state.buildings.miners, 1);
}

#[test]
fn test_add_refiner() {
    let state = State::new().add_refiner();
    assert_eq!(state.buildings.refiners, 1);
}

#[test]
fn test_add_satellite_factory() {
    let state = State::new().add_satellite_factory();
    assert_eq!(state.buildings.satellite_factories, 1);
}

#[test]
fn test_add_launcher() {
    let state = State::new().add_launcher();
    assert_eq!(state.buildings.launchers, 1);
}

#[test]
fn test_tick() {
    let state = State::new().add_collector().tick();
    assert_eq!(
        state.resources.electricity,
        COLLECTOR_ELECTRICITY_PRODUCTION
    );

    let state = state.add_miner().tick();
    assert_eq!(
        state.resources.electricity,
        COLLECTOR_ELECTRICITY_PRODUCTION * 2
    );

    let state = &mut State::new().add_collector().add_miner();
    for _i in 0..MINER_ELECTRICITY_CONSUMPTION - 1 {
        *state = state.tick();
    }
    assert_eq!(
        state.resources.electricity,
        MINER_ELECTRICITY_CONSUMPTION - 1
    );
    *state = state.tick();
    assert_eq!(state.resources.electricity, 0);
}
