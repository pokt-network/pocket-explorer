<script lang="ts" setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useStakingStore, useBaseStore, useFormatter } from '@/stores'
import { PageRequest } from '@/types'
import { useBlockchain } from '@/stores'
import { Icon } from '@iconify/vue';
import { useSEO } from '@/composables/useSEO';

const props = defineProps(['chain'])
const tab = ref('blocks')
const base = useBaseStore()
const stakingStore = useStakingStore();
stakingStore.init()
const format = useFormatter()
const blockchain = useBlockchain()

// SEO Meta Tags
const chainName = computed(() => blockchain.current?.chainName || props.chain || 'Pocket Network');
useSEO({
  title: `${chainName.value} Blocks`,
  description: `Browse all blocks on the ${chainName.value} blockchain. View block height, transactions, validators, timestamps, and block details on the Pocket Network Explorer.`,
  keywords: `${chainName.value}, blocks, blockchain blocks, block explorer, block height, block details`,
});

const currentBlockHeight = computed(() => {
  return base.latest?.block?.header?.height ?? 0
})

const currentTxCount = computed(() => {
  return base.latest?.block?.data?.txs?.length ?? 0
})

// Fallback state
const isNodeFallback = ref(false)
const fallbackError = ref('')

// Network Stats
const networkStats = ref({
  wallets: 0,
  applications: 0,
  suppliers: 0,
  gateways: 0,
})

// Cache control
const networkStatsCacheTime = ref(0)
const CACHE_EXPIRATION_MS = 60000

// Load network stats
async function loadNetworkStats() {
  const now = Date.now()
  if (now - networkStatsCacheTime.value < CACHE_EXPIRATION_MS && networkStats.value.wallets > 0) {
    return
  }
  const pageRequest = new PageRequest()
  pageRequest.limit = 1
  try {
    const [applicationsData, suppliersData, gatewaysData] = await Promise.all([
      blockchain.rpc.getApplications(pageRequest),
      blockchain.rpc.getSuppliers(pageRequest),
      blockchain.rpc.getGateways(pageRequest),
    ])
    networkStats.value.applications = parseInt(applicationsData.pagination?.total || '0')
    networkStats.value.suppliers = parseInt(suppliersData.pagination?.total || '0')
    networkStats.value.gateways = parseInt(gatewaysData.pagination?.total || '0')
    networkStatsCacheTime.value = now
  } catch (error) {
    console.error('Error loading network stats:', error)
  }
}

// API blocks interface
interface ApiBlockItem {
  id: string
  height: number
  hash: string
  timestamp: string
  proposer: string
  chain: string
  transaction_count?: number
  // size?: number
  block_production_time?: number
  raw_block_size?: number
}

const getApiChainName = (chainName: string) => {
  const chainMap: Record<string, string> = {
    'pocket-lego-testnet': 'pocket-lego-testnet',
    'pocket-mainnet': 'pocket-mainnet'
  }
  return chainMap[chainName] || chainName || 'pocket-lego-testnet'
}

const chainStore = useBlockchain()
const apiChainName = computed(() =>
  getApiChainName(chainStore.current?.chainName || props.chain || 'pocket-beta')
)

const blocks = ref<ApiBlockItem[]>([])
const loading = ref(false)
const currentPage = ref(1)
const itemsPerPage = ref(25)
const totalBlocks = ref(0)
const totalPages = ref(0)
const pageSizeOptions = [10, 25, 50, 100]

// Block statistics from API meta
const avgBlockProductionTime = ref<number | null>(null)
const avgBlockSize = ref<number | null>(null)

function updateCurrentBlockProductionTime() {
  if (!Array.isArray(blocks.value)) return
  const height = currentBlockHeight.value
  // Ensure both values are of the same type for comparison
  const block = blocks.value.find(b => String(b.height) === String(height))
}

// ⭐ Watch block list changed
watch(blocks, () => {
  updateCurrentBlockProductionTime()
})

// ⭐ Watch current block height changed
watch(currentBlockHeight, () => {
  updateCurrentBlockProductionTime()
})

