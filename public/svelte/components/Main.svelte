<script>
    import Dialog, { Title, Content, Actions } from '@smui/dialog';
    import Button, { Label } from '@smui/button';
 
    let open = false;

    let count = 0;
    const inc = () => {
        count++;
    }

    const dec = () => {
        count--;
    }
</script>

<h1>Count is { count }</h1>

<div>
    <Button variant="raised" on:click={inc} title="increment"><Label>+</Label></Button>
    <Button variant="raised" on:click={dec} title="decrement"><Label>-</Label></Button>
    <Button on:click={() => (open = true)}>
        <Label>Open Dialog</Label>
    </Button>

<Dialog
  bind:open
  aria-labelledby="simple-title"
  aria-describedby="simple-content"
>
  <!-- Title cannot contain leading whitespace due to mdc-typography-baseline-top() -->
  <Title id="simple-title">Dialog Title</Title>
  <Content id="simple-content">Super awesome dialog body text?</Content>
  <Actions>
    <Button>
      <Label>No</Label>
    </Button>
    <Button>
      <Label>Yes</Label>
    </Button>
  </Actions>
</Dialog>
</div>
