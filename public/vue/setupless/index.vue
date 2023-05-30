<script>
    import { ref } from "vue";
    export default {
        data() {
            return {
                msg: ref("Hello world")
            }
        }
    }
</script>

<template>
  <h1>{{ msg }}</h1>
  <input v-model="msg">
</template>

<style scoped>
h1 {
    color: red;
}
</style>

<style>
body {
    margin: 0;
}
</style>
