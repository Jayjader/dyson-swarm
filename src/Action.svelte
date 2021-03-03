<li class="action">
  <button on:click data-augmented-ui="all-hex" class="action-content">
    <slot>Action name/display here</slot>
  </button>
</li>

<style>
  .action {
    transform: scale(2, 2);
  }
  .action:nth-child(1) {
    grid-row-start: 1;
    grid-column-start: 2;
    grid-column-end: 3;
  }
  .action:nth-child(2) {
    grid-row-start: 1;
    grid-column-start: 4;
    grid-column-end: 5;
  }
  .action:nth-child(3) {
    grid-row-start: 2;
    grid-column-start: 1;
    grid-column-end: 2;
  }
  .action:nth-child(4) {
    grid-row-start: 2;
    grid-column-start: 3;
    grid-column-end: 4;
  }
  .action:nth-child(5) {
    grid-row-start: 2;
    grid-column-start: 5;
    grid-column-end: 6;
  }
  .action:nth-child(6) {
    grid-row-start: 3;
    grid-column-start: 2;
    grid-column-end: 3;
  }
  .action-content {
    --aug-all-width: 45px;
    /*--aug-all-height: 3rem;*/
    font-size: 10px;
    cursor: pointer;
    overflow: hidden;
    border: none;
  }
</style>
