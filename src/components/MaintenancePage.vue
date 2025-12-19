<template>
  <div class="min-h-screen flex items-center justify-center bg-base-100 dark:bg-[#00125b] px-4">
    <div class="max-w-2xl w-full text-center">
      <!-- Icon -->
      <div class="mb-8 flex justify-center">
        <div class="w-24 h-24 rounded-full bg-warning/20 flex items-center justify-center">
          <Icon icon="mdi:wrench" class="text-6xl text-warning" />
        </div>
      </div>

      <!-- Title -->
      <h1 class="text-4xl md:text-5xl font-bold text-main mb-4">
        Down for Maintenance
      </h1>

      <!-- Description -->
      <p class="text-lg text-secondary mb-6">
        We're currently migrating to a new server and setting up the infrastructure.
      </p>

      <p class="text-base text-secondary mb-8">
        We'll be back online shortly. Thank you for your patience!
      </p>

      <!-- Additional Info -->
      <div class="bg-base-200 dark:bg-base-100 rounded-lg p-6 mb-8">
        <div class="flex items-start gap-4">
          <Icon icon="mdi:information" class="text-2xl text-info flex-shrink-0 mt-1" />
          <div class="text-left">
            <h3 class="font-semibold text-main mb-2">What's happening?</h3>
            <p class="text-sm text-secondary">
              Our team is working hard to migrate the explorer to a new server infrastructure. 
              This will improve performance, reliability, and scalability.
            </p>
          </div>
        </div>
      </div>

      <!-- Estimated Time (optional) -->
      <div v-if="estimatedTime" class="text-sm text-secondary">
        <p>Estimated completion: {{ estimatedTime }}</p>
      </div>

      <!-- Contact Info -->
      <div class="mt-8 pt-8 border-t border-base-300">
        <p class="text-sm text-secondary mb-2">
          Need immediate assistance?
        </p>
        <div class="flex justify-center gap-4">
          <a 
            href="https://twitter.com/POKTnetwork" 
            target="_blank" 
            rel="noopener noreferrer"
            class="text-info hover:text-info/70 transition-colors"
          >
            <Icon icon="mdi:twitter" class="text-2xl" />
          </a>
          <a 
            href="https://discord.gg/pokt" 
            target="_blank" 
            rel="noopener noreferrer"
            class="text-info hover:text-info/70 transition-colors"
          >
            <Icon icon="mdi:discord" class="text-2xl" />
          </a>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';

// Optional: You can pass estimated time as a prop or use an env variable
const props = defineProps<{
  estimatedTime?: string;
}>();
</script>

<style scoped>
/* Additional styling if needed */
</style>