// 🔹 Server se blocks fetch karo
async function getBlocksFromServer() {
  try {
    const url = `/api/v1/blocks?chain=${apiChainName.value}&page=${currentPage.value}&limit=${itemsPerPage.value}`

    const res = await fetch(url)

    if (!res.ok) {
      throw new Error('Server down')
    }

    const text = await res.text()

    if (!text) {
      throw new Error('Empty server response')
    }

    return JSON.parse(text)

  } catch (err) {
    console.warn('Server failed, switching to node...')
    throw err
  }
}

// 🔹 Node se blocks fetch karo (fallback)
async function getBlocksFromNode() {
  try {
    console.log('[Node Fallback] Starting node fallback...')

    // Wait for RPC to be ready (max 10 seconds)
    let rpcRetries = 0
    while (!blockchain.rpc && rpcRetries < 20) {
      console.log(`[Node Fallback] Waiting for RPC... retry ${rpcRetries + 1}/20`)
      await new Promise(resolve => setTimeout(resolve, 500))
      rpcRetries++
    }

    if (!blockchain.rpc) {
      console.error('[Node Fallback] RPC not available after waiting')
      throw new Error('RPC not available')
    }

    console.log('[Node Fallback] RPC is available')

    // Try to fetch latest block from RPC directly if base store doesn't have it
    if (!base.latest?.block?.header?.height) {
      console.log('[Node Fallback] Base store has no block data, fetching from RPC...')
      try {
        const latestBlock = await blockchain.rpc.getBaseBlockLatest()
        if (latestBlock?.block?.header?.height) {
          base.latest = latestBlock
          console.log('[Node Fallback] Successfully fetched latest block:', latestBlock.block.header.height)
        }
      } catch (err) {
        console.warn('[Node Fallback] Could not fetch latest block from RPC:', err)
      }
    } else {
      console.log('[Node Fallback] Base store already has block data:', base.latest.block.header.height)
    }

    // Get latest blocks from base store
    let retries = 0
    while (!base.latest?.block?.header?.height) {
      if (retries > 10) {
        throw new Error('Node not responding - no block data available')
      }
      await new Promise(r => setTimeout(r, 500))
      retries++
    }

const latestBlock = base.latest.block
const currentHeight = Number(latestBlock.header.height)


    const endHeight = currentHeight - ((currentPage.value - 1) * itemsPerPage.value)
    const startHeight = Math.max(endHeight - itemsPerPage.value + 1, 1)

    const blockPromises = []

    for (let height = endHeight; height >= startHeight; height--) {
      blockPromises.push(
        blockchain.rpc.getBaseBlockAt(String(height)).catch(() => null)
      )
    }


    const fetchedBlocks = await Promise.all(blockPromises)
    
    const nodeBlocks = fetchedBlocks
      .filter(block => block !== null)
      .map((block: any) => ({
        id: `${block.block?.header?.chain_id}:${block.block?.header?.height}`,
        height: parseInt(block.block?.header?.height || '0'),
        hash: block.block_id?.hash || '',
        timestamp: block.block?.header?.time || new Date().toISOString(),
        proposer: block.block?.header?.proposer_address || '',
        chain: block.block?.header?.chain_id || apiChainName.value,
        transaction_count: block.block?.data?.txs?.length || 0,
        block_production_time: 0,
        raw_block_size: 0,
        size: 0
      }))

    return {
      blocks: nodeBlocks,
      total: currentHeight,
      totalPages: Math.ceil(currentHeight / itemsPerPage.value),
      avgBlockProductionTime: null,
      avgBlockSize: null
    }
  } catch (error) {
    console.error('Node fallback error:', error)
    return {
      blocks: [],
      total: 0,
      totalPages: 0,
      avgBlockProductionTime: null,
      avgBlockSize: null
    }
  }
}

