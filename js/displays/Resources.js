import { h, Component } from 'preact';

export class ResourcesDisplay extends Component {
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
