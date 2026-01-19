<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'

type TokenData = {
  id: string
  token: string
  createdAt: string
  name?: string
  email?: string
  organization?: string
  description?: string
}

const tokens = ref<TokenData[]>([])
const showRegenerateModal = ref(false)
const showDeleteModal = ref(false)
const showCreateModal = ref(false)
const selectedToken = ref<TokenData | null>(null)
const showSuccessMessage = ref(false)
const successMessage = ref('')

// Create token form data
const newTokenForm = ref({
  name: '',
  description: ''
})

const tokenCount = computed(() => tokens.value.length)

function generateToken(): string {
  return 'pk_' + crypto.randomUUID().replaceAll('-', '')
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = date.getDate()
  const month = months[date.getMonth()]
  const year = date.getFullYear()
  const hours = date.getHours().toString().padStart(2, '0')
  const minutes = date.getMinutes().toString().padStart(2, '0')
  const seconds = date.getSeconds().toString().padStart(2, '0')
  
  return `${day} ${month} ${year}, ${hours}:${minutes}:${seconds}`
}

function showSuccess(message: string) {
  successMessage.value = message
  showSuccessMessage.value = true
  setTimeout(() => {
    showSuccessMessage.value = false
  }, 3000)
}

function loadTokens() {
  const data = localStorage.getItem('api_tokens')
  if (data) {
    try {
      tokens.value = JSON.parse(data)
    } catch (e) {
      console.error('Failed to parse tokens:', e)
      tokens.value = []
    }
  }
}

function saveTokens() {
  localStorage.setItem('api_tokens', JSON.stringify(tokens.value))
}

function createNewToken() {
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
  newTokenForm.value = {
    name: '',
    description: ''
  }
}

function confirmCreateToken() {
  if (!newTokenForm.value.name.trim()) {
    alert('Please enter a token name')
    return
  }

  const userData = localStorage.getItem('user_data')
  let email = 'guest@example.com'
  let organization = 'Personal'
  
  if (userData) {
    try {
      const parsed = JSON.parse(userData)
      email = parsed.email || email
      organization = parsed.organization || organization
    } catch (e) {
      console.error('Failed to parse user data:', e)
    }
  }

  const newToken: TokenData = {
    id: Date.now().toString(),
    token: generateToken(),
    createdAt: new Date().toISOString(),
    name: newTokenForm.value.name,
    email,
    organization,
    description: newTokenForm.value.description || 'No description'
  }

  tokens.value.unshift(newToken)
  saveTokens()
  showSuccess('New token created successfully!')
  closeCreateModal()
}

function copyToken(token: string) {
  navigator.clipboard.writeText(token)
  showSuccess('Token copied to clipboard!')
}

function openRegenerateModal(token: TokenData) {
  selectedToken.value = token
  showRegenerateModal.value = true
}

function closeRegenerateModal() {
  showRegenerateModal.value = false
  selectedToken.value = null
}

function confirmRegenerate() {
  if (!selectedToken.value) return

  const index = tokens.value.findIndex(t => t.id === selectedToken.value!.id)
  if (index !== -1) {
    tokens.value[index] = {
      ...tokens.value[index],
      token: generateToken(),
      createdAt: new Date().toISOString()
    }
    saveTokens()
    showSuccess('Token regenerated successfully!')
  }

  closeRegenerateModal()
}

function openDeleteModal(token: TokenData) {
  selectedToken.value = token
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  selectedToken.value = null
}

function confirmDelete() {
  if (!selectedToken.value) return

  tokens.value = tokens.value.filter(t => t.id !== selectedToken.value!.id)
  saveTokens()
  showSuccess('Token deleted successfully!')

  closeDeleteModal()
}

onMounted(() => {
  loadTokens()
})
</script>

