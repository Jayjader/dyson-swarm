<script lang="ts">
    export let contents: ArrayLike<[string, number]>;
    export let caption: string;
</script>


<table>
    <caption>{caption}</caption>
    {#each contents as [name, count]}
        <tr><th>{name}</th><td>{count}</td></tr>
    {/each}
</table>

<style>
    caption {
        text-transform: capitalize;
    }

	table {
		border: 2px solid purple;
        border-collapse: collapse;
        margin-bottom: 1rem;
        width: 360px;
	}

    tr > * {
        border-top: 1px solid black;
        padding: 0 1rem;
    }

    th {
        text-align: left;
        text-transform: capitalize;
        border-right: 1px solid black;
    }

    td {
        width: 3rem;
        text-align: right;
    }

    td:nth-child(1) {
        border-right: 1px solid black;
    }
</style>