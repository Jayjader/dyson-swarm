import { h, Component } from 'preact';

export class SwarmDisplay extends Component {
    render() {
        return <table class="swarm">
            <caption>Dyson Swarm</caption>
            <tr>
                <td class="swarm-attribute-name">Count</td>
                <td class="swarm-attribute-value">{String(this.props.swarm.count)}</td>
            </tr>
            <tr>
                <td class="swarm-attribute-name">Sun's output captured</td>
                <td class="swarm-attribute-value">0%</td>
            </tr>
        </table>;
    }
}

