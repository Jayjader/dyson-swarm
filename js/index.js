import { h, render, Component } from 'preact';
import 'preact/devtools';

import {ResourcesDisplay} from './displays/Resources.js';
import {BuildingsDisplay} from './displays/Buildings.js';
import {SwarmDisplay} from './displays/Swarm.js';

import("../crate/pkg").then(wasm => {
    let {
        State,
        Resource,
        Building,
    } = wasm;

    class Game extends Component {
        constructor(props) {
            super(props);
            this.state = {
                game: new State(),
            };
        }

        buildCollector = () => {
            this.setState(prevState => ({game: prevState.game.add_collector()}));
        }

        buildMiner = () => {
            this.setState(prevState => ({game: prevState.game.add_miner()}));
        }

        buildRefiner = () => {
            this.setState(prevState => ({game: prevState.game.add_refiner()}));
        }

        buildSatelliteFactory = () => {
            this.setState(prevState => ({game: prevState.game.add_satellite_factory()}));
        }

        buildLauncher = () => {
            this.setState(prevState => ({game: prevState.game.add_launcher()}));
        }

        render() {
            return <div class="game-content">
                <div class="tables">
                    <ResourcesDisplay resources={this.state.game.resources}/>
                    <BuildingsDisplay buildings={this.state.game.buildings}/>
                    <SwarmDisplay swarm={{count: 0}}/>
            </div>
            <div class="actions">
                <button type="button"
                    onClick={this.buildCollector}
                >
                    Build Solar Collector (5 Metal)
                </button>
                <button type="button"
                    onClick={this.buildMiner}
                >
                    Build Miner (8 Metal)
                </button>
                <button type="button"
                    onClick={this.buildRefiner}
                >
                    Build Refiner (25 Metal)
                </button>
                <button type="button"
                    onClick={this.buildSatelliteFactory}
                >
                    Build Satellite Factory (15 Metal)
                </button>
                <button type="button"
                    onClick={this.buildLauncher}
                >
                    Build Satellite Launcher (10 Metal)
                </button>
            </div>
                </div>;
        }
    }

    render(<Game/>, document.getElementById("app"));
});
