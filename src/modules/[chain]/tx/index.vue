<script lang="ts" setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useBaseStore, useBlockchain, useFormatter } from '@/stores'
import { useRouter } from 'vue-router'
import { Icon } from '@iconify/vue'
import { fetchTransactions, type ApiTransaction, type TransactionFilters } from '@/libs/transactions'
import { secp256k1PubKeyToAccountAddress } from '@/libs/address'
import { isBech32Address } from '@/libs/utils'
import { useSEO } from '@/composables/useSEO';
import { PageRequest } from '@/types'
import { decodeTxRaw } from '@cosmjs/proto-signing'
import { fromBase64 } from '@cosmjs/encoding'
import { hashTx } from '@/libs'

const props = defineProps(['chain'])
const router = useRouter()

const tab = ref('recent')
const base = useBaseStore()
const chainStore = useBlockchain()
const format = useFormatter()

// SEO Meta Tags
const chainName = computed(() => chainStore.current?.chainName || props.chain || 'Pocket Network');
useSEO({
  title: `${chainName.value} Transactions`,
  description: `Explore all transactions on the ${chainName.value} blockchain. Search, filter, and view transaction details, hashes, fees, and status on the Pocket Network Explorer.`,
  keywords: `${chainName.value}, transactions, tx, transaction hash, blockchain transactions, transaction explorer`,
});

const hashReg = /^[A-Z\d]{64}$/
const hash = ref('')

// Map frontend chain names to API chain names
const getApiChainName = (chainName: string) => {
  const chainMap: Record<string, string> = {
    'pocket-lego-testnet': 'pocket-lego-testnet',
    'pocket-mainnet': 'pocket-mainnet'
  }
  return chainMap[chainName] || chainName || 'pocket-lego-testnet'
}

const current = chainStore?.current?.chainName || props.chain || 'pocket-beta'
const apiChainName = getApiChainName(current)

// 🔹 Pagination state
const currentPage = ref(1)
const itemsPerPage = ref(25)
const totalTransactions = ref(0)
const totalPages = ref(0)
const transactions = ref<ApiTransaction[]>([])
const loading = ref(false)

// Fallback state
const isNodeFallback = ref(false)
const fallbackError = ref('')

// 🔹 Last 24H Transactions
const tx24HCount = ref(0)
const failedLast24h = ref(0)

const currentTxCount = computed(() => {
  return base.latest?.block?.data?.txs?.length ?? 0
})

// 🔹 Page size options
const pageSizeOptions = [10, 25, 50, 100]

// 🔹 Filter state
const selectedTypeTab = ref<'all' | 'send' | 'claim' | 'proof' | 'governance' | 'staking'>('all')
const statusFilter = ref<string>('')
const startDate = ref<string>('')
const endDate = ref<string>('')
const minAmount = ref<number | undefined>(undefined)
const maxAmount = ref<number | undefined>(undefined)
const sortBy = ref<'timestamp' | 'amount' | 'fee' | 'block_height' | 'type' | 'status'>('timestamp')
const sortOrder = ref<'asc' | 'desc'>('desc')
const showAdvancedFilters = ref(false)

// 🔹 Type tab mappings
const typeTabMap: Record<string, string[]> = {
  all: [],
  send: ['MsgSend (bank)', 'MsgMultiSend (bank)'],
  claim: ['MsgCreateClaim (proof)'],
  proof: ['MsgSubmitProof (proof)'],
  governance: [
    'MsgSubmitProposal (governance)',
    'MsgVote (governance)',
    'MsgDeposit (governance)',
    'MsgVoteWeighted (governance)'
  ],
  staking: [
    'MsgDelegate (node)',
    'MsgUndelegate (node)',
    'MsgBeginRedelegate (node)',
    'MsgStakeApplication (application)',
    'MsgUnstakeApplication (application)',
    'MsgStakeSupplier (supplier)',
    'MsgUnstakeSupplier (supplier)',
    'MsgStakeGateway (gateway)',
    'MsgUnstakeGateway (gateway)'
  ]
}

// 🔹 Debounce timer
let debounceTimer: ReturnType<typeof setTimeout> | null = null