// 🔹 Main load function with fallback logic
async function loadBlocks() {
  loading.value = true
  fallbackError.value = ''

  try {
    const serverData = await getBlocksFromServer()

    // Indexer returns { data: [...], meta: { total, page, limit, totalPages, avgBlockProductionTime, avgBlockSize } }
    const rawBlocks = serverData?.data ?? serverData?.blocks ?? serverData
    blocks.value = Array.isArray(rawBlocks) ? rawBlocks : []
    const meta = serverData?.meta ?? serverData
    totalBlocks.value = meta?.total ?? serverData?.total ?? blocks.value.length
    totalPages.value = meta?.totalPages ?? serverData?.totalPages ?? (Math.ceil(totalBlocks.value / itemsPerPage.value) || 0)
    avgBlockProductionTime.value = meta?.avgBlockProductionTime ?? serverData?.avgBlockProductionTime ?? null
    avgBlockSize.value = meta?.avgBlockSize ?? serverData?.avgBlockSize ?? null

    isNodeFallback.value = false

  } catch (serverError) {
    console.warn('Server failed, trying node fallback...', serverError)

    try {
      isNodeFallback.value = true

      const nodeData = await getBlocksFromNode()

      blocks.value = nodeData.blocks
      totalBlocks.value = nodeData.total
      totalPages.value = nodeData.totalPages
      avgBlockProductionTime.value = nodeData.avgBlockProductionTime
      avgBlockSize.value = nodeData.avgBlockSize
    } catch (nodeError: any) {
      console.error('Node fallback also failed:', nodeError)
      fallbackError.value = nodeError.message || 'Both server and node are unavailable'
      isNodeFallback.value = true
      // Keep previous data or show empty
      if (blocks.value.length === 0) {
        blocks.value = []
        totalBlocks.value = 0
        totalPages.value = 0
      }
    }
  }

  loading.value = false
}



// Watchers
watch(itemsPerPage, () => { currentPage.value = 1; loadBlocks() })
watch(currentPage, () => loadBlocks())
watch(apiChainName, (n, o) => { if(n!==o){ currentPage.value=1; loadBlocks() } })

// Convert bytes → largest appropriate unit (B, KB, MB, GB, TB, PB)
function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const k = 1024
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  // Clamp i to valid unit index
  const unitIndex = Math.min(i, units.length - 1)
  const value = bytes / Math.pow(k, unitIndex)
  // Format with appropriate decimal places
  const decimals = unitIndex === 0 ? 0 : value < 10 ? 2 : 1
  return `${value.toFixed(decimals)} ${units[unitIndex]}`
}

