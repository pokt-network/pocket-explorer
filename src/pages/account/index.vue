// src/pages/account/index.vue
<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import AccountModule from '../../modules/[chain]/account/[tokens].vue'

const router = useRouter()

onMounted(() => {
  const tokens = localStorage.getItem('api_tokens')
  if (!tokens) {
    router.replace('/')
  }
})
</script>

<template>
  <AccountModule />
</template>
