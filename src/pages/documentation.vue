<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue'
import { pageContents } from '@/pages/pageContents'
import { sections as rawSections } from '@/pages/sections'

interface DocItem {
  label: string
  slug: string
  href?: string
  icon?: string
  children?: DocItem[]
}

interface DocSection {
  id: string
  title: string
  icon: string
  subtitle?: string
  items: DocItem[]
}

const sections = rawSections as DocSection[]

const open = ref<Record<string, boolean>>({})
const activeSlug = ref('introduction')
const activePageContent = ref(pageContents.introduction)

const showFeedbackInput = ref(false)
const showThankYou = ref(false)
const feedbackText = ref('')
const feedbackInput = ref<HTMLInputElement | null>(null)

function toggle(sectionId: string) {
  open.value[sectionId] = !open.value[sectionId]
}

function isOpen(sectionId: string) {
  return !!open.value[sectionId]
}

// Sidebar state
function itemToggle(sectionId: string, itemSlug: string) {
  const key = `${sectionId}/${itemSlug}`
  open.value[key] = !open.value[key]
  activate(itemSlug)
}

function isItemOpen(sectionId: string, itemSlug: string) {
  return !!open.value[`${sectionId}/${itemSlug}`]
}

function activate(slug: string, href?: string) {
  activeSlug.value = slug

  if (pageContents[slug]) {
    activePageContent.value = pageContents[slug]
  }

  if (href) {
    window.location.href = href
  } else {
    window.location.hash = slug
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
}

function copyTitle() {
  const title = activePageContent.value.title
  if (navigator.clipboard) {
    navigator.clipboard.writeText(title).catch((err) => {
      console.error('Failed to copy title:', err)
    })
  }
}

function handleEmojiClick(_mood: 'happy' | 'neutral' | 'sad') {
  showFeedbackInput.value = true
  nextTick(() => {
    feedbackInput.value?.focus()
  })
}

function submitFeedback() {
  // Placeholder for sending feedback to backend/analytics
  const text = feedbackText.value.trim()
  if (text) {
    console.info('Documentation feedback:', text)
  }
  feedbackText.value = ''
  showFeedbackInput.value = false
  showThankYou.value = true

  setTimeout(() => {
    showThankYou.value = false
  }, 3000)
}

onMounted(() => {
  open.value['getting-started/introduction'] = true
})
</script>

<template>
  <main class="min-h-screen text-gray-100 py-8 mt-[6rem]">
    <div class="mx-auto px-6 grid grid-cols-12 gap-8">
      <!-- Sidebar -->
      <aside class="col-span-3 self-start">
        <div class="bg-[#ffffff] hover:bg-base-200 h-full p-4 text-sm rounded-md shadow-md bg-gradient-to-b dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
          <!-- Collapsible sections -->
          <nav class="space-y-1">
            <div v-for="section in sections" :key="section.id" class="">
              <button
                @click="toggle(section.id)"
                class="w-full flex items-center justify-between text-left px-3 py-2 rounded hover:bg-[#f7f9fc] dark:hover:bg-white/5 transition"
                :aria-expanded="isOpen(section.id)">
                <div class="flex items-center gap-2">
                  <svg v-if="section.icon" class="w-4 h-4 text-[#7a869a] dark:text-neutral-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" v-html="section.icon"></svg>
                  <div class="flex flex-col text-left">
                    <span :class="['text-xs uppercase tracking-wide', isOpen(section.id) ? 'text-[#000000] dark:text-[#ffffff] font-semibold' : 'text-[#7a869a] dark:text-gray-400 font-medium']">{{ section.title }}</span>
                    <span v-if="section.subtitle" class="text-xs text-[#7a869a] dark:text-neutral-400 mt-0.5">{{ section.subtitle }}</span>
                  </div>
                </div>
                <svg :class="['w-3.5 h-3.5 transition-transform', isOpen(section.id) ? 'rotate-90 text-[#7a869a]' : 'text-[#7a869a] dark:text-neutral-400']" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor" stroke-width="2" d="M9 6l6 6-6 6"/></svg>
              </button>

              <transition name="collapse">
                <ul v-show="isOpen(section.id)" class="pl-6 mt-2 space-y-1">
                  <li v-for="(item, idx) in section.items" :key="idx" class="relative">
                    <div v-if="item.children">
                      <button
                        @click.prevent="itemToggle(section.id, item.slug)"
                        :aria-expanded="isItemOpen(section.id, item.slug)"
                        :class="[ 'flex justify-between items-center w-full px-2 py-1.5 rounded text-sm transition-colors', isItemOpen(section.id, item.slug) ? 'text-[#1f4fd8] dark:text-[#4d9eff] font-medium' : 'text-[#000000] dark:text-[#ffffff] hover:bg-[#f7f9fc] dark:hover:bg-white/5']">
                        <span class="truncate">{{ item.label }}</span>
                        <svg :class="['w-3 h-3 transition-transform flex-shrink-0 ml-2', isItemOpen(section.id, item.slug) ? 'rotate-90 text-[#7a869a]' : 'text-[#7a869a] dark:text-neutral-400']" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" d="M9 6l6 6-6 6"/></svg>
                      </button>

                      <ul v-show="isItemOpen(section.id, item.slug)" class="pl-4 mt-1 space-y-0.5">
                        <li v-for="(child, cidx) in item.children" :key="cidx">
                          <a
                            :href="child.href || '#'+child.slug"
                            @click.prevent="activate(child.slug, child.href)"
                            :class="[ 'flex items-center w-full px-3 py-1.5 rounded text-sm transition-colors', activeSlug === child.slug ? 'text-[#1f4fd8] dark:text-[#4d9eff] font-medium' : 'text-[#7a869a] dark:text-[#b8c5d6] hover:text-[#000000] dark:hover:text-[#ffffff]']">
                            <span class="truncate">{{ child.label }}</span>
                          </a>
                        </li>
                      </ul>
                    </div>

                    <!-- Otherwise render as normal link -->
                    <a v-else
                      :href="item.href || '#'+item.slug"
                      @click.prevent="activate(item.slug, item.href)"
                      :class="[ 'flex justify-between items-center w-full px-3 py-1.5 rounded text-sm transition-colors', activeSlug === item.slug ? 'text-[#1f4fd8] dark:text-[#4d9eff] font-medium' : 'text-[#7a869a] dark:text-[#b8c5d6] hover:text-[#000000] dark:hover:text-[#ffffff]']">
                      <span>{{ item.label }}</span>
                      <svg class="w-3 h-3 text-[#7a869a] dark:text-neutral-400" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" d="M9 6l6 6-6 6"/></svg>
                    </a>
                  </li>
                </ul>
              </transition>
            </div>
          </nav>

          <hr class="my-4 border-neutral-700" />

          <div class="text-xs text-secondary">Top links for all Pocket Docs sections:</div>
          <div class="mt-2 grid grid-cols-1 gap-2">
            <a class="w-full text-left rounded px-3 py-2 bg-blue-600 hover:bg-blue-500 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-sky-300" href="#">Pocket Network Basics</a>
            <a class="w-full text-left rounded px-3 py-2 bg-blue-600 hover:bg-blue-500 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-sky-300" href="#">Contributing to Pocket</a>
            <a class="w-full text-left rounded px-3 py-2 bg-blue-600 hover:bg-blue-500 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-sky-300" href="#">Growing with $POKT</a>
            <a class="w-full text-left rounded px-3 py-2 bg-blue-600 hover:bg-blue-500 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-sky-300" href="#">Building on the Pocket Network</a>
            <a class="w-full text-left rounded px-3 py-2 bg-blue-600 hover:bg-blue-500 dark:bg-neutral-700 dark:hover:bg-neutral-600 text-sky-300" href="#">Welcome to Path</a>
          </div>

          <div class="mt-6">
            <a class="flex items-center gap-3 border border-neutral-700 rounded px-3 py-2 text-neutral-300 hover:bg-neutral-800" href="https://www.gitbook.com" target="_blank" rel="noopener noreferrer">
              <svg class="w-5 h-5 text-neutral-300" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="currentColor" stroke-width="1.4" d="M3 5a1 1 0 011-1h6l2 2h9v13a1 1 0 01-1 1H4a1 1 0 01-1-1V5z"/></svg>
              <span class="text-sm">Powered by GitBook</span>
            </a>
          </div>
        </div>
      </aside>

      <!-- Main content -->
      <section class="col-span-6">
        <header class="mb-6">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-3">
                <svg class="w-4 h-4 text-[#6b7280] dark:text-[#9ca3af]" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="1.5"/>
                </svg>
                <span class="text-[11px] uppercase tracking-wider font-semibold text-[#6b7280] dark:text-[#9ca3af]">{{ activePageContent.breadcrumb }}</span>
              </div>
              <h1 id="page-title" class="text-[2rem] font-bold text-[#111827] dark:text-[#f9fafb] leading-tight">{{ activePageContent.title }}</h1>
              <p class="text-[15px] text-[#6b7280] dark:text-[#9ca3af] mt-3 leading-relaxed">{{ activePageContent.subtitle }}</p>
            </div>
            <div class="flex items-center gap-2">
              <button @click="copyTitle" class="flex items-center gap-2 px-3 py-2 text-[13px] font-medium text-[#374151] dark:text-[#d1d5db] bg-white dark:bg-[#1f2937] border border-[#d1d5db] dark:border-[#374151] rounded-md hover:bg-[#f9fafb] dark:hover:bg-[#374151] transition shadow-sm"> 
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" stroke-width="2" fill="none"/>
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
                Copy
              </button>
              <button class="p-2 text-[#374151] dark:text-[#d1d5db] bg-white dark:bg-[#1f2937] border border-[#d1d5db] dark:border-[#374151] rounded-md hover:bg-[#f9fafb] dark:hover:bg-[#374151] transition shadow-sm">
                <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none">
                  <path stroke="currentColor" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        <article class="prose prose-lg max-w-none flex flex-col gap-6">
          <div v-html="activePageContent.content" class="content-area text-[#374151] dark:text-[#d1d5db]"></div>

          <h3 class="mt-6 text-[1.1rem] font-semibold text-[#000000] dark:text-[#ffffff]">Top links for all Pocket Docs sections:</h3>
          <div class="grid grid-cols-2 gap-3 mt-3">
            <a class="block rounded px-4 py-3 border border-[#e5e7eb] dark:border-white/10 hover:bg-[#f7f9fc] dark:hover:bg-white/5 transition" href="#">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="1.5" d="M4 6h16M4 12h16M4 18h16"/></svg>
                <span class="text-sm font-medium text-[#000000] dark:text-[#ffffff]">Pocket Network Basics</span>
              </div>
            </a>
            <a class="block rounded px-4 py-3 border border-[#e5e7eb] dark:border-white/10 hover:bg-[#f7f9fc] dark:hover:bg-white/5 transition" href="#">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="1.5" d="M12 3v18M3 12h18"/></svg>
                <span class="text-sm font-medium text-[#000000] dark:text-[#ffffff]">Contributing to Pocket</span>
              </div>
            </a>
            <a class="block rounded px-4 py-3 border border-[#e5e7eb] dark:border-white/10 hover:bg-[#f7f9fc] dark:hover:bg-white/5 transition" href="#">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="1.5" d="M12 2l3 7h7l-5.5 4 2 7L12 17l-6.5 3 2-7L2 9h7z"/></svg>
                <span class="text-sm font-medium text-[#000000] dark:text-[#ffffff]">Growing with $POKT</span>
              </div>
            </a>
            <a class="block rounded px-4 py-3 border border-[#e5e7eb] dark:border-white/10 hover:bg-[#f7f9fc] dark:hover:bg-white/5 transition" href="#">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="1.5" d="M3 7h18v10H3z"/></svg>
                <span class="text-sm font-medium text-[#000000] dark:text-[#ffffff]">Businesses on Pocket</span>
              </div>
            </a>
            <a class="block rounded px-4 py-3 border border-[#e5e7eb] dark:border-white/10 hover:bg-[#f7f9fc] dark:hover:bg-white/5 transition" href="#">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="1.5" d="M4 6h16M4 12h8"/></svg>
                <span class="text-sm font-medium text-[#000000] dark:text-[#ffffff]">Building on the Pocket Network</span>
              </div>
            </a>
            <a class="block rounded px-4 py-3 border border-[#e5e7eb] dark:border-white/10 hover:bg-[#f7f9fc] dark:hover:bg-white/5 transition" href="#">
              <div class="flex items-center gap-2">
                <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="1.5" d="M3 12h18"/></svg>
                <span class="text-sm font-medium text-[#000000] dark:text-[#ffffff]">Welcome to Pokt Roll</span>
              </div>
            </a>
            <a class="block rounded px-4 py-3 border border-[#e5e7eb] dark:border-white/10 hover:bg-[#f7f9fc] dark:hover:bg-white/5 transition col-span-2" href="#">
              <div class="flex items-center gap-2">
                <span class="text-sm font-medium text-[#000000] dark:text-[#ffffff]">PATH Welcome Page</span>
              </div>
            </a>
          </div>

          <hr class="my-6 border-[#e5e7eb] dark:border-neutral-700" />

          <h3 class="text-[1rem] font-medium text-[#000000] dark:text-[#ffffff]">Next, let's look into these actors and help you go on your own journey with the Pocket Network…</h3>

          <div class="mt-4 p-4 rounded-lg border border-[#e5e7eb] dark:border-white/10 bg-[#f7f9fc] dark:bg-white/5 hover:bg-[#eef3fb] dark:hover:bg-white/10 transition cursor-pointer">
            <div class="flex items-center justify-between">
              <div class="flex flex-col">
                <span class="text-xs text-[#7a869a] dark:text-gray-400">Next</span>
                <span class="text-sm font-medium text-[#000000] dark:text-[#ffffff] mt-1">Actors on the Pocket Network</span>
              </div>
              <svg class="w-5 h-5 text-[#7a869a]" viewBox="0 0 24 24" fill="none"><path stroke="currentColor" stroke-width="2" d="M9 6l6 6-6 6"/></svg>
            </div>
          </div>

          <footer class="mt-10 text-xs text-[#7a869a] dark:text-neutral-400">Last updated 5 days ago</footer>
        </article>
      </section>

      <!-- Right Sidebar with Feedback Widget -->
      <section class="col-span-3">
        <article class="flex flex-col gap-4">
          <!-- Active Page Card -->
          <div class="rounded-lg bg-[#f7f9fc] dark:bg-white/5 border border-[#e6ebf2] dark:border-white/10 p-4 cursor-pointer hover:bg-[#eef3fb] dark:hover:bg-white/10 transition">
            <p class="text-[13px] font-medium text-[#1f4fd8] dark:text-[#4d9eff] leading-snug">
              On Unstoppable Open Data & The Crypto-Native API Layer
            </p>
          </div>

          <!-- Label -->
          <div>
            <p class="text-[11px] uppercase tracking-wide text-[#7a869a] dark:text-gray-400 font-semibold mb-3">
              Top links for all Pocket Docs sections:
            </p>
            <a href="#" class="block text-sm text-[#1f4fd8] dark:text-[#4d9eff] hover:underline">
              Top links for all Pocket Docs sections
            </a>
          </div>

          <!-- Divider -->
          <div class="h-px bg-[#e6ebf2] dark:bg-white/10"></div>

          <!-- Feedback Widget -->
          <div class="flex flex-col gap-3">
            <p class="text-[13px] text-[#000000] dark:text-[#ffffff] font-medium">
              Was this helpful?
            </p>

            <!-- Emoji Buttons -->
            <div v-if="!showFeedbackInput && !showThankYou" class="flex gap-2">
              <button
                @click="handleEmojiClick('happy')"
                class="w-9 h-9 flex items-center justify-center rounded-full border border-[#e6ebf2] dark:border-white/10 hover:bg-[#eef3fb] dark:hover:bg-white/10 text-[18px] transition"
                title="Yes, this was helpful"
              >
                🙂
              </button>

              <button
                @click="handleEmojiClick('neutral')"
                class="w-9 h-9 flex items-center justify-center rounded-full border border-[#e6ebf2] dark:border-white/10 hover:bg-[#eef3fb] dark:hover:bg-white/10 text-[18px] transition"
                title="It was okay"
              >
                😐
              </button>

              <button
                @click="handleEmojiClick('sad')"
                class="w-9 h-9 flex items-center justify-center rounded-full border border-[#e6ebf2] dark:border-white/10 hover:bg-[#eef3fb] dark:hover:bg-white/10 text-[18px] transition"
                title="No, this wasn't helpful"
              >
                🙁
              </button>
            </div>

            <!-- Feedback Input Box -->
            <div v-if="showFeedbackInput" class="flex flex-col gap-3">
              <input
                v-model="feedbackText"
                ref="feedbackInput"
                type="text"
                placeholder="Anything you'd like to add?"
                class="w-full px-3 py-2.5 text-[14px] border border-[#e6ebf2] dark:border-white/20 rounded-lg bg-white dark:bg-[#1a1a1a] text-[#000000] dark:text-[#ffffff] placeholder:text-[#7a869a] dark:placeholder:text-gray-500 focus:outline-none focus:border-[#1f4fd8] focus:ring-2 focus:ring-[#1f4fd8]/20 transition"
              />
              <button
                @click="submitFeedback"
                class="self-start px-4 py-2 text-[13px] font-medium text-white bg-[#1f4fd8] rounded-lg hover:bg-[#1a42b8] transition shadow-sm"
              >
                Submit
              </button>
            </div>

            <!-- Thank You Message -->
            <div v-if="showThankYou" class="flex items-center gap-2 py-2">
              <span class="text-green-500 text-[18px]">✓</span>
              <span class="text-[14px] font-medium text-green-500">Thank you!</span>
            </div>
          </div>

          <!-- GitBook Card -->
          <div class="mt-6 rounded-lg border border-[#e6ebf2] dark:border-white/10 bg-white dark:bg-white/5 p-4">
            <div class="flex items-start gap-3">
              <div class="w-12 h-12 bg-[#f7f9fc] dark:bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg class="w-7 h-7 text-[#7a869a] dark:text-gray-400" viewBox="0 0 24 24" fill="none">
                  <path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-[12px] text-[#7a869a] dark:text-gray-400 mb-1">
                  Published for free with GitBook's Community Plan
                </p>
                <a href="https://www.gitbook.com" target="_blank" class="text-[13px] text-[#1f4fd8] dark:text-[#4d9eff] hover:underline font-medium">
                  Sponsored via GitBook
                </a>
              </div>
            </div>
          </div>
        </article>
      </section>
    </div>
  </main>
</template>

<style scoped>
@media (min-width: 1024px) {
  aside { position: -webkit-sticky; position: sticky; top: 2rem; }
}

.collapse-enter-from,
.collapse-leave-to {
  max-height: 0;
  opacity: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  max-height: 500px;
  opacity: 1;
}
.collapse-enter-active,
.collapse-leave-active {
  transition: max-height .2s ease, opacity .15s ease;
}

/* Content area styling */
.content-area h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin-top: 2rem;
  margin-bottom: 1rem;
}
.dark .content-area h2 {
  color: #f9fafb;
}
.content-area h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #111827;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}
.dark .content-area h3 {
  color: #f9fafb;
}
.content-area p {
  font-size: 15px;
  line-height: 1.7;
  margin-bottom: 1rem;
  color: #374151;
}
.dark .content-area p {
  color: #d1d5db;
}
.content-area strong {
  font-weight: 600;
  color: #111827;
}
.dark .content-area strong {
  color: #f9fafb;
}
</style>