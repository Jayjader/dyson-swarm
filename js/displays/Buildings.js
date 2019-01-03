import { h, Component } from 'preact';

export class BuildingsDisplay extends Component {
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