// 🔹 Server se transactions fetch karo
async function getTransactionsFromServer(filters: TransactionFilters) {
  const data = await fetchTransactions(filters)
  
  if (!data || !data.data) {
    throw new Error('Server request failed')
  }

  return {
    transactions: data.data || [],
    total: data.meta?.total || 0,
    totalPages: data.meta?.totalPages || 0,
    failedLast24h: data.meta?.failedLast24h ?? 0
  }
}

// 🔹 Node se transactions fetch karo (fallback) - Blocks fetch kar ke transactions decode karo
async function getTransactionsFromNode() {
  try {
    console.log('[Node Fallback TX] Starting transaction node fallback...')

    // Wait for RPC to be ready (max 10 seconds)
    let rpcRetries = 0
    while (!chainStore.rpc && rpcRetries < 20) {
      console.log(`[Node Fallback TX] Waiting for RPC... retry ${rpcRetries + 1}/20`)
      await new Promise(resolve => setTimeout(resolve, 500))
      rpcRetries++
    }

    if (!chainStore.rpc) {
      console.error('[Node Fallback TX] RPC not available after waiting')
      throw new Error('RPC not available')
    }

    console.log('[Node Fallback TX] RPC is available')

    // Try to fetch latest block from RPC directly if base store doesn't have it
    if (!base.latest?.block?.header?.height) {
      console.log('[Node Fallback TX] Base store has no block data, fetching from RPC...')
      try {
        const latestBlock = await chainStore.rpc.getBaseBlockLatest()
        if (latestBlock?.block?.header?.height) {
          base.latest = latestBlock
          console.log('[Node Fallback TX] Successfully fetched latest block:', latestBlock.block.header.height)
        }
      } catch (err) {
        console.warn('[Node Fallback TX] Could not fetch latest block from RPC:', err)
      }
    }

    // Wait for latest block data
    let retries = 0
    while (!base.latest?.block?.header?.height && retries < 10) {
      console.log(`[Node Fallback TX] Waiting for base.latest... retry ${retries + 1}/10`)
      await new Promise(resolve => setTimeout(resolve, 500))
      retries++
    }

    if (!base.latest?.block?.header?.height) {
      throw new Error('Node not responding - no block data available')
    }

    const latestBlock = base.latest.block
    const currentHeight = Number(latestBlock.header.height)

    console.log('[Node Fallback TX] Current height:', currentHeight)

    // Calculate pagination - transactions collect karne ke liye blocks fetch karenge
    // Pehle multiple blocks fetch karenge to get enough transactions
    const blocksToFetch = 50 // 50 blocks fetch karenge taake enough transactions mil jayein
    const startBlock = Math.max(currentHeight - ((currentPage.value - 1) * blocksToFetch) - blocksToFetch + 1, 1)
    const endBlock = Math.max(currentHeight - ((currentPage.value - 1) * blocksToFetch), 1)

    console.log(`[Node Fallback TX] Fetching blocks from ${startBlock} to ${endBlock}`)

    const blockPromises = []

    // Blocks fetch karo (getTxsAt ki jagah getBaseBlockAt use karenge)
    for (let height = endBlock; height >= startBlock; height--) {
      blockPromises.push(
        chainStore.rpc.getBaseBlockAt(String(height)).catch(() => null)
      )
    }

    const fetchedBlocks = await Promise.all(blockPromises)

    console.log(`[Node Fallback TX] Fetched ${fetchedBlocks.length} blocks`)

    // Ab blocks se transactions extract aur decode karo
    const allNodeTxs: ApiTransaction[] = []

    fetchedBlocks.forEach((block: any, blockIndex: number) => {
      if (!block || !block.block) return

      const height = endBlock - blockIndex
      const blockTime = block.block.header?.time || new Date().toISOString()
      const rawTxs = block.block.data?.txs || []

      console.log(`[Node Fallback TX] Block ${height} has ${rawTxs.length} raw transactions`)

      // Har raw transaction ko decode karo
      rawTxs.forEach((txBase64: string, txIndex: number) => {
        try {
          if (!txBase64) return

          // Base64 se decode karo
          const raw = fromBase64(txBase64)
          const txHash = hashTx(raw)
          const decodedTx = decodeTxRaw(raw)

          // Messages extract karo
          const messages = decodedTx.body?.messages || []
          if (messages.length === 0) return

          const firstMsg: any = messages[0]

          // Message type extract karo
          let msgType = firstMsg.typeUrl || 'Unknown'
          // Clean up: "/cosmos.bank.v1beta1.MsgSend" -> "MsgSend"
          if (msgType.includes('.')) {
            const parts = msgType.split('.')
            msgType = parts[parts.length - 1]
          }

          // Amount extract karo from message value
          let amount = '0'
          const msgValue = firstMsg.value || {}
          if (msgValue.amount && Array.isArray(msgValue.amount)) {
            amount = msgValue.amount[0]?.amount || '0'
          } else if (msgValue.amount) {
            amount = String(msgValue.amount)
          }

          // Fee extract karo
          let fee = '0'
          if (decodedTx.authInfo?.fee?.amount && Array.isArray(decodedTx.authInfo.fee.amount)) {
            fee = decodedTx.authInfo.fee.amount[0]?.amount || '0'
          }

          // Sender extract karo
          let sender = msgValue.fromAddress || msgValue.sender || msgValue.delegatorAddress || ''

          // Recipient extract karo
          let recipient = msgValue.toAddress || msgValue.recipient || msgValue.validatorAddress || ''

          allNodeTxs.push({
            id: `${height}-${txIndex}`,
            hash: txHash,
            block_id: block.block_id?.hash || '',
            block_height: parseInt(String(height)),
            status: 'success', // Agar block mein hai toh success hi hoga
            amount: amount,
            type: msgType,
            fee: fee,
            timestamp: blockTime,
            sender: sender,
            recipient: recipient,
            memo: decodedTx.body?.memo || '',
            chain: apiChainName,
            tx_data: decodedTx
          })
        } catch (err) {
          console.warn(`[Node Fallback TX] Error decoding transaction at height ${height}:`, err)
        }
      })
    })

    console.log('[Node Fallback TX] Successfully decoded transactions:', allNodeTxs.length)

    // Pagination apply karo
    const startIndex = 0
    const endIndex = itemsPerPage.value
    const paginatedTxs = allNodeTxs.slice(startIndex, endIndex)

    console.log('[Node Fallback TX] Returning', paginatedTxs.length, 'transactions for page', currentPage.value)

    // Total transactions ka rough estimate
    const avgTxPerBlock = allNodeTxs.length / blocksToFetch || 1
    const totalEstimate = Math.floor(currentHeight * avgTxPerBlock)

    return {
      transactions: paginatedTxs,
      total: totalEstimate,
      totalPages: Math.ceil(totalEstimate / itemsPerPage.value),
      failedLast24h: 0
    }
  } catch (error: any) {
    console.error('[Node Fallback TX] Node fallback failed:', error)
    throw error
  }
}

