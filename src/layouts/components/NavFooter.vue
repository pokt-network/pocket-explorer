<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const showModal = ref(false)
const showEmailModal = ref(false)

const formData = ref({
  name: '',
  email: '',
  password: '',
  organization: ''
})

const emailOnly = ref('')

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function generateToken() {
  return 'pk_' + crypto.randomUUID().replaceAll('-', '')
}

function openModal() {
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  resetForm()
}

function resetForm() {
  formData.value = {
    name: '',
    email: '',
    password: '',
    organization: ''
  }
}

function handleSignUp() {
  const { name, email, password } = formData.value

  if (!name || !email || !password) {
    alert('Please fill all required fields')
    return
  }

  if (!isValidEmail(email)) {
    alert('Invalid email address')
    return
  }

  if (password.length < 6) {
    alert('Password must be at least 6 characters')
    return
  }

  const tokenData = {
    id: Date.now().toString(),
    token: generateToken(),
    createdAt: new Date().toISOString(),
    name,
    email,
    organization: formData.value.organization || 'Personal'
  }

  const existingTokens = JSON.parse(localStorage.getItem('api_tokens') || '[]')
  existingTokens.push(tokenData)
  localStorage.setItem('api_tokens', JSON.stringify(existingTokens))

  localStorage.setItem(
    'user_data',
    JSON.stringify({ name, email, organization: formData.value.organization })
  )

  closeModal()

  // ✅ SPA Redirect (CORRECT)
  router.push('/account')
}

function handleGetToken() {
  showModal.value = false
  showEmailModal.value = true
}

const showTokenModal = ref(false)
const currentToken = ref('')
const copied = ref(false)

function openTokenModal(token: string) {
  currentToken.value = token
  copied.value = false
  showTokenModal.value = true
}

function closeTokenModal() {
  showTokenModal.value = false
  currentToken.value = ''
  copied.value = false
}

function copyCurrentToken() {
  if (!currentToken.value) return
  navigator.clipboard.writeText(currentToken.value)
  copied.value = true

  // Hide token after copy
  setTimeout(() => {
    currentToken.value = '************'
  }, 300)
}

function submitEmailToken() {
  if (!emailOnly.value || !isValidEmail(emailOnly.value)) {
    alert('Invalid email')
    return
  }

  const tokenData = {
    id: Date.now().toString(),
    token: generateToken(),
    createdAt: new Date().toISOString(),
    name: 'Guest User',
    email: emailOnly.value,
    organization: 'Personal'
  }

  const existingTokens = JSON.parse(localStorage.getItem('api_tokens') || '[]')
  existingTokens.push(tokenData)
  localStorage.setItem('api_tokens', JSON.stringify(existingTokens))

  // ✅ Open token modal instead of redirect
  showEmailModal.value = false
  emailOnly.value = ''
  openTokenModal(tokenData.token)
}

function handleEscape(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    showModal.value = false
    showEmailModal.value = false
  }
}

watch([showModal, showEmailModal], ([modal, emailModal]) => {
  document.body.style.overflow = modal || emailModal ? 'hidden' : ''
})

onMounted(() => {
  const yearEl = document.getElementById('currentYear')
  if (yearEl) yearEl.textContent = new Date().getFullYear().toString()

  document.addEventListener('keydown', handleEscape)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = ''
})
</script>

