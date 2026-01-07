<script setup lang="ts">
import { onMounted } from 'vue';

onMounted(() => {
  const yearEl = document.getElementById('currentYear');
  if (yearEl) yearEl.textContent = new Date().getFullYear().toString();
});
</script>

<template>
  <!-- footer -->
  <footer
    class="bg-[#0f1419] dark:bg-[#0f1419] text-white px-4 sm:px-6 lg:px-8 py-12 lg:py-16"
    role="contentinfo"
  >
    <div class="max-w-7xl mx-auto">
      <!-- Main Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        <!-- Left Column: Logo & Description -->
        <div class="lg:col-span-4">
          <a href="/" aria-label="Pocket Network" class="inline-block mb-6">
            <img
              src="https://pocket.network/wp-content/uploads/2025/01/logo-white.png"
              alt="Pocket Network"
              class="h-10 w-auto"
            />
          </a>
          <p
            class="text-gray-300 dark:text-gray-400 text-sm leading-relaxed max-w-sm"
          >
            Unstoppable open data for the decentralized web. High-performance,
            self-healing access to any public data anywhere.
          </p>
        </div>

        <!-- Right Columns: Navigation Links -->
        <div class="lg:col-span-8">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <!-- RESOURCES Column -->
            <div>
              <h3
                class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4"
              >
                Resources
              </h3>
              <ul class="space-y-3">
                <li>
                  <a
                    href="https://docs.pokt.network/"
                    target="_blank"
                    class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm"
                  >
                    Documentation
                  </a>
                </li>
                <li>
                  <a
                    href="https://forum.pokt.network/"
                    target="_blank"
                    class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm"
                  >
                    Forum
                  </a>
                </li>
                <li>
                  <a
                    href="https://explorer.pocket.network/"
                    target="_blank"
                    class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm"
                  >
                    Explorer
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/pokt-network"
                    target="_blank"
                    class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            <!-- NETWORK Column -->
            <div>
              <h3
                class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4"
              >
                Network
              </h3>
              <ul class="space-y-3">
                <li>
                  <a
                    href="https://wallet.pocket.network/"
                    target="_blank"
                    class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm"
                  >
                    Wallet
                  </a>
                </li>
                <li>
                  <a
                    href="https://pocket.network/shannon-upgrade-faq/"
                    target="_blank"
                    class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm"
                  >
                    Shannon Upgrade FAQ
                  </a>
                </li>
                <li>
                  <a
                    href="https://pocket.network/press-kit/"
                    target="_blank"
                    class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm"
                  >
                    Press Kit
                  </a>
                </li>
                <li>
                  <a
                    href="https://coinmarketcap.com/currencies/pocket-network/markets/"
                    target="_blank"
                    class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm"
                  >
                    Buy POKT
                  </a>
                </li>
              </ul>
            </div>

            <!-- LEGAL Column -->
            <div>
              <h3
                class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4"
              >
                Legal
              </h3>
              <ul class="space-y-3">
                <li>
                  <a
                    href="https://pocket.network/privacy-policy/"
                    target="_blank"
                    class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="https://pocket.network/terms-of-use/"
                    target="_blank"
                    class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm"
                  >
                    Terms of Use
                  </a>
                </li>
                <li>
                  <a
                    href="https://pocket.network/protocol-logging-practices/"
                    target="_blank"
                    class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm"
                  >
                    Logging Practices
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div
        class="border-t border-gray-700 dark:border-gray-800 mt-10 lg:mt-12"
      ></div>

      <!-- Bottom Section: Powered By, Copyright & Legal Links -->
      <div
        class="flex flex-col-reverse lg:flex-row justify-between items-center gap-4 pt-6 lg:pt-8"
      >
        <!-- Left: Powered by & Copyright -->
        <div class="flex flex-col lg:flex-row items-center lg:items-start gap-2 lg:gap-4">
          <!-- Powered by Stakenodes -->
          <div class="flex items-center gap-2 text-gray-300 dark:text-gray-400 text-sm">
            <span>Powered by</span>
            <a
              href="https://stakenodes.org"
              target="_blank"
              class="flex items-center gap-1.5 hover:text-white dark:hover:text-white transition-colors duration-200"
            >
              <img
                src="https://stakenodes.org/favicon.png"
                alt="Stakenodes"
                class="h-5 w-5"
              />
              <span class="text-base font-medium">Stakenodes</span>
            </a>
          </div>

          <!-- Copyright -->
          <div class="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
            <span
              >© <span id="currentYear"></span> Pocket Network. All rights
              reserved.</span
            >
          </div>
        </div>

        <!-- Right: Legal Links -->
        <div class="flex items-center gap-6 text-gray-400 dark:text-gray-500 text-sm">
          <a
            href="https://pocket.network/privacy-policy/"
            target="_blank"
            class="hover:text-white dark:hover:text-white transition-colors duration-200"
          >
            Privacy
          </a>
          <a
            href="https://pocket.network/terms-of-use/"
            target="_blank"
            class="hover:text-white dark:hover:text-white transition-colors duration-200"
          >
            Terms
          </a>
        </div>
      </div>
    </div>
  </footer>
</template>

<style scoped>
/* Additional styling if needed for production polish */
footer a {
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f1419] focus:ring-blue-500 rounded-sm;
}
</style>