// 🔹 Main load function with fallback logic
async function loadTransactions() {
  loading.value = true
  fallbackError.value = ''

  try {
    const filters: TransactionFilters = {
      chain: apiChainName,
      page: currentPage.value,
      limit: itemsPerPage.value,
      sort_by: sortBy.value,
      sort_order: sortOrder.value,
    }

    const selectedTypes = typeTabMap[selectedTypeTab.value]
    if (selectedTypes.length > 0) {
      filters.type = selectedTypes[0]
    }

    if (statusFilter.value) {
      filters.status = statusFilter.value === 'success' ? "true" : "false"
    }
    if (startDate.value) {
      filters.start_date = new Date(startDate.value).toISOString()
    }
    if (endDate.value) {
      filters.end_date = new Date(endDate.value).toISOString()
    }
    if (minAmount.value !== undefined) {
      filters.min_amount = minAmount.value
    }
    if (maxAmount.value !== undefined) {
      filters.max_amount = maxAmount.value
    }

    // 1) Pehle server se try karo
    const serverData = await getTransactionsFromServer(filters)
    transactions.value = serverData.transactions
    totalTransactions.value = serverData.total
    totalPages.value = serverData.totalPages
    failedLast24h.value = serverData.failedLast24h
    isNodeFallback.value = false // server OK

  } catch (serverError) {
    console.warn('Server fetch failed, trying node fallback:', serverError)

    try {
      // 2) Agar server down/fail ho gaya to node data lo
      const nodeData = await getTransactionsFromNode()
      transactions.value = nodeData.transactions
      totalTransactions.value = nodeData.total
      totalPages.value = nodeData.totalPages
      failedLast24h.value = nodeData.failedLast24h
      isNodeFallback.value = true // ab node fallback hai
    } catch (nodeError: any) {
      console.error('Node fallback also failed:', nodeError)
      fallbackError.value = nodeError.message || 'Both server and node are unavailable'
      isNodeFallback.value = true
      // Keep previous data or show empty
      if (transactions.value.length === 0) {
        transactions.value = []
        totalTransactions.value = 0
        totalPages.value = 0
      }
    }
  } finally {
    loading.value = false
  }
}