<template>
  <div class="py-12 px-4 sm:px-6 lg:px-8">
    <!-- Success Message -->
    <Transition name="fade">
      <div
        v-if="showSuccessMessage"
        class="fixed top-4 right-4 z-50 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-3"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
          <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M5 13l4 4L19 7"/>
        </svg>
        {{ successMessage }}
      </div>
    </Transition>

    <div class="max-w-fullmx-auto">
      <!-- Header -->
      <div class="mb-8">
        <div class="flex items-center justify-between mb-4 bg-[#ffffff] hover:bg-base-200 w-full px-4 py-4 my-4 font-bold text-[#000000] dark:text-[#ffffff] rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
          <div class="flex flex-col gap-1">
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">API Tokens</h1>
            <p class="text-gray-600 dark:text-gray-400 text-[14px]">Manage your API tokens for accessing Pocket Network services</p>
          </div>
          <a
            href="/"
            class="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors flex items-center gap-2"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M19 12H5m7-7l-7 7 7 7"/>
            </svg>
            Back to Home
          </a>
        </div>
      </div>

      <!-- Stats & Create Button -->
      <div class="mb-6 flex justify-between items-center">
        <div class="flex items-center gap-6">
          <div class="flex flex-col items-center w-[14vw] bg-[#ffffff] hover:bg-base-200 p-4 rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Tokens</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">{{ tokenCount }}</p>
          </div>
        </div>
        <button
          @click="createNewToken"
          class="px-4 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-2"
        >
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
            <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14m-7-7h14"/>
          </svg>
          Create New Token
        </button>
      </div>

      <!-- Tokens Table -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
              <tr>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Token
                </th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Created At
                </th>
                <th class="px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
              <!-- Token Rows -->
              <tr
                v-for="token in tokens"
                :key="token.id"
                class="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                <!-- Token Column -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <code class="px-3 py-1.5 bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 rounded-lg font-mono text-sm border border-gray-200 dark:border-gray-600 break-all">
                      {{ token.token }}
                    </code>
                    <button
                      @click="copyToken(token.token)"
                      class="p-2 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors flex-shrink-0"
                      title="Copy token"
                    >
                      <svg class="w-4 h-4 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none">
                        <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2"/>
                        <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2"/>
                      </svg>
                    </button>
                  </div>
                  <div v-if="token.name" class="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {{ token.name }}
                  </div>
                  <div v-if="token.description" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {{ token.description }}
                  </div>
                  <div v-if="token.email" class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {{ token.email }} • {{ token.organization }}
                  </div>
                </td>

                <!-- Created At Column -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <svg class="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2"/>
                      <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 6v6l4 2"/>
                    </svg>
                    <span class="text-sm text-gray-600 dark:text-gray-300">{{ formatDate(token.createdAt) }}</span>
                  </div>
                </td>

                <!-- Actions Column -->
                <td class="px-6 py-4">
                  <div class="flex items-center gap-2">
                    <button
                      @click="openRegenerateModal(token)"
                      class="px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-medium text-sm rounded-lg transition-colors flex items-center gap-1.5"
                      title="Regenerate token"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M1 4v6h6M23 20v-6h-6"/>
                        <path stroke="currentColor" stroke-width="2" d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
                      </svg>
                      <!-- Regenerate -->
                    </button>
                    <button
                      @click="openDeleteModal(token)"
                      class="px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-400 font-medium text-sm rounded-lg transition-colors flex items-center gap-1.5"
                      title="Delete token"
                    >
                      <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none">
                        <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                      </svg>
                      <!-- Delete -->
                    </button>
                  </div>
                </td>
              </tr>

              <!-- Empty State -->
              <tr v-if="tokens.length === 0">
                <td colspan="3" class="px-6 py-12 text-center">
                  <div class="flex flex-col items-center gap-3">
                    <svg class="w-12 h-12 text-gray-400" viewBox="0 0 24 24" fill="none">
                      <path stroke="currentColor" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                    </svg>
                    <p class="text-gray-600 dark:text-gray-400 font-medium">No tokens created yet</p>
                    <p class="text-sm text-gray-500 dark:text-gray-500">Click "Create New Token" to get started</p>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <!-- Regenerate Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showRegenerateModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        @click.self="closeRegenerateModal"
      >
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div class="p-6">
            <div class="flex items-center gap-4 mb-4">
              <div class="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                <svg class="w-6 h-6 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none">
                  <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M1 4v6h6M23 20v-6h-6"/>
                  <path stroke="currentColor" stroke-width="2" d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Regenerate Token?</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">This will invalidate the old token</p>
              </div>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to regenerate this token? The old token will no longer work and any applications using it will need to be updated.
            </p>
            <div class="flex gap-3">
              <button
                @click="closeRegenerateModal"
                class="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                @click="confirmRegenerate"
                class="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
              >
                Regenerate
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Delete Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showDeleteModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        @click.self="closeDeleteModal"
      >
        <div class="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
          <div class="p-6">
            <div class="flex items-center gap-4 mb-4">
              <div class="p-3 bg-red-100 dark:bg-red-900/30 rounded-full">
                <svg class="w-6 h-6 text-red-600 dark:text-red-400" viewBox="0 0 24 24" fill="none">
                  <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 9v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <div>
                <h3 class="text-lg font-bold text-gray-900 dark:text-white">Delete Token?</h3>
                <p class="text-sm text-gray-600 dark:text-gray-400 mt-1">This action cannot be undone</p>
              </div>
            </div>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this token? This will permanently remove the token and any applications using it will stop working.
            </p>
            <div class="flex gap-3">
              <button
                @click="closeDeleteModal"
                class="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                @click="confirmDelete"
                class="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Create Token Modal -->
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="showCreateModal"
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        @click.self="closeCreateModal"
      >
        <div class="bg-white dark:bg-[#1f2937] rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
          <!-- Modal Header -->
          <div class="relative px-8 pt-8 pb-6 bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-700 dark:to-blue-800">
            <button
              @click="closeCreateModal"
              class="absolute top-6 right-6 text-white/80 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10"
              aria-label="Close modal"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" stroke-width="2.5" stroke-linecap="round" d="M6 6l12 12M6 18L18 6"/>
              </svg>
            </button>
            <div class="pr-10">
              <h2 class="text-2xl font-bold text-white mb-2">Create New API Token</h2>
              <p class="text-blue-100 text-sm">Generate a new token for your application</p>
            </div>
          </div>

          <!-- Modal Body -->
          <div class="px-8 py-8 space-y-5 bg-white dark:bg-[#1f2937]">
            <!-- Name Field -->
            <div>
              <label for="tokenName" class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Token Name <span class="text-red-500">*</span>
              </label>
              <input
                id="tokenName"
                v-model="newTokenForm.name"
                type="text"
                placeholder="e.g., Production API, Development Token"
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm"
              />
            </div>

            <!-- Description Field -->
            <div>
              <label for="tokenDescription" class="block text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
                Description <span class="text-gray-400 text-xs font-normal">(Optional)</span>
              </label>
              <textarea
                id="tokenDescription"
                v-model="newTokenForm.description"
                rows="3"
                placeholder="Enter a description for this token..."
                class="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-[#111827] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm resize-none"
              ></textarea>
            </div>

            <!-- Info Box -->
            <div class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div class="flex gap-3">
                <svg class="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none">
                  <path stroke="currentColor" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
                <div class="text-sm text-blue-800 dark:text-blue-300">
                  <p class="font-semibold mb-1">Important:</p>
                  <p class="text-xs">Make sure to copy and save your token after creation. You won't be able to see it again.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Modal Footer -->
          <div class="px-8 py-6 bg-gray-50 dark:bg-[#111827] flex gap-3">
            <button
              @click="closeCreateModal"
              class="flex-1 px-6 py-3 bg-white hover:bg-gray-50 dark:bg-[#374151] dark:hover:bg-[#4b5563] text-gray-900 dark:text-white font-semibold rounded-xl transition-all duration-200 border-2 border-gray-300 dark:border-gray-600"
            >
              Cancel
            </button>
            <button
              @click="confirmCreateToken"
              class="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none">
                <path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M12 5v14m-7-7h14"/>
              </svg>
              Create Token
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
/* Modal animations */
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

/* Fade animation for success message */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>