<template>
  <!-- Footer -->
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
          <p class="text-gray-300 dark:text-gray-400 text-[18px] leading-relaxed max-w-sm">
            Unstoppable open data for the decentralized web. High-performance,
            self-healing access to any public data anywhere.
          </p>
        </div>

        <!-- Right Columns: Navigation Links -->
        <div class="lg:col-span-8">
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-8">
            <!-- RESOURCES Column -->
            <div>
              <h3 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                Resources
              </h3>
              <ul class="space-y-3">
                <li>
                  <a href="/documentation" class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="https://forum.pokt.network/" target="_blank" class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm">
                    Forum
                  </a>
                </li>
                <li>
                  <a href="https://explorer.pocket.network/" target="_blank" class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm">
                    Explorer
                  </a>
                </li>
                <li>
                  <a href="https://github.com/pokt-network" target="_blank" class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm">
                    GitHub
                  </a>
                </li>
                <li>
                  <button
                    @click="openModal"
                    class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm"
                  >
                    Get API Token
                  </button>
                </li>
              </ul>
            </div>

            <!-- NETWORK Column -->
            <div>
              <h3 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                Network
              </h3>
              <ul class="space-y-3">
                <li>
                  <a href="https://wallet.pocket.network/" target="_blank" class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm">
                    Wallet
                  </a>
                </li>
                <li>
                  <a href="https://pocket.network/shannon-upgrade-faq/" target="_blank" class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm">
                    Shannon Upgrade FAQ
                  </a>
                </li>
                <li>
                  <a href="https://pocket.network/press-kit/" target="_blank" class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm">
                    Press Kit
                  </a>
                </li>
                <li>
                  <a href="https://coinmarketcap.com/currencies/pocket-network/markets/" target="_blank" class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm">
                    Buy POKT
                  </a>
                </li>
              </ul>
            </div>

            <!-- LEGAL Column -->
            <div>
              <h3 class="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-4">
                Legal
              </h3>
              <ul class="space-y-3">
                <li>
                  <a href="https://pocket.network/privacy-policy/" target="_blank" class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="https://pocket.network/terms-of-use/" target="_blank" class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm">
                    Terms of Use
                  </a>
                </li>
                <li>
                  <a href="https://pocket.network/protocol-logging-practices/" target="_blank" class="text-gray-200 dark:text-gray-300 hover:text-white dark:hover:text-white transition-colors duration-200 text-sm">
                    Logging Practices
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="border-t border-gray-700 dark:border-gray-800 mt-10 lg:mt-12"></div>

      <!-- Bottom Section -->
      <div class="flex flex-col-reverse lg:flex-row justify-between items-center gap-4 pt-6 lg:pt-8">
        <div class="flex flex-col lg:flex-row items-center lg:items-start gap-2 lg:gap-4">
          <div class="flex items-center gap-2 text-gray-300 dark:text-gray-400 text-sm">
            <span>Powered by</span>
            <a href="https://stakenodes.org" target="_blank" class="flex items-center gap-1.5 hover:text-white dark:hover:text-white transition-colors duration-200">
              <img src="https://stakenodes.org/favicon.png" alt="Stakenodes" class="h-5 w-5"/>
              <span class="text-base font-medium">Stakenodes</span>
            </a>
          </div>
          <div class="flex items-center gap-2 text-gray-400 dark:text-gray-500 text-sm">
            <span>© <span id="currentYear"></span> Pocket Network. All rights reserved.</span>
          </div>
        </div>
        <div class="flex items-center gap-6 text-gray-400 dark:text-gray-500 text-sm">
          <a href="https://pocket.network/privacy-policy/" target="_blank" class="hover:text-white dark:hover:text-white transition-colors duration-200">
            Privacy
          </a>
          <a href="https://pocket.network/terms-of-use/" target="_blank" class="hover:text-white dark:hover:text-white transition-colors duration-200">
            Terms
          </a>
        </div>
      </div>
    </div>
  </footer>

  <!-- Sign Up Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        @click.self="closeModal"
      >
        <div class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-2xl w-full max-w-lg transform transition-all overflow-hidden">
          <div class="relative px-8 pt-8 pb-6 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800">
            <button
              @click="closeModal"
              class="absolute top-6 right-6 text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
              aria-label="Close modal"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" stroke-width="2.5" stroke-linecap="round" d="M6 6l12 12M6 18L18 6"/>
              </svg>
            </button>
            <div class="pr-10">
              <h2 class="text-2xl font-bold text-white mb-2">Get API Token</h2>
              <p class="text-blue-100 text-sm">Create your account or request a token via email</p>
            </div>
          </div>

          <div class="px-8 py-8 space-y-5 bg-white dark:bg-[#1f2937]">
            <div>
              <label for="name" class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Full Name
              </label>
              <input
                id="name"
                v-model="formData.name"
                type="text"
                placeholder="Enter your full name"
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>

            <div>
              <label for="email" class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Email Address
              </label>
              <input
                id="email"
                v-model="formData.email"
                type="email"
                placeholder="your.email@example.com"
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Password
              </label>
              <input
                id="password"
                v-model="formData.password"
                type="password"
                placeholder="Create a secure password"
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>

            <div>
              <label for="organization" class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Organization <span class="text-gray-400 text-xs font-normal">(Optional)</span>
              </label>
              <input
                id="organization"
                v-model="formData.organization"
                type="text"
                placeholder="Your company or project name"
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>
          </div>

          <div class="px-8 py-6 bg-gray-50 dark:bg-[#111827] space-y-3">
            <button
              @click="handleSignUp"
              class="w-full px-6 py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M5 12h14m-7-7v14"/>
              </svg>
              Create Account
            </button>

            <div class="flex items-center gap-3">
              <div class="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
              <span class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Or</span>
              <div class="flex-1 h-px bg-gray-300 dark:bg-gray-600"></div>
            </div>

            <button
              @click="handleGetToken"
              class="w-full px-6 py-3.5 bg-white hover:bg-gray-50 dark:bg-[#374151] dark:hover:bg-[#4b5563] text-gray-900 dark:text-white font-semibold rounded-xl transition-all duration-200 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" stroke-width="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
              Get Token via Email
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Email Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showEmailModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        @click.self="showEmailModal = false"
      >
        <div class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div class="relative px-8 pt-8 pb-6 bg-gradient-to-r from-blue-600 to-blue-700">
            <button
              @click="showEmailModal = false"
              class="absolute top-5 right-5 text-white/80 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" stroke-width="2.5" stroke-linecap="round" d="M6 6l12 12M6 18L18 6"/>
              </svg>
            </button>
            <h2 class="text-xl font-bold text-white">Get API Token</h2>
            <p class="text-blue-100 text-sm mt-1">Enter your email to receive your API token</p>
          </div>

          <div class="px-8 py-8 bg-white dark:bg-[#1f2937]">
            <label class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
              Email Address
            </label>
            <input
              v-model="emailOnly"
              type="email"
              placeholder="you@example.com"
              class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div class="px-8 py-6 bg-gray-50 dark:bg-[#111827]">
            <button
              @click="submitEmailToken"
              class="w-full py-3.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl shadow-lg transition-all"
            >
              Send API Token
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Token Display Modal -->
  <Teleport to="body">
  <Transition name="modal">
    <div
      v-if="showTokenModal"
      class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      @click.self="closeTokenModal"
    >
      <div class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div class="px-8 py-8">
          <h2 class="text-xl font-bold text-gray-900 dark:text-white mb-4">Your API Token</h2>
          <p class="text-gray-600 dark:text-gray-400 mb-6 text-sm">
            Copy this token and keep it safe. After copying, it will be hidden.
          </p>

          <!-- Token + Copy -->
          <div class="flex items-center gap-3 mb-6">
            <input
              type="text"
              :value="currentToken"
              readonly
              class="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 font-mono focus:outline-none"
            />
            <button
              @click="copyCurrentToken"
              class="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-1"
              title="Copy token"
            >
              <!-- Copy icon always visible -->
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
              </svg>
              
              <!-- Copied! text appears only after click -->
              <span v-if="copied" class="text-sm text-green-300 font-semibold">Copied!</span>
            </button>
          </div>
          <button
            @click="closeTokenModal"
            class="w-full py-3.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </Transition>
</Teleport>


</template>

<style scoped>
footer a, footer button {
  @apply focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f1419] focus:ring-blue-500 rounded-sm;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-active > div,
.modal-leave-active > div {
  transition: transform 0.3s ease;
}

.modal-enter-from > div,
.modal-leave-to > div {
  transform: scale(0.95);
}
</style>