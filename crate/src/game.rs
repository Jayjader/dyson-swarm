#[derive(Debug, Hash, Eq, PartialEq)]
pub enum Resource {
    Electricity,
    Ore,
    Metal,
    Satellite,
}
#[derive(Debug, Hash, Eq, PartialEq)]
pub enum Building {
    SolarCollector,
    Miner,
    Refiner,
    SatelliteFactory,
    Launcher,
}

pub struct ResourceCount(Resource, u64);
pub struct BuildingCount(Building, u64);

pub struct StateResources {
    pub electricity: ResourceCount,
    pub ore: ResourceCount,
    pub metal: ResourceCount,
    pub satellites: ResourceCount,
}
pub struct StateBuildings {
    pub collectors: BuildingCount,
    pub miners: BuildingCount,
    pub refiners: BuildingCount,
    pub satellite_factories: BuildingCount,
}
pub struct State {
    pub resources: StateResources,
    pub buildings: StateBuildings,
}
impl State {
    pub fn new() -> State {
        State {
            resources: StateResources {
                electricity: ResourceCount(Resource::Electricity, 0),
                ore: ResourceCount(Resource::Ore, 0),
                metal: ResourceCount(Resource::Metal, 0),
                satellites: ResourceCount(Resource::Satellite, 0),
            },
            buildings: StateBuildings {
                collectors: BuildingCount(Building::SolarCollector, 0),
                miners: BuildingCount(Building::SolarCollector, 0),
                refiners: BuildingCount(Building::Refiner, 0),
                satellite_factories: BuildingCount(Building::SatelliteFactory, 0),
            },
        }
    }
}
