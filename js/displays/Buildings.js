import { h, Component } from 'preact';

export class BuildingsDisplay extends Component {
    render() {
        return <table class="buildings">
            <caption>Buildings</caption>
            <tr>
                <td class="building-name">Solar Collector</td>
                <td class="building-count">{this.props.state.collector_count()}</td>
            </tr>
            <tr>
                <td class="building-name">Miner</td>
                <td class="building-count">{this.props.state.miner_count()}</td>
            </tr>
            <tr>
                <td class="building-name">Refiner</td>
                <td class="building-count">{this.props.state.refiner_count()}</td>
            </tr>
            <tr>
                <td class="building-name">Satellite Factory</td>
                <td class="building-count">{this.props.state.satellite_factory_count()}</td>
            </tr>
            <tr>
                <td class="building-name">Satellite Launcher</td>
                <td class="building-count">{this.props.state.launcher_count()}</td>
            </tr>
        </table>;
    }
}
