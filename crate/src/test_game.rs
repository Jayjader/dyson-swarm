use COLLECTOR_ELECTRICITY_PRODUCTION;
use MINER_ELECTRICITY_CONSUMPTION;
use MINER_ORE_PRODUCTION;

use Building;
use Resource;
use State;

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

    assert_eq!(
        state.buildings.collectors.building,
        Building::SolarCollector
    );
    assert_eq!(state.buildings.miners.building, Building::Miner);
    assert_eq!(state.buildings.refiners.building, Building::Refiner);
    assert_eq!(
        state.buildings.satellite_factories.building,
        Building::SatelliteFactory
    );
    assert_eq!(state.buildings.launchers.building, Building::Launcher);
    assert_eq!(state.buildings.collectors.count, 0);
    assert_eq!(state.buildings.miners.count, 0);
    assert_eq!(state.buildings.refiners.count, 0);
    assert_eq!(state.buildings.satellite_factories.count, 0);
    assert_eq!(state.buildings.launchers.count, 0);
}

#[test]
fn test_new_game_state() {
    use new_game_state;
    let state = new_game_state();
    assert_eq!(state.resources.electricity.resource, Resource::Electricity);
    assert_eq!(state.resources.ore.resource, Resource::Ore);
    assert_eq!(state.resources.metal.resource, Resource::Metal);
    assert_eq!(state.resources.satellites.resource, Resource::Satellite);
    assert_eq!(state.resources.electricity.count, 0);
    assert_eq!(state.resources.ore.count, 0);
    assert_eq!(state.resources.metal.count, 0);
    assert_eq!(state.resources.satellites.count, 0);

    assert_eq!(
        state.buildings.collectors.building,
        Building::SolarCollector
    );
    assert_eq!(state.buildings.miners.building, Building::Miner);
    assert_eq!(state.buildings.refiners.building, Building::Refiner);
    assert_eq!(
        state.buildings.satellite_factories.building,
        Building::SatelliteFactory
    );
    assert_eq!(state.buildings.launchers.building, Building::Launcher);
    assert_eq!(state.buildings.collectors.count, 1);
    assert_eq!(state.buildings.miners.count, 1);
    assert_eq!(state.buildings.refiners.count, 1);
    assert_eq!(state.buildings.satellite_factories.count, 0);
    assert_eq!(state.buildings.launchers.count, 0);
}

#[test]
fn test_add_collector() {
    let state = State::new();
    let post_action_state = state.add_collector();
    assert_eq!(post_action_state.buildings.collectors.count, 1);
    assert_eq!(
        post_action_state.buildings.collectors.building,
        Building::SolarCollector
    );
}

#[test]
fn test_add_miner() {
    let state = State::new();
    let post_action_state = state.add_miner();
    assert_eq!(post_action_state.buildings.miners.count, 1);
    assert_eq!(post_action_state.buildings.miners.building, Building::Miner);
}

#[test]
fn test_add_refiner() {
    let state = State::new().add_refiner();
    assert_eq!(state.buildings.refiners.count, 1);
    assert_eq!(state.buildings.refiners.building, Building::Refiner);
}

#[test]
fn test_add_satellite_factory() {
    let state = State::new().add_satellite_factory();
    assert_eq!(state.buildings.satellite_factories.count, 1);
    assert_eq!(
        state.buildings.satellite_factories.building,
        Building::SatelliteFactory
    );
}

#[test]
fn test_add_launcher() {
    let state = State::new().add_launcher();
    assert_eq!(state.buildings.launchers.count, 1);
    assert_eq!(state.buildings.launchers.building, Building::Launcher);
}

#[test]
fn test_tick() {
    let state = State::new().add_collector().tick();
    assert_eq!(
        state.resources.electricity.count,
        COLLECTOR_ELECTRICITY_PRODUCTION
    );

    let state = state.add_miner().tick();
    assert_eq!(
        state.resources.electricity.count,
        COLLECTOR_ELECTRICITY_PRODUCTION * 2
    );

    let state = &mut State::new().add_collector().add_miner();
    for _i in 0..MINER_ELECTRICITY_CONSUMPTION - 1 {
        *state = state.tick();
    }
    assert_eq!(
        state.resources.electricity.count,
        MINER_ELECTRICITY_CONSUMPTION - 1
    );
    *state = state.tick();
    assert_eq!(state.resources.electricity.count, 0);
}