// 🔹 Get last 24H transactions count
const getLast24HTransactionsCount = async () => {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  try {
    const data = await fetchTransactions({
      chain: apiChainName,
      page: 1,
      limit: 1,
      start_date: yesterday.toISOString(),
      end_date: now.toISOString(),
    })

    return data.meta?.total || 0
  } catch (error) {
    console.error("Error fetching last 24H transactions:", error)
    return 0
  }
}

// 🔹 Debounced load function
function debouncedLoad() {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }
  debounceTimer = setTimeout(() => {
    currentPage.value = 1
    loadTransactions()
  }, 300)
}

// 🔹 Watchers
watch([selectedTypeTab, statusFilter, startDate, endDate, minAmount, maxAmount, sortBy, sortOrder], () => {
  debouncedLoad()
})

watch(itemsPerPage, () => {
  currentPage.value = 1
  loadTransactions()
})

watch(currentPage, () => {
  loadTransactions()
})

// 🔍 Search function
function search() {
  if (hashReg.test(hash.value)) {
    router.push({ path: `/${current}/tx/${hash.value}` })
  }
}

// 🔹 Pagination functions
function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}
function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}
function goToFirst() {
  currentPage.value = 1
}
function goToLast() {
  currentPage.value = totalPages.value
}
function changePageSize(newSize: number) {
  itemsPerPage.value = newSize
}

// 🔹 Helper function to get account address from sender
function getSenderAddress(sender: string): string {
  if (!sender) return '';
  
  if (isBech32Address(sender)) {
    return sender;
  }
  
  const prefix = chainStore?.current?.bech32Prefix || 'pokt';
  return secp256k1PubKeyToAccountAddress(sender, prefix) || sender;
}

