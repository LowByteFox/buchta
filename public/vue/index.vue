<script setup>
    import "primevue/resources/primevue.min.css";
    import "primevue/resources/themes/lara-light-indigo/theme.css"; 

    import Editor from 'primevue/editor';
    import { ref } from "vue";

    const value = ref('');
</script>

<template>
    <Editor v-model="value" editorStyle="height: 320px" />
</template>
