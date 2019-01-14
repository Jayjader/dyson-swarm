import {h, render, Component} from 'preact';
import 'preact/devtools';

import {ResourcesDisplay} from './displays/Resources.js';
import {BuildingsDisplay} from './displays/Buildings.js';
import {SwarmDisplay} from './displays/Swarm.js';

import('../crate/pkg').then(wasm => {
    let { new_game_state, serialize_game_state, deserialize_game_state } = wasm;

    class Game extends Component {

        constructor(props) {
            super(props);

            try {
                this.state = {game: deserialize_game_state(localStorage.game)};
            } catch (error) {
                this.state = {game: new_game_state()}
            }

            localStorage.game = serialize_game_state(this.state.game);

            this.frameId = requestAnimationFrame(this.tick);
        }

        tick = () => {
            this.setState({game: this.state.game.tick()});
            localStorage.game = serialize_game_state(this.state.game);
            this.frameId = requestAnimationFrame(this.tick);
        };

        buildCollector = () => {
            this.setState(prevState => ({game: prevState.game.add_collector()}));
        };

        buildMiner = () => {
            this.setState(prevState => ({game: prevState.game.add_miner()}));
        };

        buildRefiner = () => {
            this.setState(prevState => ({game: prevState.game.add_refiner()}));
        };

        buildSatelliteFactory = () => {
            this.setState(prevState => ({game: prevState.game.add_satellite_factory()}));
        };

        buildLauncher = () => {
            this.setState(prevState => ({game: prevState.game.add_launcher()}));
        };

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

    render(<Game/>, document.getElementById('app'));
});
