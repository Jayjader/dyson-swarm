import { h, Component } from 'preact';

export class ResourcesDisplay extends Component {
    render() {
        return <table class="resources">
            <caption>Resources</caption>
            <tr>
                <td class="resource-name">Electricity</td>
                <td class="resource-count">{this.props.state.electricity_count()}</td>
            </tr>
            <tr>
                <td class="resource-name">Ore</td>
                <td class="resource-count">{this.props.state.ore_count()}</td>
            </tr>
            <tr>
                <td class="resource-name">Metal</td>
                <td class="resource-count">{this.props.state.metal_count()}</td>
            </tr>
            <tr>
                <td class="resource-name">Satellite</td>
                <td class="resource-count">{this.props.state.satellite_count()}</td>
            </tr>
        </table>;
    }
}
