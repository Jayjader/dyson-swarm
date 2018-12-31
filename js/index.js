import { h, render, Component } from 'preact';
import 'preact/devtools';

import("../crate/pkg").then(wasm => {
    let {
        State,
        Resource,
        Building,
    } = wasm;

    class ResourcesDisplay extends Component {
        render() {
            return <table class="resources">
                <caption>Resources</caption>
                <tr>
                    <td class="resource-name">Electricity</td>
                    <td class="resource-count">{String(this.props.resources.electricity.count)}</td>
                </tr>
                <tr>
                    <td class="resource-name">Ore</td>
                    <td class="resource-count">{String(this.props.resources.ore.count)}</td>
                </tr>
                <tr>
                    <td class="resource-name">Metal</td>
                    <td class="resource-count">{String(this.props.resources.metal.count)}</td>
                </tr>
                <tr>
                    <td class="resource-name">Satellite</td>
                    <td class="resource-count">{String(this.props.resources.satellites.count)}</td>
                </tr>
            </table>;
        }
    }

    class BuildingsDisplay extends Component {
        render() {
            return <table class="buildings">
                <caption>Buildings</caption>
                <tr>
                    <td class="building-name">Solar Collector</td>
                    <td class="building-count">{String(this.props.buildings.collectors.count)}</td>
                </tr>
                <tr>
                    <td class="building-name">Miner</td>
                    <td class="building-count">{String(this.props.buildings.miners.count)}</td>
                </tr>
                <tr>
                    <td class="building-name">Refiner</td>
                    <td class="building-count">{String(this.props.buildings.refiners.count)}</td>
                </tr>
                <tr>
                    <td class="building-name">Satellite Factory</td>
                    <td class="building-count">{String(this.props.buildings.satellite_factories.count)}</td>
                </tr>
                <tr>
                    <td class="building-name">Satellite Launcher</td>
                    <td class="building-count">{String(this.props.buildings.launchers.count)}</td>
                </tr>
            </table>;
        }
    }

    class SwarmDisplay extends Component {
        render() {
            return <table class="swarm">
                <caption>Dyson Swarm</caption>
                <tr>
                    <td class="swarm-attribute-name">Count</td>
                    <td class="swarm-attribute-value">0</td>
                </tr>
                <tr>
                    <td class="swarm-attribute-name">Sun's output captured</td>
                    <td class="swarm-attribute-value">0%</td>
                </tr>
            </table>;
        }
    }

    class Game extends Component {
        constructor(props) {
            super(props);
            this.state = {
                game: new State(),
            };
        }
        render() {
            return <div class="game-content">
                <div class="tables">
                    <ResourcesDisplay resources={this.state.game.resources}/>
                    <BuildingsDisplay buildings={this.state.game.buildings}/>
                    <SwarmDisplay swarm={{count: 0}}/>
            </div>
            <div class="actions">
                <button type="button">
                    Build Solar Collector (5 Metal)
                </button>
                <button type="button">Build Miner (8 Metal)</button>
                <button type="button">Build Refiner (25 Metal)</button>
                <button type="button">Build Satellite Factory (15 Metal)</button>
                <button type="button">Build Satellite Launcher (10 Metal)</button>
            </div>
                </div>;
        }
    }

    render(<Game/>, document.getElementById("app"));
});