// 🔹 Mounted hook
onMounted(async () => {
  tab.value = String(router.currentRoute.value.query.tab || 'recent')
  await loadTransactions()

  // Initial 24H transactions count
  tx24HCount.value = await getLast24HTransactionsCount()

  // Refresh 24H count every 1 minute
  setInterval(async () => {
    tx24HCount.value = await getLast24HTransactionsCount()
  }, 60000)
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

    <p class="bg-[#ffffff] hover:bg-base-200 text-2xl w-full px-4 py-4 my-4 font-bold text-[#000000] dark:text-[#ffffff] rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">Transactions</p>
    
    <div class="grid sm:grid-cols-1 md:grid-cols-4 py-4 gap-4 mb-4">
      <!-- Transactions (24H) -->
      <div class="flex bg-[#ffffff] hover:bg-base-200 p-4 rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
        <span>
          <div class="text-xs text-[#64748B]">Transactions (24H)</div>
          <div class="font-bold">{{ tx24HCount.toLocaleString() }}</div>
        </span>
      </div>

      <!-- Failed Transactions (24H) from API -->
      <div class="flex bg-[#ffffff] hover:bg-base-200 p-4 rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
        <span>
          <div class="text-xs text-[#64748B]">Failed Transactions (24H)</div>
          <div class="font-bold">{{ failedLast24h.toLocaleString() }}</div>
        </span>
      </div>

      <!-- Total Transactions -->
      <div class="flex bg-[#ffffff] hover:bg-base-200 p-4 rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
        <span>
          <div class="text-xs text-[#64748B]">Total Transactions (24H)</div>
          <div class="font-bold">{{ totalTransactions.toLocaleString() }}</div>
        </span>
      </div>

      <!-- Transactions (Last Block) -->
      <div class="flex bg-[#ffffff] hover:bg-base-200 p-4 rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
        <span>
          <div class="text-xs text-[#64748B]">Transactions (Last Block)</div>
          <div class="font-bold">{{ currentTxCount.toLocaleString() }}</div>
        </span>
      </div>
    </div>


    <!-- Rest of your template stays same -->
     <div v-show="tab === 'recent'" class="bg-base-200 px-0.5 pt-0.5 mb-4 rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
      <!-- Filter Section - Compact & Modern -->
      <div class="bg-[#ffffff] dark:bg-[rgba(255,255,255,.03)] rounded-lg border border-base-300 dark:border-base-400 mb-2">
        <!-- Main Filter Bar -->
        <div class="flex flex-wrap items-center gap-3 px-4 py-3">
          <!-- Type Tabs - Compact Horizontal -->
          <div class="flex items-center gap-1 flex-wrap">
            <span class="text-xs font-medium text-base-content/70 mr-1">Type:</span>
            <button
              v-for="typeOption in [
                { value: 'all', label: 'All' },
                { value: 'send', label: 'Send' },
                { value: 'claim', label: 'Claim' },
                { value: 'proof', label: 'Proof' },
                { value: 'governance', label: 'Gov' },
                { value: 'staking', label: 'Stake' }
              ]"
              :key="typeOption.value"
              @click="selectedTypeTab = typeOption.value as any"
              class="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200"
              :class="selectedTypeTab === typeOption.value
                ? 'bg-[#007bff] text-white shadow-sm'
                : 'bg-base-100 text-base-content hover:bg-base-200 dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)]  border border-base-300 dark:border-base-400'"
            >
              {{ typeOption.label }}
            </button>
          </div>

          <!-- Divider -->
          <div class="h-6 w-px bg-base-300 dark:bg-base-500"></div>

          <!-- Quick Filters -->
          <div class="flex items-center gap-2 flex-wrap">
            <!-- Status -->
            <div class="flex items-center gap-1.5">
              <Icon icon="mdi:check-circle-outline" class="text-base-content/60 text-sm" />
              <select v-model="statusFilter" class="select select-bordered select-xs h-8 min-h-8 px-2 text-xs w-24 hover:bg-base-200 dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)]">
                <option value="">All</option>
                <option value="success">Success</option>
                <option value="failed">Failed</option>
              </select>
            </div>

            <!-- Sort By -->
            <div class="flex items-center gap-1.5">
              <Icon icon="mdi:sort" class="text-base-content/60 text-sm" />
              <select v-model="sortBy" class="select select-bordered select-xs h-8 min-h-8 px-2 text-xs w-28 hover:bg-base-200 dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] ">
                <option value="timestamp">Time</option>
                <option value="amount">Amount</option>
                <option value="fee">Fee</option>
                <option value="block_height">Block</option>
                <option value="type">Type</option>
                <option value="status">Status</option>
              </select>
            </div>

            <!-- Sort Order Toggle -->
            <button
              @click="sortOrder = sortOrder === 'desc' ? 'asc' : 'desc'"
              class="btn btn-xs h-8 min-h-8 px-2 gap-1"
              :class="sortOrder === 'desc' ? 'btn-primary' : 'btn-ghost'"
              :title="sortOrder === 'desc' ? 'Descending' : 'Ascending'"
            >
              <Icon :icon="sortOrder === 'desc' ? 'mdi:sort-descending' : 'mdi:sort-ascending'" class="text-sm" />
            </button>
          </div>

          <!-- Advanced Filters Toggle -->
          <div class="ml-auto dark:hover:bg-[rgba(255,255,255,0.06)]">
            <button
              @click="showAdvancedFilters = !showAdvancedFilters"
              class="btn btn-xs h-8 min-h-8 px-3 gap-1.5"
              :class="showAdvancedFilters ? 'btn-primary dark:bg-[rgba(255,255,255,0.06)]' : 'btn-ghost'"
            >
              <Icon :icon="showAdvancedFilters ? 'mdi:chevron-up' : 'mdi:chevron-down'" class="text-sm" />
              <span class="text-xs">Advanced</span>
            </button>
          </div>
        </div>

        <!-- Advanced Filters - Collapsible -->
        <div v-show="showAdvancedFilters" class="border-t border-base-300 dark:border-base-400 px-4 py-3">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Date Range -->
            <div>
              <label class="label py-1">
                <span class="label-text text-xs font-medium flex items-center gap-1.5">
                  <Icon icon="mdi:calendar-range" class="text-sm" />
                  Date Range
                </span>
              </label>
              <div class="flex gap-2">
                <input
                  v-model="startDate"
                  type="datetime-local"
                  class="input input-bordered input-xs h-8 text-xs flex-1"
                  placeholder="Start"
                />
                <span class="self-center text-xs text-base-content/50">→</span>
                <input
                  v-model="endDate"
                  type="datetime-local"
                  class="input input-bordered input-xs h-8 text-xs flex-1"
                  placeholder="End"
                />
              </div>
            </div>

            <!-- Amount Range -->
            <div>
              <label class="label py-1">
                <span class="label-text text-xs font-medium flex items-center gap-1.5">
                  <Icon icon="mdi:currency-usd" class="text-sm" />
                  Amount Range
                </span>
              </label>
              <div class="flex gap-2">
                <input
                  v-model.number="minAmount"
                  type="number"
                  class="input input-bordered input-xs h-8 text-xs flex-1"
                  placeholder="Min"
                />
                <span class="self-center text-xs text-base-content/50">-</span>
                <input
                  v-model.number="maxAmount"
                  type="number"
                  class="input input-bordered input-xs h-8 text-xs flex-1"
                  placeholder="Max"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="bg-base-200 px-0.5 pt-0.5 pb-4 mb-4 rounded-xl shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg overflow-auto">
        <table class="table w-full table-compact">
          <thead class="bg-base-200 dark:bg-[rgba(255,255,255,.03)] sticky top-0 border-0">
            <tr class="border-b-[0px] text-sm font-semibold">
              <th>{{ $t('tx.tx_hash') }}</th>
              <th>{{ $t('block.block') }}</th>
              <th>{{ $t('staking.status') }}</th>
              <th>{{ $t('account.amount') }}</th>
              <th>{{ $t('account.type') }}</th>
              <th>{{ $t('block.fees') }}</th>
              <th>{{ $t('account.time') }}</th>
              <th>{{ $t('account.signer') }}</th>
            </tr>
          </thead>

          <tbody>
            <tr v-if="loading" class="text-center">
              <td colspan="7" class="py-8">
                <div class="flex justify-center items-center">
                  <div class="loading loading-spinner loading-md"></div>
                  <span class="ml-2">Loading transactions...</span>
                </div>
              </td>
            </tr>
            <tr v-else-if="transactions.length === 0" class="text-center">
              <td colspan="7" class="py-8">
                <div class="text-gray-500">No transactions found</div>
              </td>
            </tr>
            <tr
              v-for="(item, index) in transactions"
              :key="item.hash"
              class="hover:bg-gray-100 dark:hover:bg-[rgba(255,255,255,0.06)]  dark:bg-base-200 bg-white border-0 rounded-xl"
            >
              <td
                class="dark:bg-base-200 dark:hover:bg-[rgba(255,255,255,0.06)] bg-white truncate dark:text-warning text-[#153cd8]"
                style="max-width:25vw"
              >
                <RouterLink
                  class="truncate hover:underline"
                  :to="`/${props.chain}/tx/${item.hash}`"
                  >{{ item.hash }}</RouterLink
                >
              </td>
              <td class="dark:bg-base-200 dark:hover:bg-[rgba(255,255,255,0.06)] bg-white text-sm dark:text-warning text-[#153cd8]">
                <RouterLink
                  :to="`/${props.chain}/blocks/${item.block_height}`"
                  class="hover:underline"
                  >{{ item.block_height }}</RouterLink
                >
              </td>
              <td class="dark:bg-base-200 dark:hover:bg-[rgba(255,255,255,0.06)] bg-white">
                <span
                  class="text-xs truncate py-1 px-3 rounded-full"
                  :class="item.status
                      ? 'bg-[#60BC29]/10 text-[#60BC29]'
                      : 'bg-[#E03834]/10 text-[#E03834]'"
                >
                  {{ (isNodeFallback && item.status == 0) ||item.status ? 'Success' : 'Failed' }}
                </span>
              </td>
              <td class="dark:bg-base-200 dark:hover:bg-[rgba(255,255,255,0.06)] bg-white">
                {{ format.formatToken({ denom: 'upokt', amount: item.amount }) }}
              </td>
              <td class="dark:bg-base-200 dark:hover:bg-[rgba(255,255,255,0.06)] bg-white">
                {{ item.type }}
              </td>
              <td class="dark:bg-base-200 dark:hover:bg-[rgba(255,255,255,0.06)] bg-white">
                {{ format.formatToken({ denom: 'upokt', amount: item.fee }) }}
              </td>
              <td class="dark:bg-base-200 dark:hover:bg-[rgba(255,255,255,0.06)] bg-white">
                {{ format.toDay(item.timestamp, 'from') }}
              </td>
              <td class="dark:bg-base-200 dark:hover:bg-[rgba(255,255,255,0.06)] bg-white">
                <RouterLink
                  :to="`/${props.chain}/account/${getSenderAddress(item.sender)}`"
                  class="text-sm text-[#09279F] dark:invert font-mono hover:underline"
                  >{{ getSenderAddress(item.sender) }}</RouterLink
                >
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination Bar -->
      <div class="flex justify-between items-center gap-4 my-6 px-6">
        <!-- Page Size Dropdown -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">Show:</span>
          <select 
            v-model="itemsPerPage" 
            @change="changePageSize(itemsPerPage)"
            class="select select-bordered select-sm w-20"
          >
            <option v-for="size in pageSizeOptions" :key="size" :value="size">
              {{ size }}
            </option>
          </select>
          <span class="text-sm text-gray-600">per page</span>
        </div>

        <!-- Pagination Info and Controls -->
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-600">
            Showing {{ ((currentPage - 1) * itemsPerPage) + 1 }} to {{ Math.min(currentPage * itemsPerPage, totalTransactions) }} of {{ totalTransactions }} transactions
          </span>
          
          <div class="flex items-center gap-1">
            <button
              class="page-btn bg-[#f8f9fa] border border-[#ccc] rounded px-[10px] py-[5px] cursor-pointer text-[#007bff] transition-colors duration-200 hover:bg-[#e9ecef] disabled:opacity-50 disabled:cursor-not-allowed text-[14px]" 
              @click="goToFirst"
              :disabled="currentPage === 1 || totalPages === 0"
            >
              First
            </button>
            <button
              class="page-btn bg-[#f8f9fa] border border-[#ccc] rounded px-[10px] py-[5px] cursor-pointer text-[#007bff] transition-colors duration-200 hover:bg-[#e9ecef] disabled:opacity-50 disabled:cursor-not-allowed text-[14px]" 
              @click="prevPage"
              :disabled="currentPage === 1 || totalPages === 0"
            >
              &lt;
            </button>

            <span class="text-xs px-2">
              Page {{ currentPage }} of {{ totalPages }}
            </span>

            <button
              class="page-btn bg-[#f8f9fa] border border-[#ccc] rounded px-[10px] py-[5px] cursor-pointer text-[#007bff] transition-colors duration-200 hover:bg-[#e9ecef] disabled:opacity-50 disabled:cursor-not-allowed text-[14px]" 
              @click="nextPage"
              :disabled="currentPage === totalPages || totalPages === 0"
            >
              &gt;
            </button>
            <button
              class="page-btn bg-[#f8f9fa] border border-[#ccc] rounded px-[10px] py-[5px] cursor-pointer text-[#007bff] transition-colors duration-200 hover:bg-[#e9ecef] disabled:opacity-50 disabled:cursor-not-allowed text-[14px]" 
              @click="goToLast"
              :disabled="currentPage === totalPages || totalPages === 0"
            >
              Last
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 🔍 Search Section -->
    <div
      v-show="tab === 'search'"
      class="bg-base-100 px-4 pt-3 pb-4 mb-4 rounded-md shadow-md border-t-4 border-warning"
    >
      <div class="flex items-center mb-4">
        <Icon icon="mdi:magnify" class="text-2xl text-warning mr-2" />
        <div class="text-lg font-semibold text-main">Search Transactions</div>
      </div>

      <div class="bg-base-200 p-4 rounded-md">
        <div class="form-control">
          <input
            v-model="hash"
            type="text"
            class="input input-bordered"
            placeholder="Search by Tx Hash"
            @blur="search"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-btn:hover {
  background-color: #e9ecef;
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>

<route>
{
  meta: {
    i18n: 'tx',
    order: 3
  }
}
</route>
