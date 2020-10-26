<script lang="ts">
	import Table from "./table.svelte";
	import type { Resources, Buildings, Swarm, State, GameAction } from "./types";
	import { update, launchSatellite, buildSolarCollector, buildMiner} from "./actions"
	import { onDestroy } from "svelte";

	export let init: {resources: Resources, buildings: Buildings, swarm: Swarm};
	let {resources, buildings, swarm} = init;
	let state: State = {resources, buildings, swarm,
		dispatch: (action: GameAction) => {
			state = action(state)
		}
	}

	const timestep = 1000;
	let lastTimeStamp = window.performance.now();
	let animationFrame: number;


	function mainLoop(nextTimeStamp: number) {
		animationFrame = window.requestAnimationFrame(mainLoop);
		const timeElapsed = nextTimeStamp - lastTimeStamp;
		if (timeElapsed < timestep) {
			return
		}
		let delta = timeElapsed;
		while (delta > timestep) {
			delta -= timestep;
			state.dispatch(update)
		}
		lastTimeStamp = nextTimeStamp;
	}
	onDestroy(window.cancelAnimationFrame(animationFrame));
	mainLoop(lastTimeStamp);
</script>

<main>
	<div class="tables">
		<Table caption="resources" contents={Object.entries(state.resources)}/>
		<Table caption="swarm" contents={Object.entries(state.swarm)}/>
		<Table caption="buildings" contents={Object.entries(state.buildings)}/>
	</div>
	<div class="actions">
		<button on:click="{() => state.dispatch(buildSolarCollector)}">Build collector</button>
		<button on:click="{() => state.dispatch(buildMiner)}">Build miner</button>
		<button on:click="{() => {}}">Build refiner</button>
		<button on:click="{() => {}}">Build Sat. Factory</button>
		{#if buildings.satelliteLauncher}
		<button
			on:click="{() => state.dispatch(launchSatellite)}"
			disabled={resources.packagedSatellites === 0}>
			Launch Sat.
		</button>
		{:else}
		<button on:click="{() => buildings.satelliteLauncher=true}" disabled={buildings.satelliteLauncher}>Build Sat. Launcher</button>
		{/if}
	</div>
</main>

<style>
	main {
		text-align: center;
		padding: 1em;
		max-width: 360px;
		margin: 0 auto;
		background-color: #dddddd;
	}

	.tables {
		display: flex;
		flex-flow: row wrap;
		justify-content: space-evenly;
	}

	@media (min-width: 640px) {
		main {
			max-width: none;
		}
	}
</style>