// ✅ Format production time for single block
function formatProductionTime(secondsStr?: string | number) {
  if (!secondsStr) return "0s"
  const totalSeconds =
    typeof secondsStr === "string" ? parseFloat(secondsStr) : secondsStr
  if (!totalSeconds || isNaN(totalSeconds)) return "0s"
  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds)}s`  // 0-59s ke liye direct seconds
  }
  const minutes = Math.floor(totalSeconds / 60)  // total seconds ko minutes me convert
  const seconds = Math.round(totalSeconds % 60)  // remaining seconds
  return `${minutes}m ${seconds}s`  // 60s ya us se upar ko minutes + seconds format me
}

// ✅ Compute average production time of all loaded blocks
const averageBlockProductionTime = computed(() => {
  if (!blocks.value.length) return "0s"
  const total = blocks.value.reduce((sum, block) => {
    const time = block.block_production_time ? parseFloat(block.block_production_time as any) : 0
    return sum + time
  }, 0)
  const avgSeconds = total / blocks.value.length
  return formatProductionTime(avgSeconds) // yaha pe same function use ho raha hai
})

// Convert seconds → "Xs" or "Xm Ys" without decimal in seconds
function formatBlockTime(secondsStr?: string | number) {
  if (!secondsStr) return '0s'
  const totalSeconds = typeof secondsStr === 'string' ? parseFloat(secondsStr) : secondsStr
  if (totalSeconds < 60) {
    return `${Math.round(totalSeconds)}s` // sirf seconds, rounded
  }
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = Math.round(totalSeconds % 60) // seconds rounded to integer
  return `${minutes}m ${seconds}s` // minutes aur seconds, no decimal
}


// Pagination
function goToFirst() { if (currentPage.value !== 1) currentPage.value = 1 }
function goToLast() { if (currentPage.value !== totalPages.value) currentPage.value = totalPages.value }
function nextPage() { if (currentPage.value < totalPages.value) currentPage.value++ }
function prevPage() { if (currentPage.value > 1) currentPage.value-- }

// Auto-load on mount
onMounted(() => {
  loadNetworkStats()
  loadBlocks()
})
</script>

<template>
  <div class="pt-[6.5rem]">
    <!-- 🔴 Fallback Warning Banner -->
    <div
      v-if="isNodeFallback"
      :class="fallbackError ? 'bg-red-100 border-red-400 text-red-700' : 'bg-yellow-100 border-yellow-400 text-yellow-700'"
      class="border px-4 py-3 rounded-xl mb-4 shadow-md"
      role="alert"
    >
      <div class="flex items-center">
        <Icon :icon="fallbackError ? 'mdi:alert-octagon' : 'mdi:alert-circle'" class="mr-2 text-xl" />
        <span class="font-medium">
          <span v-if="!fallbackError">Currently showing data from node because main server is down.</span>
          <span v-else>Unable to load data: {{ fallbackError }}. Please check your RPC connection or try again later.</span>
        </span>
      </div>
    </div>

    <p class="bg-[#ffffff] hover:bg-base-200 text-2xl w-full px-4 py-4 my-4 font-bold text-[#000000] dark:text-[#ffffff] rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">Blocks</p>
    <div class="grid sm:grid-cols-1 md:grid-cols-4 py-4 gap-4 mb-4">
      <div class="flex bg-[#ffffff] hover:bg-base-200 p-4 rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
        <span>
          <div class="text-xs text-[#64748B]">Latest Blocks</div>
          <div class="flex justify-center items-center">
            <div class="font-bold">{{ currentBlockHeight }}</div>
            <Icon icon="mdi:content-copy" class="ml-2 cursor-pointer text-[#64748B]" />
          </div>
        </span>
      </div>
      <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
        <span>
          <div class="text-xs text-[#64748B]">Transactions</div>
          <div class="font-bold">{{ currentTxCount }}</div>
        </span>
      </div>
      <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
        <span>
          <div class="text-xs text-[#64748B]">Production Time (Avg. 24H)</div>
          <div class="font-bold">{{ avgBlockProductionTime !== null ? formatProductionTime(avgBlockProductionTime) : '-' }}</div>
        </span>
      </div>
      <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
        <span>
          <div class="text-xs text-[#64748B]">Total Size (Avg. 24H)</div>
          <div class="font-bold">{{ avgBlockSize !== null ? formatBytes(avgBlockSize) : '-' }}</div>
        </span>
      </div>
    </div>

    <div
      v-show="tab === 'blocks'"
      class="bg-base-200 px-0.5 pt-0.5 pb-4 mb-4 rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg"
    >
      <div class="bg-base-200 rounded-md overflow-auto">
        <table class="table table-compact w-full">
          <thead class="dark:bg-[rgba(255,255,255,.03)] bg-base-200 sticky top-0 border-0">
            <tr class="border-b-[0px] text-sm font-semibold">
              <th>{{ $t('block.block_header') }}</th>
              <th>{{ $t('account.hash') }}</th>
              <th>{{ $t('block.proposer') }}</th>
              <th>{{ $t('account.no_of_transactions') }}</th>
              <th>{{ $t('account.time') }}</th>
              <th>{{ $t('block.production_time') }}</th>
              <th>{{ $t('block.application') }}</th>
              <th>{{ $t('block.supplier') }}</th>
              <th>{{ $t('block.gateway') }}</th>
              <!-- <th>{{ $t('block.relay') }}</th> -->
              <th>{{ $t('block.size') }}</th>
            </tr>
          </thead>

          <tbody class="bg-base-100 relative">
            <tr v-if="loading">
              <td colspan="11" class="py-8">
                <div class="flex justify-center items-center">
                  <div class="loading loading-spinner loading-md"></div>
                  <span class="ml-2">Loading blocks...</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="!loading && blocks.length === 0">
              <td colspan="11" class="py-8 text-center text-gray-500">No blocks found</td>
            </tr>
            <tr
              v-else
              v-for="block in blocks"
              :key="block.id"
              class="hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.06)] dark:bg-base-200 bg-white border-0 rounded-xl"
            >
              <td class="font-medium dark:text-warning text-[#09279F]">{{ block.height }}</td>
              <td
                class="truncate dark:text-warning text-[#09279F]"
                style="max-width: 18rem; overflow: hidden"
              >
                <RouterLink
                  class="truncate hover:underline"
                  :title="block.hash"
                  :to="`/${props.chain}/blocks/${block.height}`"
                >
                  {{ block.hash || block.id.split(':')[1] }}
                </RouterLink>
              </td>
              <td>{{ format.validator(block.proposer) }}</td>
              <td>{{ (block.transaction_count ?? 0).toLocaleString() }}</td>
              <td>{{ format.toDay(block.timestamp, 'from') }}</td>
              <td>{{ formatBlockTime(block.block_production_time) }}</td>
              <td>{{ networkStats.applications.toLocaleString() }}</td>
              <td>{{ networkStats.suppliers.toLocaleString() }}</td>
              <td>{{ networkStats.gateways.toLocaleString() }}</td>
              <!-- <td>{{ 0 }}</td> -->
              <td>{{ formatBytes(block.raw_block_size) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Pagination Bar -->
        <div class="flex justify-between items-center gap-4 my-6 px-6">
          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">Show:</span>
            <select v-model="itemsPerPage" class="select select-bordered select-sm w-20">
              <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size }}</option>
            </select>
            <span class="text-sm text-gray-600">per page</span>
          </div>

          <div class="flex items-center gap-2">
            <span class="text-sm text-gray-600">
              Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to {{ Math.min(currentPage * itemsPerPage, totalBlocks) }} of {{ totalBlocks }} blocks
            </span>
            <div class="flex items-center gap-1">
              <button class="page-btn bg-[#f8f9fa] border border-[#ccc] rounded px-[10px] py-[5px] cursor-pointer text-[#007bff] transition-colors duration-200 hover:bg-[#e9ecef] disabled:opacity-50 disabled:cursor-not-allowed text-[14px]" 
                @click="goToFirst" :disabled="currentPage === 1 || totalPages === 0">First</button>
              <button class="page-btn bg-[#f8f9fa] border border-[#ccc] rounded px-[10px] py-[5px] cursor-pointer text-[#007bff] transition-colors duration-200 hover:bg-[#e9ecef] disabled:opacity-50 disabled:cursor-not-allowed text-[14px]" 
                @click="prevPage" :disabled="currentPage === 1 || totalPages === 0">&lt;</button>
              <span class="text-xs px-2">Page {{ currentPage }} of {{ totalPages }}</span>
              <button class="page-btn bg-[#f8f9fa] border border-[#ccc] rounded px-[10px] py-[5px] cursor-pointer text-[#007bff] transition-colors duration-200 hover:bg-[#e9ecef] disabled:opacity-50 disabled:cursor-not-allowed text-[14px]" 
                @click="nextPage" :disabled="currentPage === totalPages || totalPages === 0">&gt;</button>
              <button class="page-btn bg-[#f8f9fa] border border-[#ccc] rounded px-[10px] py-[5px] cursor-pointer text-[#007bff] transition-colors duration-200 hover:bg-[#e9ecef] disabled:opacity-50 disabled:cursor-not-allowed text-[14px]" 
                @click="goToLast" :disabled="currentPage === totalPages || totalPages === 0">Last</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<route>
  {
    meta: {
      i18n: 'blocks',
      order: 2
    }
  }
</route>

<style scoped>
.table tr.h-0 {
    display: table-row;
    line-height: 0;
    height: 0;
}
.table tr.h-0 td {
    padding: 0;
    border: none;
}
.page-btn:hover {
  background-color: #e9ecef;
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>