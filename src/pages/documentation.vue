<script setup lang="ts">
import { ref, onMounted } from 'vue'

// Sidebar sections
const openSections = ref({
  endpoints: true,
  files: true,
  attach: false,
})

// Main content expandable sections
const openContent = ref({
  codeExamples: false,
  security: false,
  queryParams: false,
  responseBody: true,
})

// Dark mode
const isDark = ref(true)

// Sidebar toggle
const toggleSection = (section: string) => {
  openSections.value[section] = !openSections.value[section]
}

// Content toggle
const toggleContent = (content: string) => {
  openContent.value[content] = !openContent.value[content]
}

// Theme toggle (optional button use)
const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
}

onMounted(() => {
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  isDark.value = prefersDark
  document.documentElement.classList.toggle('dark', prefersDark)
})
</script>

<template>
  <div class="text-gray-900 dark:text-gray-100 transition-colors duration-200 mt-[6.5rem]">
    <div class="flex h-screen">
      <!-- Sidebar -->
      <aside class="w-48 bg-gray-50 dark:bg-gray-800 border-r border-gray-300 dark:border-gray-700 overflow-y-auto">
        <div class="p-4">
          <h2 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">API console</h2>
          
          <nav class="space-y-1">
            <a href="#" class="block px-3 py-2 text-sm text-gray-700 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-gray-200 rounded">Summary</a>
            
            <button @click="toggleSection('endpoints')" class="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-900 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
              <span>Endpoints</span>
              <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': openSections.endpoints }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <button @click="toggleSection('files')" class="w-full flex items-center justify-between px-3 py-2 text-sm text-gray-900 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
              <span>Files</span>
              <svg class="w-4 h-4 transition-transform" :class="{ 'rotate-180': openSections.files }" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            <div v-if="openSections.files" class="ml-4 space-y-1">
              <a href="#" class="block px-3 py-1.5 text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Overview</a>
              
              <div class="space-y-1">
                <button class="w-full text-left px-3 py-1.5 text-sm bg-blue-600 text-white rounded font-medium">POST</button>
                <button class="w-full text-left px-3 py-1.5 text-sm bg-green-600 text-white rounded font-medium">GET list</button>
              </div>

              <button @click="toggleSection('attach')" class="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                <span>/attach</span>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              <a href="#" class="block px-3 py-1.5 text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Get file</a>

              <button class="w-full flex items-center justify-between px-3 py-1.5 text-sm text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                <span>/comments</span>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </nav>
        </div>

        <div class="absolute bottom-4 left-4 flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-500">
          <span>Powered by</span>
          <span class="font-semibold">MuleSoft</span>
        </div>
      </aside>

      <!-- Main Content -->
      <main class="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
        <div class="p-6">
          <div class="flex items-center justify-between mb-6">
            <h1 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">Google Drive</h1>
            <button class="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>

          <!-- Method Header -->
          <div class="mb-6">
            <div class="flex items-center space-x-3 mb-2">
              <span class="px-3 py-1 bg-green-600 text-white text-sm font-semibold rounded">GET</span>
              <span class="text-sm text-gray-700 dark:text-gray-300">https://www.googleapis.com/drive/v2/files</span>
            </div>
            <h2 class="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">List</h2>
            <p class="text-sm text-gray-600 dark:text-gray-400 mb-4">Lists the user's files. Try it now or see an example.</p>
            <p class="text-sm text-gray-800 dark:text-gray-300">
              Requests with <code class="px-1.5 py-0.5 bg-gray-200 dark:bg-gray-700 rounded text-xs text-gray-900 dark:text-gray-100">files.list</code> accept the q parameter, which is a search query combining one or more search terms. For more information, see Search for files.
            </p>
            <p class="text-sm text-gray-600 dark:text-gray-400 mt-2">
              <strong>Note:</strong> This method returns all files by default. This includes files with trashed=true in the results. Use the trashed=false query parameter to filter these from the results.
            </p>
          </div>

          <!-- Expandable Sections -->
          <div class="space-y-4 mb-6">
            <div class="border border-gray-300 dark:border-gray-700 rounded">
              <button @click="toggleContent('codeExamples')" class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Code examples</span>
                <span class="text-blue-600 dark:text-blue-400 text-sm">{{ openContent.codeExamples ? 'HIDE' : 'SHOW' }}</span>
              </button>
              <div v-if="openContent.codeExamples" class="px-4 py-3 border-t border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-850">
                <p class="text-sm text-gray-600 dark:text-gray-400">Code examples content here...</p>
              </div>
            </div>

            <div class="border border-gray-300 dark:border-gray-700 rounded">
              <button @click="toggleContent('security')" class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Security</span>
                <span class="text-blue-600 dark:text-blue-400 text-sm">{{ openContent.security ? 'HIDE' : 'SHOW' }}</span>
              </button>
            </div>

            <div class="border border-gray-300 dark:border-gray-700 rounded">
              <button @click="toggleContent('queryParams')" class="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-100 dark:hover:bg-gray-800">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Query parameters</span>
                <span class="text-blue-600 dark:text-blue-400 text-sm">{{ openContent.queryParams ? 'HIDE' : 'SHOW' }}</span>
              </button>
            </div>
          </div>

          <!-- Responses Section -->
          <div class="mb-6">
            <h3 class="text-lg font-semibold mb-4 text-gray-900 dark:text-gray-100">Responses</h3>
            
            <div class="border-b border-gray-300 dark:border-gray-700">
              <button class="px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400">
                200
              </button>
            </div>

            <div class="mt-4">
              <div class="flex items-center justify-between mb-2">
                <span class="text-sm font-medium text-gray-900 dark:text-gray-100">Body</span>
                <button @click="toggleContent('responseBody')" class="text-blue-600 dark:text-blue-400 text-sm">
                  {{ openContent.responseBody ? 'HIDE' : 'SHOW' }}
                </button>
              </div>

              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">Media type: <code class="text-gray-800 dark:text-gray-300">application/json</code></p>
              
              <div class="mb-4">
                <p class="text-sm font-medium mb-1 text-gray-900 dark:text-gray-100">FileList</p>
                <p class="text-sm text-gray-600 dark:text-gray-400 mb-1">DriveFileList</p>
                <p class="text-sm text-gray-500 dark:text-gray-500">A response body for the files list</p>
              </div>

              <div v-if="openContent.responseBody" class="bg-gray-100 dark:bg-gray-850 rounded overflow-hidden">
                <div class="bg-orange-500 px-4 py-2 flex items-center justify-between">
                  <div class="flex items-center space-x-2">
                    <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                    <span class="text-sm font-medium text-white">Example</span>
                  </div>
                  <div class="flex items-center space-x-4">
                    <button class="text-sm text-blue-100 hover:text-white">COPY</button>
                    <button class="text-sm text-blue-100 hover:text-white">TABLE VIEW</button>
                  </div>
                </div>
                <pre class="p-4 text-xs overflow-x-auto bg-gray-800 dark:bg-gray-900"><code class="text-green-400">{
  "kind": "drive#fileList",
  "etag": "\"LrBm7hq-jnLCmOdLEfaSAzNW/1hVMBOTro-NILAf9pm1Yy0zbZqwt\"",
  "selfLink": "https://www.googleapis.com/drive/v2/files?maxResults=1&orderBy=createdDate&orderBy=folder,modifiedDate%20desc,title",
  "incompleteSearch": false,
  "nextPageToken": "V143jBlABCl23DEFz6dSMhXAeVNszuZfbqb2Jnv+XNqMRljrDY-cB3nnjblro8d4CkG4InEuBhueXVjr8JEqRZtEJdcK5CRrMJtzNqjZznGuZfbqlvehueXfa",
  "nextLink": "https://www.googleapis.com/drive/v2/files?maxResults=1&orderBy=createdDate&orderBy=folder,modifiedDate%20desc,title&pageToken=V143jBlABCl23DEFz6dSMhXAeVNszuZfbqb2Jnv",
  "items": [
    {
      "kind": "drive#file",
      "id": "0B3qWa3d6u_abfGxZYmhEaUd1nZE1zd3c1jb3ZEb2IFdZaMNY"
    }
  ]
}</code></pre>
              </div>
            </div>
          </div>
        </div>
      </main>

      <!-- Right Sidebar -->
      <aside class="w-96 bg-gray-50 dark:bg-gray-800 border-l border-gray-300 dark:border-gray-700 overflow-y-auto p-6">
        <div class="mb-6">
          <h3 class="text-sm font-medium text-gray-600 dark:text-gray-400 mb-2">Request URL</h3>
          <div class="bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded text-sm text-gray-800 dark:text-gray-300 break-all">
            https://www.googleapis.com/drive/v2/files
          </div>
        </div>

        <div class="mb-6">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-medium text-gray-900 dark:text-gray-100">Query parameters</h3>
            <button class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">Show optional parameters</button>
          </div>
        </div>

        <div class="mb-6">
          <h3 class="text-sm font-medium mb-3 text-gray-900 dark:text-gray-100">Credentials</h3>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">OAuth 2.0</p>
          
          <div class="mb-4">
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-2">Grant type</label>
            <select class="w-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-200">
              <option>Access token (browser flow)</option>
            </select>
          </div>

          <div class="mb-4">
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-2">Client id</label>
            <div class="relative">
              <input 
                type="password" 
                value="••••••••••••••••••••••••••••••••••••••••••••••••"
                class="w-full bg-gray-200 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 text-sm text-gray-900 dark:text-gray-200"
                readonly
              />
              <button class="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              </button>
            </div>
          </div>

          <button class="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 mb-4">Advanced settings</button>

          <div class="mb-4">
            <label class="block text-xs text-gray-600 dark:text-gray-400 mb-2">Redirect URI</label>
            <p class="text-xs text-gray-500 dark:text-gray-500 mb-2">Set this redirect URI in OAuth 2.0 provider settings.</p>
            <div class="bg-gray-200 dark:bg-gray-700 px-3 py-2 rounded text-xs text-gray-800 dark:text-gray-300 break-all">
              https://auth.advancedrestclient.com/oauth-popup.html
            </div>
          </div>

          <button class="w-full bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-blue-600 dark:text-blue-400 font-medium py-2 px-4 rounded mb-2 text-sm">
            REQUEST ACCESS TOKEN
          </button>

          <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded text-sm">
            AUTHORIZE AND SEND
          </button>
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped>
.bg-gray-850 {
  background-color: #1a1d23;
}

code {
  font-family: 'Courier New', monospace;
}

pre {
  font-family: 'Courier New', monospace;
  line-height: 1.5;
}
</style>