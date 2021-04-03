<button on:click data-augmented-ui="all-hex" class="action-content">
  <slot>Action name/display here</slot>
</button>

<style>
  .action-content {
    --aug-all-width: 45px;
    /*--aug-all-height: 3rem;*/
    --aug-border: initial;
    font-size: 10px;
    cursor: pointer;
    overflow: hidden;
    border: none;
  }
</style>
