<script lang="ts" setup>
import MdEditor from 'md-editor-v3';
import PriceMarketChart from '@/components/charts/PriceMarketChart.vue';

import { Icon } from '@iconify/vue';
import {
  useBlockchain,
  useFormatter,
  useTxDialog,
  useWalletStore,
  useStakingStore,
  useParamStore,
  useBaseStore
} from '@/stores';
import { onMounted, ref, watch, nextTick, onBeforeUnmount } from 'vue';
import { useIndexModule, colorMap } from './indexStore';
import { computed } from '@vue/reactivity';
import { useSEO } from '@/composables/useSEO';

// import CardStatisticsVertical from '@/components/CardStatisticsVertical.vue';
import ProposalListItem from '@/components/ProposalListItem.vue';
import ArrayObjectElement from '@/components/dynamic/ArrayObjectElement.vue'
// import AdBanner from '@/components/ad/AdBanner.vue';
import ApexCharts from 'vue3-apexcharts';
import { PageRequest } from '@/types';

const props = defineProps(['chain']);

const blockchain = useBlockchain();
const store = useIndexModule();
const walletStore = useWalletStore();
const format = useFormatter();
// const dialog = useTxDialog();
// const stakingStore = useStakingStore();
const paramStore = useParamStore()
const base = useBaseStore()

// SEO Meta Tags
const chainName = computed(() => blockchain.current?.chainName || props.chain || 'Pocket Network');
useSEO({
  title: `${chainName.value} Dashboard`,
  description: `Explore the ${chainName.value} blockchain dashboard. View real-time blocks, transactions, validators, network statistics, and node runner performance on the Pocket Network Explorer.`,
  keywords: `${chainName.value}, blockchain dashboard, network statistics, validators, node runners`,
});
// const coinInfo = computed(() => {
//   return store.coinInfo;
// });

const transactionStats = ref({
  total: 0,
  history: []
});

// Add computed properties for network status metrics
const currentBlockHeight = computed(() => {
  return base.latest?.block?.header?.height || '0';
});

const latestBlockTime = computed(() => {
  return new Date(base.latest?.block?.header?.time || '0').toLocaleString();
});

const averageBlockTime = computed(() => {
  return (base.blocktime / 1000).toFixed(1);
});

const averageTxPerBlock = computed(() => {
  if (!base.recents || base.recents.length === 0) return '0.0';

  // Calculate this only once via computed property instead of in template
  const totalTxs = base.recents.reduce((sum, block) => sum + (block.block?.data?.txs?.length || 0), 0);
  return (totalTxs / Math.max(1, base.recents.length)).toFixed(1);
});

const activeValidatorsCount = computed(() => {
  return String(base.latest?.block?.last_commit?.signatures.length || 0);
});

// Add loading state tracking
const isNetworkStatusLoading = ref(true);

const txChartType = ref<'bar' | 'area' | 'line'>('area');
const txChartCategories = ref<string[]>([]);
const txHistoryWindow = ref(30); // days: 7, 15, 30 (1m)
const fullTxHistoryLabels = ref<string[]>([]);
const fullTxHistoryCounts = ref<number[]>([]);

const txChartOptions = computed(() => {
  const chartType = txChartType.value;
  
  // Stroke configuration based on chart type
  const strokeConfig = chartType === 'bar' 
    ? { width: 0 } // No stroke for bar charts
    : {
        curve: chartType === 'area' ? 'smooth' : 'straight',
        width: 2
      };
  
  // Fill configuration
  const fillConfig = chartType === 'bar'
    ? { opacity: 1, type: 'solid' }
    : {
        type: chartType === 'area' ? 'gradient' : 'solid',
        opacity: chartType === 'area' ? 0.3 : 0,
        gradient: chartType === 'area' ? {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
          stops: [0, 90, 100]
        } : undefined
      };

  return {
    chart: {
      type: chartType,
      height: 280,
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      }
    },
    colors: ['#A3E635'], // Light green color
    dataLabels: {
      enabled: false
    },
    stroke: strokeConfig,
    fill: fillConfig,
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      row: {
        colors: ['transparent'],
        opacity: 0.5
      }
    },
    markers: chartType === 'bar' ? { size: 0 } : chartType === 'line' ? {
      size: 4,
      strokeWidth: 0,
      hover: {
        size: 6
      }
    } : {
      size: 0,
      hover: {
        size: 4
      }
    },
    xaxis: {
      categories: txChartCategories.value,
      labels: {
        style: {
          colors: 'rgb(116, 109, 105)'
        },
        formatter: function (value: string) {
          return value;
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: {
      labels: {
        style: {
          colors: 'rgb(116, 109, 105)'
        },
        formatter: function (value: number) {
          return format.formatNumber(value);
        }
      }
    },
    tooltip: {
      theme: 'dark',
      y: {
        formatter: function (value: number) {
          return format.formatNumber(value) + ' transactions';
        }
      }
    }
  };
});

const txChartSeries = ref([
  {
    name: 'Transactions',
    data: []
  }
]);

// Blocks API state (server-side fetched, like transactions)
interface ApiBlockItem {
  id: string;
  height: number;
  hash: string;
  timestamp: string;
  block_production_time?: number;
  proposer: string;
  chain: string;
  transaction_count?: number;
}

// Map frontend chain names to API chain names
const getApiChainName = (chainName: string) => {
  const chainMap: Record<string, string> = {
    'pocket-beta': 'pocket-testnet-beta',
    'pocket-mainnet': 'pocket-mainnet'
  };
  return chainMap[chainName] || chainName || 'pocket-testnet-beta';
};

const currentChainName = computed(() => blockchain?.current?.chainName || props.chain || 'pocket-beta');
const apiChainName = computed(() => getApiChainName(currentChainName.value));

const blocks = ref<ApiBlockItem[]>([]);
const loadingBlocks = ref(false);
const blocksPage = ref(1);
const blocksLimit = ref(25);
const blocksTotal = ref(0);
const blocksTotalPages = ref(0);
const avgBlockProductionTime = ref<string | null>(null);

// Indexer health status
interface ChainStatus {
  chain: string;
  historical_checkpoint: number;
  monitoring_height: number;
  latest_height: number;
  monitor_lag: number;
  historical_backlog: number;
  total_backlog: number;
  status: {
    monitoring: string;
    historical: string;
    overall: string;
  };
}

interface IndexerHealth {
  chains: ChainStatus[];
}

const indexerHealth = ref<IndexerHealth | null>(null);
const indexerHealthLoading = ref(false);

async function loadIndexerHealth() {
  indexerHealthLoading.value = true;
  try {
    const response = await fetch('/api/v1/health/workers/');
    const result = await response.json();
    if (response.ok && result?.data) {
      indexerHealth.value = {
        chains: result.data.chains || []
      };
    } else {
      indexerHealth.value = null;
    }
  } catch (e) {
    console.error('Error loading indexer health:', e);
    indexerHealth.value = null;
  } finally {
    indexerHealthLoading.value = false;
  }
}

// Computed property to check if indexer is behind for current chain
const isIndexerBehind = computed(() => {
  if (!indexerHealth.value?.chains || !apiChainName.value) return false;
  const chainStatus = indexerHealth.value.chains.find(
    (c) => c.chain === apiChainName.value
  );
  return chainStatus ? chainStatus.monitoring_height < (chainStatus.latest_height - 10) : false;
});

// Get current chain indexer status
const currentChainIndexerStatus = computed(() => {
  if (!indexerHealth.value?.chains || !apiChainName.value) return null;
  return indexerHealth.value.chains.find((c) => c.chain === apiChainName.value) || null;
});

async function loadBlocks() {
  loadingBlocks.value = true;
  try {
    const url = `/api/v1/blocks?chain=${apiChainName.value}&page=${blocksPage.value}&limit=${blocksLimit.value}`;
    const response = await fetch(url);
    const result = await response.json();
    if (response.ok) {
      blocks.value = result.data || [];
      blocksTotal.value = result.meta?.total || 0;
      blocksTotalPages.value = result.meta?.totalPages || 0;
      avgBlockProductionTime.value = Number(result.meta?.avgBlockProductionTime || null).toFixed(2) || null;
    } else {
      blocks.value = [];
      blocksTotal.value = 0;
      blocksTotalPages.value = 0;
      console.error('Error loading blocks:', result);
    }
  } catch (e) {
    console.error('Error loading blocks:', e);
    blocks.value = [];
    blocksTotal.value = 0;
    blocksTotalPages.value = 0;
  } finally {
    loadingBlocks.value = false;
  }
}

// Add these refs for block list virtualization after the existing refs
const visibleBlocks = ref<{ item: any; index: number }[]>([]);
const visibleTxs = ref<{ item: any; index: number }[]>([]);
const blockTableContainer = ref<HTMLDivElement | null>(null);
const txTableContainer = ref<HTMLDivElement | null>(null);
const itemHeight = 42; // Height of table rows
const bufferSize = 5; // Number of additional items to render
const ticking = ref(false); // For requestAnimationFrame throttling
const blockScrollTimeout = ref<NodeJS.Timeout | null>(null);
const txScrollTimeout = ref<NodeJS.Timeout | null>(null);
const updateNetworkStatsTimeout = ref<NodeJS.Timeout | null>(null);
const indexerHealthInterval = ref<NodeJS.Timeout | null>(null);

// Add debounced update function for network stats
function debouncedUpdateNetworkStats() {
  if (updateNetworkStatsTimeout.value) {
    clearTimeout(updateNetworkStatsTimeout.value);
  }

  updateNetworkStatsTimeout.value = setTimeout(() => {
    if (!isNetworkStatusLoading.value) {
      loadNetworkStats();
    }
  }, 500); // 500ms debounce
}

// Add these methods for virtualization before the existing onMounted function
function initVirtualLists() {
  nextTick(() => {
    // Initialize transaction table virtualization
    if (txTableContainer.value) {
      updateVisibleTxs();
      txTableContainer.value.addEventListener('scroll', handleTxScroll, { passive: true });
    }
  });
}

function handleBlockScroll() {
  if (!ticking.value) {
    ticking.value = true;
    requestAnimationFrame(() => {
      updateVisibleBlocks();
      ticking.value = false;
    });
  }
}

function handleTxScroll() {
  if (!ticking.value) {
    ticking.value = true;
    requestAnimationFrame(() => {
      updateVisibleTxs();
      ticking.value = false;
    });
  }
}

function updateVisibleBlocks() {
  if (!blockTableContainer.value || !base.recents?.length) return;

  const container = blockTableContainer.value;
  const scrollTop = container.scrollTop;
  const viewportHeight = container.clientHeight;

  // Calculate which items should be visible
  const startIndex = Math.floor(scrollTop / itemHeight) - bufferSize;
  const endIndex = Math.ceil((scrollTop + viewportHeight) / itemHeight) + bufferSize;

  const start = Math.max(0, startIndex);
  const end = Math.min(base.recents.length, endIndex);

  // Only update if the visible range has changed significantly
  if (visibleBlocks.value.length === 0 ||
    Math.abs(visibleBlocks.value[0]?.index - start) >= 2 ||
    Math.abs(visibleBlocks.value[visibleBlocks.value.length - 1]?.index - (end - 1)) >= 2) {

    visibleBlocks.value = base.recents.slice(start, end).map((item, index) => ({
      item,
      index: start + index
    }));
  }
}

function updateVisibleTxs() {
  if (!txTableContainer.value || !base.allTxs?.length) return;

  const container = txTableContainer.value;
  const scrollTop = container.scrollTop;
  const viewportHeight = container.clientHeight;

  // Calculate which items should be visible
  const startIndex = Math.floor(scrollTop / itemHeight) - bufferSize;
  const endIndex = Math.ceil((scrollTop + viewportHeight) / itemHeight) + bufferSize;

  const start = Math.max(0, startIndex);
  const end = Math.min(base.allTxs.length, endIndex);

  // Only update if the visible range has changed significantly
  if (visibleTxs.value.length === 0 ||
    Math.abs(visibleTxs.value[0]?.index - start) >= 2 ||
    Math.abs(visibleTxs.value[visibleTxs.value.length - 1]?.index - (end - 1)) >= 2) {
    visibleTxs.value = base.allTxs.slice(start, end).map((item, index) => ({
      item,
      index: start + index
    }));
  }
}

onMounted(async () => {
  store.loadDashboard();
  walletStore.loadMyAsset();
  paramStore.handleAbciInfo();
  console.log("current chain", blockchain.current)
  // Set loading state
  isNetworkStatusLoading.value = true;

  // Load transactions first
  base.getAllTxs(blockchain.current?.transactionService);

  // Then load stats that depend on transaction data
  loadNetworkStats();
  loadTransactionHistory();
  loadServicesSummary24h();

  // Mark network status as loaded
  isNetworkStatusLoading.value = false;

  // Initialize virtual scrolling
  initVirtualLists();

  // Load latest blocks via API for the dashboard table
  loadBlocks();

  // Load indexer health status
  loadIndexerHealth();
  
  // Set up periodic refresh for indexer health (every 30 seconds)
  indexerHealthInterval.value = setInterval(() => {
    loadIndexerHealth();
  }, 30000);
});

const ticker = computed(() => store.coinInfo.tickers[store.tickerIndex]);
const tickers = computed(() => store.coinInfo.tickers);
const currName = ref("")
blockchain.$subscribe((m, s) => {
  if (s.chainName !== currName.value) {
    currName.value = s.chainName
    store.loadDashboard();
    walletStore.loadMyAsset();
    paramStore.handleAbciInfo()
    // Reload 24h services summary on chain change
    loadServicesSummary24h();
    // Reload indexer health on chain change
    loadIndexerHealth();
  }
});
function shortName(name: string, id: string) {
  return name.toLowerCase().startsWith('ibc/') ||
    name.toLowerCase().startsWith('0x')
    ? id
    : name;
}

const comLinks = [
  {
    name: 'Website',
    icon: 'mdi-web',
    href: store.homepage,
  },
  {
    name: 'Twitter',
    icon: 'mdi-twitter',
    href: store.twitter,
  },
  {
    name: 'Telegram',
    icon: 'mdi-telegram',
    href: store.telegram,
  },
  {
    name: 'Github',
    icon: 'mdi-github',
    href: store.github,
  },
];

// wallet box
const change = computed(() => {
  const token = walletStore.balanceOfStakingToken;
  return token ? format.priceChanges(token.denom) : 0;
});
const color = computed(() => {
  switch (true) {
    case change.value > 0:
      return 'text-green-600';
    case change.value === 0:
      return 'text-grey-500';
    case change.value < 0:
      return 'text-red-600';
  }
});

function updateState() {
  walletStore.loadMyAsset()
}

function trustColor(v: string) {
  return `text-${colorMap(v)}`
}

const quantity = ref(100)
const qty = computed({
  get: () => {
    return parseFloat(quantity.value.toFixed(6))
  },
  set: val => {
    quantity.value = val
  }
})
const amount = computed({
  get: () => {
    return quantity.value * ticker.value.converted_last.usd || 0
  },
  set: val => {
    quantity.value = val / ticker.value.converted_last.usd || 0
  }
})

// Helpers for formatting numbers in tooltips
function formatWithCommas(value: number) {
  try {
    return Number(value || 0).toLocaleString();
  } catch (e) {
    return String(value);
  }
}

function formatCompact(value: number) {
  const n = Number(value || 0);
  if (n >= 1_000_000_000_000) return (n / 1_000_000_000_000).toFixed(2) + 'T';
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(2) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(2) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return String(n);
}

const networkStats = ref({
  wallets: 0,
  applications: 0,
  gateways: 0,
  suppliers: 0,
  services: 0
});

// 24h services summary (relays and compute units)
const totalRelays24h = ref(0);
const totalComputeUnits24h = ref(0);

async function loadServicesSummary24h() {
  try {
    const params = new URLSearchParams();
    params.append('window', '1');
    params.append('chain', apiChainName.value);
    const response = await fetch(`/api/v1/network-growth/summary?${params.toString()}`);
    const result = await response.json();
    if (response.ok && result?.data) {
      totalRelays24h.value = Number(result.data.relays || 0);
      totalComputeUnits24h.value = Number(result.data.claimed_compute_units || 0);
    } else {
      totalRelays24h.value = 0;
      totalComputeUnits24h.value = 0;
      console.error('Error loading 24h services summary:', result);
    }
  } catch (e) {
    totalRelays24h.value = 0;
    totalComputeUnits24h.value = 0;
    console.error('Error loading 24h services summary:', e);
  }
}

const historicalData = ref({
  series: [
    { name: 'Applications', data: [], yAxisIndex: 0 },
    { name: 'Gateways', data: [], yAxisIndex: 0 },
    { name: 'Suppliers', data: [], yAxisIndex: 0 },
    { name: 'Services', data: [], yAxisIndex: 0 },
    { name: 'Relays', data: [], yAxisIndex: 1 },
    { name: 'Claimed CU', data: [], yAxisIndex: 1 },
    { name: 'Estimated CU', data: [], yAxisIndex: 1 }
  ]
});

// Chart state for Network Growth
const networkGrowthTab = ref<'core-services' | 'performance'>('performance');
const networkGrowthChartType = ref<'bar' | 'area' | 'line'>('area');
const chartCategories = ref<string[]>([]);
const performanceMetric = ref<'relays' | 'compute-units'>('compute-units');
const networkGrowthWindow = ref(7); // days

// Computed series based on active tab
const activeNetworkGrowthSeries = computed(() => {
  if (!historicalData.value.series || historicalData.value.series.length === 0) {
    return [];
  }
  
  if (networkGrowthTab.value === 'core-services') {
    // Return Core Services series (Applications, Suppliers, Gateways, Services)
    const series = historicalData.value.series.slice(0, 4);
    return series.filter(s => s.data && s.data.length > 0).map(s => ({
      ...s,
      yAxisIndex: 0 // Use first y-axis
    }));
  } else {
    // Return the selected Performance metric (Relays or both Compute Units series)
    // Return the selected Performance metric (Relays or both Compute Units series)
    if (performanceMetric.value === 'relays') {
      const relaysIndex = 4; // Relays is at index 4
      const selectedSeries = historicalData.value.series[relaysIndex];
      
      if (selectedSeries && selectedSeries.data && selectedSeries.data.length > 0) {
        return [{
          ...selectedSeries,
          yAxisIndex: 0 // Use single y-axis for relays
        }];
      }
      return [];
    } else {
    // Return both compute units series (Claimed and Estimated)
      const proofSubmissionsIndex = 5; // Proof Submissions CU is at index 5
      const settledClaimsIndex = 6; // Settled Claims CU is at index 6
      const proofSubmissionsSeries = historicalData.value.series[proofSubmissionsIndex];
      const settledClaimsSeries = historicalData.value.series[settledClaimsIndex];
      
      const result = [];
      if (proofSubmissionsSeries && proofSubmissionsSeries.data && proofSubmissionsSeries.data.length > 0) {
        result.push({
          ...proofSubmissionsSeries,
          yAxisIndex: 0
        });
      }
      if (settledClaimsSeries && settledClaimsSeries.data && settledClaimsSeries.data.length > 0) {
        result.push({
          ...settledClaimsSeries,
          yAxisIndex: 0
        });
      }
      return result;
    }
  }
});

// Computed chart options based on chart type and active tab
const chartOptions = computed(() => {
  const isCoreServices = networkGrowthTab.value === 'core-services';
  const chartType = networkGrowthChartType.value;
  
  // Base colors - Core Services: first 4, Performance: single color for relays, two colors for compute units
  const colors = isCoreServices 
    ? ['#FFB206', '#09279F', '#5E9AE4', '#60BC29']
    : performanceMetric.value === 'relays' 
      ? ['#A855F7'] 
      : ['#EF4444', '#F97316']; // Red for Proof Submissions, Orange for Settled Claims
  
  // Stroke configuration based on chart type
  const isComputeUnits = !isCoreServices && performanceMetric.value === 'compute-units';
  const strokeConfig = chartType === 'bar' 
    ? { width: 0 } // No stroke for bar charts
    : {
        curve: chartType === 'area' ? 'smooth' : 'straight',
        width: isCoreServices ? [2.5, 2.5, 2.5, 2.5] : (isComputeUnits ? [2.5, 2.5] : 2.5),
        dashArray: isCoreServices ? [0, 0, 0, 0] : (isComputeUnits ? [0, 5] : 0) // Dashed line for settled claims
      };
  
  // Fill configuration
  const fillConfig = chartType === 'bar'
    ? { opacity: 1, type: 'solid' }
    : {
        type: chartType === 'area' ? 'gradient' : 'solid',
        opacity: chartType === 'line' ? 0 : (isCoreServices ? [0.15, 0.15, 0.15, 0.15] : (isComputeUnits ? [0.15, 0.15] : 0.15)),
        gradient: chartType === 'area' ? {
          shadeIntensity: 1,
          opacityFrom: 0.7,
          opacityTo: 0.3,
          stops: [0, 90, 100]
        } : undefined
      };
  
  // Y-axis configuration
  const yaxisConfig = isCoreServices
    ? [{ 
        labels: { style: { colors: 'rgb(116, 109, 105)' } }, 
        title: { text: 'Entities' } 
      }]
    : [
        // Single y-axis for selected performance metric
        { 
          labels: { 
            style: { colors: 'rgb(116, 109, 105)' },
            formatter: function (value: number) {
              if (value >= 1_000_000_000) return (value / 1_000_000_000).toFixed(1) + 'B';
              if (value >= 1_000_000) return (value / 1_000_000).toFixed(1) + 'M';
              if (value >= 1_000) return (value / 1_000).toFixed(1) + 'K';
              return String(value);
            }
          }, 
          title: { 
            text: performanceMetric.value === 'relays' ? 'Relays' : 'Compute Units',
            style: { color: performanceMetric.value === 'relays' ? '#A855F7' : '#EF4444' }
          },
          opposite: false
        }
      ];
  
  return {
    chart: {
      type: chartType,
      height: 280,
      toolbar: {
        show: false
      },
      zoom: {
        enabled: false
      },
      animations: {
        enabled: true,
        easing: 'easeinout',
        speed: 800
      }
    },
    colors: colors,
    dataLabels: {
      enabled: false
    },
    stroke: strokeConfig,
    fill: fillConfig,
    grid: {
      borderColor: 'rgba(255, 255, 255, 0.1)',
      row: {
        colors: ['transparent'],
        opacity: 0.5
      }
    },
    markers: chartType === 'bar' ? { size: 0 } : chartType === 'line' ? {
      size: isComputeUnits ? [4, 4] : 4,
      strokeWidth: 0,
      hover: { size: 6 }
    } : {
      size: isComputeUnits ? [2, 2] : 2,
      strokeWidth: 0,
      hover: { size: 5 }
    },
    xaxis: {
      categories: chartCategories.value || [],
      type: 'category',
      labels: {
        style: {
          colors: 'rgb(116, 109, 105)'
        },
        formatter: function (value: string) {
          return value;
        }
      },
      axisBorder: {
        show: false
      },
      axisTicks: {
        show: false
      }
    },
    yaxis: yaxisConfig,
    legend: {
      show: true,
      position: 'bottom',
      horizontalAlign: 'left',
      labels: {
        colors: 'rgb(116, 109, 105)'
      }
    },
    tooltip: {
      theme: 'dark',
      shared: true,
      intersect: false,
      y: {
        formatter: function (value: number, opts: any) {
          if (isCoreServices) {
            return `${formatWithCommas(value)}`;
          }
          // For performance metrics (relays and compute units), use compact format
          return `${formatCompact(value)}`;
        }
      }
    }
  };
});

// Add a cache expiration tracking
const networkStatsCacheTime = ref(0);
const CACHE_EXPIRATION_MS = 60000; // 1 minute cache

async function loadNetworkStats() {
  // Check cache - only reload if it's expired
  const now = Date.now();
  if (now - networkStatsCacheTime.value < CACHE_EXPIRATION_MS &&
    networkStats.value.wallets > 0) {
    console.log("Using cached network stats");
    return;
  }

  const pageRequest = new PageRequest();
  pageRequest.limit = 1;

  try {
    // Use Promise.all to fetch data in parallel instead of sequentially
    const [applicationsData, suppliersData, gatewaysData, servicesData, accountsData] = await Promise.all([
      blockchain.rpc.getApplications(pageRequest),
      blockchain.rpc.getSuppliers(pageRequest),
      blockchain.rpc.getGateways(pageRequest),
      blockchain.rpc.getServices(pageRequest),
      blockchain.rpc.getAuthAccounts(pageRequest)
    ]);

    networkStats.value.applications = parseInt(applicationsData.pagination?.total || 0);
    networkStats.value.suppliers = parseInt(suppliersData.pagination?.total || 0);
    networkStats.value.gateways = parseInt(gatewaysData.pagination?.total || 0);
    networkStats.value.services = parseInt(servicesData.pagination?.total || 0);
    networkStats.value.wallets = parseInt(accountsData.pagination?.total || '0');

    // Update cache timestamp
    networkStatsCacheTime.value = now;

    // Load both performance and entities data in parallel in the background
    // This ensures both tabs have data ready immediately for instant switching
    Promise.allSettled([
      loadNetworkGrowthPerformance(networkGrowthWindow.value),
      loadNetworkGrowthEntities(networkGrowthWindow.value)
    ]).then((results) => {
      // Check if both failed - only then fallback to generated data
      const allFailed = results.every(result => result.status === 'rejected');
      if (allFailed) {
        console.warn('Both network growth endpoints failed, using fallback data');
        generateHistoricalData();
      }
    });
  } catch (error) {
    console.error("Error loading network stats:", error);
  }
}

// Load performance metrics (relays and compute units) from fast endpoint
async function loadNetworkGrowthPerformance(windowDays: number = 7) {
  try {
    const params = new URLSearchParams();
    params.append('window', String(windowDays));
    params.append('chain', apiChainName.value);

    const response = await fetch(`/api/v1/network-growth/performance?${params.toString()}`);
    const result = await response.json();

    if (!response.ok) {
      console.error('Error loading network growth performance:', result);
      throw new Error('Network growth performance API error');
    }

    const timeline = result?.data?.timeline || [];

    // Sort days ascending
    const daysAsc = timeline.sort((a: any, b: any) => (a.day || '').localeCompare(b.day || ''));

    // Build labels and extract relays/compute units data
    const labels: string[] = [];
    const relaysDaily: number[] = [];
    const claimedCUDaily: number[] = [];
    const estimatedCUDaily: number[] = [];
    
    for (const dayItem of daysAsc) {
      const dayStr = (dayItem.day || '').slice(0, 10);
      if (!dayStr) continue;
      
      const d = new Date(dayStr + 'T00:00:00Z');
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      relaysDaily.push(Number(dayItem.relays || 0));
      claimedCUDaily.push(Number(dayItem.claimed_compute_units || 0));
      estimatedCUDaily.push(Number(dayItem.estimated_compute_units || 0));
    }

    // For the selected window, replace the last day's estimated CU with the
    // average estimated CU over the window to smooth the most recent point
    if (estimatedCUDaily.length > 0) {
      const sumEstimated = estimatedCUDaily.reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
      const avgEstimated = sumEstimated / estimatedCUDaily.length;
      estimatedCUDaily[estimatedCUDaily.length - 1] = avgEstimated;
    }

    // Update chart categories (only if not already set or if this is the first data loaded)
    if (chartCategories.value.length === 0 || chartCategories.value.length === labels.length) {
      chartCategories.value = labels;
    }

    // Update performance series (relays, claimed CU, and estimated CU)
    historicalData.value.series[4].data = relaysDaily as never[];
    historicalData.value.series[5].data = claimedCUDaily as never[];
    historicalData.value.series[6].data = estimatedCUDaily as never[];
  } catch (e) {
    console.error('Error loading network growth performance:', e);
    // Don't throw - allow entities to still load if performance fails
  }
}

// Reload network growth data when the selected window changes
watch(networkGrowthWindow, (newVal, oldVal) => {
  if (newVal === oldVal) return;
  // Clear existing data to show loading state if needed
  chartCategories.value = [];
  historicalData.value.series = historicalData.value.series.map(series => ({
    ...series,
    data: []
  }));

  Promise.allSettled([
    loadNetworkGrowthPerformance(newVal),
    loadNetworkGrowthEntities(newVal)
  ]).catch((err) => {
    console.error('Error reloading network growth data for new window:', err);
  });
});

// Load entity statistics (applications, suppliers, gateways, services) from entities endpoint
async function loadNetworkGrowthEntities(windowDays: number = 7) {
  try {
    const params = new URLSearchParams();
    params.append('window', String(windowDays));
    params.append('chain', apiChainName.value);

    const response = await fetch(`/api/v1/network-growth/entities?${params.toString()}`);
    const result = await response.json();

    if (!response.ok) {
      console.error('Error loading network growth entities:', result);
      throw new Error('Network growth entities API error');
    }

    const timeline = result?.data?.timeline || [];

    // Sort days ascending
    const daysAsc = timeline.sort((a: any, b: any) => (a.day || '').localeCompare(b.day || ''));

    // Build labels and extract entity data
    const labels: string[] = [];
    const applicationsDaily: number[] = [];
    const suppliersDaily: number[] = [];
    const gatewaysDaily: number[] = [];
    const servicesDaily: number[] = [];
    
    for (const dayItem of daysAsc) {
      const dayStr = (dayItem.day || '').slice(0, 10);
      if (!dayStr) continue;
      
      const d = new Date(dayStr + 'T00:00:00Z');
      labels.push(d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
      applicationsDaily.push(Number(dayItem.applications || 0));
      suppliersDaily.push(Number(dayItem.suppliers || 0));
      gatewaysDaily.push(Number(dayItem.gateways || 0));
      servicesDaily.push(Number(dayItem.services || 0));
    }

    // Current totals from node
    const totalApps = Number(networkStats.value.applications || 0);
    const totalSuppliers = Number(networkStats.value.suppliers || 0);
    const totalGateways = Number(networkStats.value.gateways || 0);
    const totalServices = Number(networkStats.value.services || 0);

    // Helper to build cumulative series that ends at current total
    const toCumulative = (daily: number[], currentTotal: number) => {
      const sumDaily = daily.reduce((a, b) => a + (Number(b) || 0), 0);
      let startValue = Math.max(0, currentTotal - sumDaily);
      const cumulative: number[] = [];
      for (let i = 0; i < daily.length; i++) {
        startValue += (Number(daily[i]) || 0);
        cumulative.push(startValue);
      }
      return cumulative;
    };

    const applications = toCumulative(applicationsDaily, totalApps);
    const suppliers = toCumulative(suppliersDaily, totalSuppliers);
    const gateways = toCumulative(gatewaysDaily, totalGateways);
    const services = toCumulative(servicesDaily, totalServices);

    // Update chart categories (only if not already set or if this is the first data loaded)
    if (chartCategories.value.length === 0 || chartCategories.value.length === labels.length) {
      chartCategories.value = labels;
    }

    // Update entity series (applications, gateways, suppliers, services)
    historicalData.value.series[0].data = applications as never[];
    historicalData.value.series[1].data = gateways as never[];
    historicalData.value.series[2].data = suppliers as never[];
    historicalData.value.series[3].data = services as never[];
  } catch (e) {
    console.error('Error loading network growth entities:', e);
    // Don't throw - allow performance to still load if entities fails
  }
}

function generateHistoricalData() {
  // Generate last 7 days
  const days = 7;
  const labels = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    // Format date as "MMM DD" (e.g., "Jan 15")
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
  }

  // Set the categories
  chartCategories.value = labels;

  // Generate more visible data with larger values
  const appData = [];
  const supplierData = [];
  const gatewayData = [];
  const serviceData = [];

  // Start with current values and work backwards with more significant changes
  let appCount = networkStats.value.applications;
  let supplierCount = networkStats.value.suppliers;
  let gatewayCount = networkStats.value.gateways;
  let serviceCount = networkStats.value.services;

  // Ensure minimum values for visibility
  appCount = Math.max(appCount, 5);
  supplierCount = Math.max(supplierCount, 5);
  gatewayCount = Math.max(gatewayCount, 3);
  serviceCount = Math.max(serviceCount, 4);

  // Create data points
  for (let i = 0; i < days; i++) {
    // For the first day (oldest), start with lower values
    if (i === 0) {
      appData.push(Math.max(1, Math.floor(appCount * 0.6)));
      supplierData.push(Math.max(1, Math.floor(supplierCount * 0.7)));
      gatewayData.push(Math.max(1, Math.floor(gatewayCount * 0.5)));
      serviceData.push(Math.max(1, Math.floor(serviceCount * 0.4)));
    }
    // For middle days, show gradual growth
    else if (i < days - 1) {
      const growthFactor = 0.7 + (i * 0.05);
      appData.push(Math.max(1, Math.floor(appCount * growthFactor)));
      supplierData.push(Math.max(1, Math.floor(supplierCount * growthFactor)));
      gatewayData.push(Math.max(1, Math.floor(gatewayCount * growthFactor)));
      serviceData.push(Math.max(1, Math.floor(serviceCount * growthFactor)));
    }
    // For the last day (today), use current values
    else {
      appData.push(appCount);
      supplierData.push(supplierCount);
      gatewayData.push(gatewayCount);
      serviceData.push(serviceCount);
    }
  }

  // Update the series data
  historicalData.value.series[0].data = appData as never[];
  historicalData.value.series[1].data = supplierData as never[];
  historicalData.value.series[2].data = gatewayData as never[];
  historicalData.value.series[3].data = serviceData as never[];
}

function updateTxChartForWindow(windowDays: number) {
  const labels = fullTxHistoryLabels.value;
  const counts = fullTxHistoryCounts.value;

  if (!labels.length || !counts.length) {
    txChartCategories.value = [];
    txChartSeries.value = [{
      name: 'Transactions',
      data: []
    }];
    return;
  }

  const n = labels.length;
  const keep = Math.min(windowDays, n);
  const start = Math.max(0, n - keep);

  txChartCategories.value = labels.slice(start);
  txChartSeries.value = [{
    name: 'Transactions',
    data: counts.slice(start) as never[]
  }];
}

async function loadTransactionHistory() {
  try {
    // Fetch historical transaction data using the transactions/count endpoint with chain parameter
    const historyPromise = fetch(`/api/v1/transactions/count?chain=${blockchain.current?.transactionService}`).catch(err => {
      console.error("Error fetching transaction history:", err);
      return null;
    });

    // Process history response
    const historyResponse = await historyPromise;

    if (historyResponse && historyResponse.ok) {
      const historyData = await historyResponse.json();

      if (historyData.data && historyData.data.labels && historyData.data.counts) {
        // Store the total transaction count
        transactionStats.value.total = historyData.data.total || 0;

        // Cache full history and then apply windowing on the frontend
        fullTxHistoryLabels.value = historyData.data.labels || [];
        fullTxHistoryCounts.value = historyData.data.counts || [];
        updateTxChartForWindow(txHistoryWindow.value);
      } else {
        console.error("Invalid history data format:", historyData);
        fallbackToClientSideProcessing();
      }
    } else {
      console.warn("Could not fetch transaction history from API, falling back to client-side processing");
      fallbackToClientSideProcessing();
    }
  } catch (error) {
    console.error("Error loading transaction history:", error);
    fallbackToClientSideProcessing();
  }
}

// Fallback method if the API request fails
function fallbackToClientSideProcessing(windowDays: number = 30) {
  const txs = base.allTxs || [];
  const days = windowDays;
  const now = new Date();
  const labels = [];
  const txsByDay = new Map();

  // Generate labels and initialize counts
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    // Format date as "MMM D" (e.g., "Feb 3")
    labels.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD format
    txsByDay.set(dateKey, 0);
  }

  // Count transactions by day
  for (const tx of txs) {
    let txDate;

    if (tx.timestamp) {
      txDate = new Date(tx.timestamp);
    } else if (tx.height) {
      // Try to get timestamp from block
      const cachedBlock = base._blockCache?.get(tx.height);
      if (cachedBlock && cachedBlock.block.header.time) {
        txDate = new Date(cachedBlock.block.header.time);
      } else {
        const block = base.recents.find(b => b.block.header.height === tx.height);
        if (block && block.block.header.time) {
          txDate = new Date(block.block.header.time);
        }
      }
    }

    if (txDate) {
      const dateKey = txDate.toISOString().split('T')[0];
      if (txsByDay.has(dateKey)) {
        txsByDay.set(dateKey, txsByDay.get(dateKey) + 1);
      }
    }
  }

  // Convert to array for chart
  const txData = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    const dateKey = date.toISOString().split('T')[0];
    txData.push(txsByDay.get(dateKey) || 0);
  }

  // Cache full history derived from client-side processing and apply windowing
  fullTxHistoryLabels.value = labels;
  fullTxHistoryCounts.value = txData;
  updateTxChartForWindow(txHistoryWindow.value);
}

// Also add a watcher to reload transaction history when allTxs changes
watch(() => base.allTxs, (newTxs) => {
  if (newTxs && newTxs.length > 0) {
    console.log(`Transaction data updated, reloading chart with ${newTxs.length} transactions`);
    loadTransactionHistory();
  }
}, { deep: true });

// Reload transaction history when the selected window changes
watch(txHistoryWindow, (newVal, oldVal) => {
  if (newVal === oldVal) return;
  updateTxChartForWindow(newVal);
});

// Add this to clean up event listeners
onBeforeUnmount(() => {
  if (blockTableContainer.value) {
    blockTableContainer.value.removeEventListener('scroll', handleBlockScroll);
  }

  if (txTableContainer.value) {
    txTableContainer.value.removeEventListener('scroll', handleTxScroll);
  }

  if (blockScrollTimeout.value) {
    clearTimeout(blockScrollTimeout.value);
  }

  if (txScrollTimeout.value) {
    clearTimeout(txScrollTimeout.value);
  }

  if (updateNetworkStatsTimeout.value) {
    clearTimeout(updateNetworkStatsTimeout.value);
  }

  if (indexerHealthInterval.value) {
    clearInterval(indexerHealthInterval.value);
  }
});

// Add watchers to update virtual lists when data changes
watch(() => base.recents.length, () => {
  updateVisibleBlocks();
});

watch(() => base.allTxs.length, () => {
  updateVisibleTxs();
});

// Add watchers for network status data to trigger updates when dependencies change
watch(() => base.latest?.block?.header?.height, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    debouncedUpdateNetworkStats();
  }
});

watch(() => base.blocktime, (newVal, oldVal) => {
  if (newVal && newVal !== oldVal) {
    // Update computed property will automatically update
    console.log("Block time changed, updating network stats");
  }
});

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

</script>

<template>
  <div class="">

      <div class="bg-base-100 dark:bg-[#1a1f26] pt-[6.5rem]">
      <!-- Subtle Indexer Lag Alert -->
      <div v-if="isIndexerBehind && currentChainIndexerStatus" 
        class="mx-4 mt-2 mb-2 px-4 py-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 dark:border-amber-500/40 flex items-center gap-2 text-sm">
        <Icon icon="mdi:clock-alert-outline" class="text-amber-500 dark:text-amber-400 flex-shrink-0" />
        <div class="flex-1 text-amber-700 dark:text-amber-300">
          <span class="font-medium">Indexer catching up:</span>
          <span class="ml-1">{{ format.formatNumber(currentChainIndexerStatus.latest_height - currentChainIndexerStatus.monitoring_height) }} blocks behind</span>
          <span v-if="currentChainIndexerStatus.latest_height > 0" class="ml-1 text-xs opacity-75">
            ({{ Math.round(((currentChainIndexerStatus.latest_height - currentChainIndexerStatus.monitoring_height) / currentChainIndexerStatus.latest_height) * 100) }}% remaining)
          </span>
        </div>
      </div>
        <!-- Laptop View -->
        <div class="desktop-home flex flex-1 gap-8">
          <div class="w-[45%] py-2">
          <div class="text-lg font-semibold text-main">Network Status</div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2 my-2">
            <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
              <div class="flex items-center mb-5">
                <Icon icon="mdi:cube-scan" class="text-sm text-[#64748B] mr-1" />
                <span class="text-xs text-secondary">Current Block Height</span>
              </div>
              <div class="text-xl text-main flex items-center justify-center font-medium"> {{ currentBlockHeight }} <a
                  :href="`/${chain}/blocks/${currentBlockHeight}`"
                  class="ml-2 text-xl inline-block text-[#64748B] hover:text-info/70">
                  <Icon icon="mdi:arrow-right-circle" class="text-sm" />
                </a>
              </div>
            </div>
            <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
              <div class="flex mb-5 items-center">
                <Icon icon="mdi:server-network" class="text-sm text-[#64748B] mr-1" />
                <span class="text-xs text-secondary">Consensus Nodes</span>
              </div>
              <div class="text-xl text-main flex items-center justify-center font-medium"> {{paramStore.nodeVersion?.items?.length || '0' }}
              </div>
            </div>
            <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
              <div class="flex mb-5 items-center">
                <Icon icon="mdi:timer-outline" class="text-sm text-[#64748B] mr-1" />
                <span class="text-xs text-secondary">Avg Block Time (24h)</span>
              </div>
              <div class="text-xl text-main flex items-center justify-center font-medium"> {{ avgBlockProductionTime || 0  }}s
              </div>
            </div>
          </div>
          <div class="flex gap-2">
            <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-2/3 px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
              <div class="flex mb-5 items-center">
                <Icon icon="mdi:clock-outline" class="text-sm text-[#64748B] mr-1" />
                <div class="text-xs text-secondary">Latest Block Time</div>
              </div>
              <div class="text-xl text-main flex items-center justify-center font-medium">
                {{ latestBlockTime }}
              </div>
            </div>
            <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-1/3 px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
              <div class="flex mb-5 items-center">
                <Icon icon="mdi:chart-box-outline" class="text-sm text-[#64748B] mr-1" />
                <div class="text-xs text-secondary">Avg TX Per Block (24h)</div>
              </div>
              <div class="text-xl text-main flex items-center justify-center font-medium"> {{ averageTxPerBlock }}
              </div>
            </div>
          </div>
        </div>
        <div class="w-[65%] p-2" style="z-index: 1;">
          <div class="text-lg font-semibold text-main">Market Data</div>
          <div class="flex gap-2">
            <div class="w-[90%]">
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2 my-2">
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:swap-horizontal" class="text-sm mr-1 text-[#64748B]" />
                    <span class="text-xs text-secondary">24h Volume</span>
                  </div>
                  <div class="text-xl text-main flex items-center justify-center font-medium"> ${{format.formatNumber((store.coinInfo?.market_data?.total_volume?.usd || 0), '123,456,789.[00]') }}
                  </div>
                </div>
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:chart-pie" class="text-sm mr-1 text-[#64748B]" />
                    <span class="text-xs text-secondary">Market Cap</span>
                  </div>
                  <div class="text-xl text-main flex items-center justify-center font-medium">
                    ${{ format.formatNumber(store.coinInfo?.market_data?.market_cap?.usd || 0, '123,456,789.[00]') }}
                  </div>
                </div>
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:coins" class="text-sm mr-1 text-[#64748B]" />
                    <span class="text-[12px] text-secondary">Circulating Supply</span>
                    <span class="text-[12px] text-secondary ml-1">({{ store.coinInfo?.symbol?.toUpperCase() || '' }})</span>
                  </div>
                  <div class="text-xl text-main flex items-center justify-center font-medium"> {{format.formatNumber((store.coinInfo?.market_data?.circulating_supply || 0), '123,456,789.[]') }}
                    <!-- <span class="text-sm font-medium"></span> -->
                  </div>
                </div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:trophy" class="text-sm mr-1 text-[#64748B]" />
                    <span class="text-xs text-secondary">24h High / Low</span>
                  </div>
                  <div class="text-xs font-medium mt-1 flex gap-1">
                    <span class="text-xs text-[#60BC29]">${{ store.coinInfo?.market_data?.high_24h?.usd?.toFixed(6) || '0.00' }}</span>
                    /
                    <span class="text-xs text-[#EE6161]">${{ store.coinInfo?.market_data?.low_24h?.usd?.toFixed(6) || '0.00'}}</span>
                  </div>
                </div>
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:trending-up" class=" text-sm mr-1 text-[#64748B]" />
                    <span class="text-xs text-secondary">All Time High</span>
                    <span class="text-xs ml-2"
                      :class="{ 'text-[#EE6161]': (store.coinInfo?.market_data?.ath_change_percentage?.usd || 0) < 0, 'text-[#60BC29]': (store.coinInfo?.market_data?.ath_change_percentage?.usd || 0) > 0 }">
                      ({{store.coinInfo?.market_data?.ath_change_percentage?.usd?.toFixed(2) || '0.00' }}%)
                    </span>
                  </div>
                  <div class="text-xl text-main flex items-center justify-center font-medium">
                    ${{ store.coinInfo?.market_data?.ath?.usd?.toFixed(6) || '0.00' }}
                  </div>
                </div>
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center justify-evenly">
                    <Icon icon="mdi:trending-down" class="text-sm mr-1 text-[#64748B]" />
                    <span class="text-xs text-secondary">All Time Low</span>
                    <span class="text-xs ml-2"
                      :class="{ 'text-[#EE6161]': (store.coinInfo?.market_data?.atl_change_percentage?.usd || 0) < 0, 'text-[#60BC29]': (store.coinInfo?.market_data?.atl_change_percentage?.usd || 0) > 0 }">
                      ({{store.coinInfo?.market_data?.atl_change_percentage?.usd?.toFixed(2) || '0.00' }}%)
                    </span>
                  </div>
                  <div class="text-xl text-main flex items-center justify-center font-medium">
                    ${{ store.coinInfo?.market_data?.atl?.usd?.toFixed(6) || '0.00' }}
                  </div>
                </div>
              </div>
            </div>
            <div class="
             flex flex-col w-[25%] p-6 mt-2 rounded-2xl justify-between items-center
             bg-gradient-to-br from-[#1f3fbf] via-[#2447d6] to-[#1a2f8f]
             dark:from-[#1f3fbf] dark:via-[#2447d6] dark:to-[#1a2f8f]
             shadow-lg hover:shadow-xl transition-all duration-300
             ">
              <!-- Logo -->
              <img src="https://pocket.network/wp-content/uploads/2025/01/logo-white.png" alt="Coin logo" class="w-2/3 justify-self-center" />
              <!-- <img v-else src="https://pocket.network/wp-content/uploads/2024/12/logo.png" alt="Coin logo" class="w-2/3 justify-self-center" /> -->

              <!-- Price -->
              <div class="flex flex-col item-center mx-auto">
                <div class="text-xl text-center text-[#ffffff]">
                  ${{ store.coinInfo?.market_data?.current_price?.usd?.toFixed(6) || '0.00' }}
                </div>
                <div class="text-sm text-end"
                  :class="(store.coinInfo?.market_data?.price_change_percentage_24h || 0) > 0 ? 'text-[#60BC29]' : 'text-[#EE6161]'">
                  {{ (store.coinInfo?.market_data?.price_change_percentage_24h || 0) > 0 ? '+' : '' }} {{store.coinInfo?.market_data?.price_change_percentage_24h?.toFixed(2) || '0.00' }}%
                </div>
              </div>

              <!-- Buy Button -->
              <a class="!text-[#000000] btn btn-sm w-full !bg-[#ffd60a] !border-[#ffd60a]"
                :class="{ '!btn-[#60BC29]': store.trustColor === 'green', '!btn-warning': store.trustColor === 'yellow' }"
                :href="ticker?.trade_url" target="_blank">
                {{ $t('index.buy') }} {{ store.coinInfo?.symbol?.toUpperCase() || 'COIN'}}
              </a>
            </div>
          </div>
        </div>
        </div>  

      </div>  
      <div class="flex mt-4 mb-2 w-full flex-col lg:flex-row gap-4 bg-base-100 dark:bg-[#1a1f26]">  
        <!-- Mobile / Tablet view -->
        <div class="mobile-home">
          <!-- Network Status -->
          <div class="p-2 w-full lg:w-2/3">
            <div class="text-lg font-semibold text-main">Network Status</div>
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-2 my-2">
                <!-- Current Block Height -->
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-1 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex items-center mb-5">
                    <Icon icon="mdi:cube-scan" class="text-sm max-[1024px]:text-[8px] max-[1024px]:font-bold text-[#64748B] mr-1" />
                    <span class="text-[10px] max-[1024px]:text-[8px] max-[1024px]:font-bold text-secondary">Current Block Height</span>
                  </div>
                  <div class="text-xl max-[1024px]:text-xs text-main flex items-center justify-center font-medium">
                    {{ currentBlockHeight }}
                    <a :href="`/${chain}/blocks/${currentBlockHeight}`" class="ml-2 text-xl max-[1024px]:text-xs inline-block text-[#64748B] hover:text-info/70">
                      <Icon icon="mdi:arrow-right-circle" class="text-sm max-[1024px]:text-xs" />
                    </a>
                  </div>
                </div>

                <!-- Consensus Nodes -->
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-1 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:server-network" class="text-sm max-[1024px]:text-[8px] max-[1024px]:font-bold text-[#64748B] mr-1" />
                    <span class="text-[10px] max-[1024px]:text-[8px] max-[1024px]:font-bold text-secondary">Consensus Nodes</span>
                  </div>
                  <div class="text-xl max-[1024px]:text-xs text-main flex items-center justify-center font-medium">
                    {{ paramStore.nodeVersion?.items?.length || '0' }}
                  </div>
                </div>

                <!-- Avg Block Time (24) -->
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-1 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:timer-outline" class="text-sm max-[1024px]:text-[8px] max-[1024px]:font-bold text-[#64748B] mr-1" />
                    <span class="text-[10px] max-[1024px]:text-[8px] max-[1024px]:font-bold text-secondary">Avg Block Time (24h)</span>
                  </div>
                  <div class="text-xl max-[1024px]:text-xs text-main flex items-center justify-center font-medium">
                    {{ avgBlockProductionTime || 0 }}s
                  </div>
                </div>
              </div>

              <div class="flex gap-2 flex-col md:flex-row">

                <!-- Latest Block Time -->
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-1 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:clock-outline" class="text-sm max-[1024px]:text-[8px] max-[1024px]:font-bold text-[#64748B] mr-1" />
                    <div class="text-[10px] max-[1024px]:text-[8px] max-[1024px]:font-bold text-secondary">Latest Block Time</div>
                  </div>
                  <div class="text-xl max-[1024px]:text-xs text-main flex items-center justify-center font-medium">
                    {{ latestBlockTime }}
                  </div>
                </div>

                <!-- Avg TX Per Block (24h) -->
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-1 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:chart-box-outline" class="text-sm max-[1024px]:text-[8px] max-[1024px]:font-bold text-[#64748B] mr-1" />
                    <div class="text-[10px] max-[1024px]:text-[8px] max-[1024px]:font-bold text-secondary">Avg TX Per Block (24h)</div>
                  </div>
                  <div class="text-xl max-[1024px]:text-xs text-main flex items-center justify-center font-medium">
                    {{ averageTxPerBlock }}
                  </div>
                </div>
            </div>
          </div>
        </div>

        <!-- Mobile / Tablet view -->
        <div class="mobile-home">
          <!-- Market Data -->
          <div class="p-2 w-full lg:w-1/3">
            <div class="text-lg font-semibold text-main">Market Data</div>
            <div class="flex flex-col lg:flex-row gap-2">
              <div class="grid grid-cols-1 lg:grid-cols-3 gap-2 my-2 w-full">
                <!-- 24h Volume -->
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-1 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:swap-horizontal" class="text-sm mr-1 text-[#64748B]" />
                    <span class="text-[10px] text-secondary">24h Volume</span>
                  </div>
                  <div class="text-xl text-main flex items-center justify-center font-medium">
                    ${{ format.formatNumber((store.coinInfo?.market_data?.total_volume?.usd || 0), '123,456,789.[00]') }}
                  </div>
                </div>

                <!-- Market Cap -->
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-1 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:chart-pie" class="text-sm mr-1 text-[#64748B]" />
                    <span class="text-[10px] text-secondary">Market Cap</span>
                  </div>
                  <div class="text-xl text-main flex items-center justify-center font-medium">
                    ${{ format.formatNumber(store.coinInfo?.market_data?.market_cap?.usd || 0, '123,456,789.[00]') }}
                  </div>
                </div>

                <!-- Circulating Supply -->
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-1 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center gap-1">
                    <Icon icon="mdi:coins" class="text-sm mr-1 text-[#64748B]" />
                    <span class="text-[10px] text-secondary">Circulating Supply</span>
                    <span class="text-[10px] text-secondary">({{ store.coinInfo?.symbol?.toUpperCase() || '' }})</span>
                  </div>
                  <div class="text-xl text-main flex flex-col items-center font-medium">
                    {{ format.formatNumber((store.coinInfo?.market_data?.circulating_supply || 0), '123,456,789.[]') }}
                  </div>
                </div>

                <!-- 24h High/Low -->
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-1 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:trophy" class="text-sm mr-1 text-[#64748B]" />
                    <span class="text-[10px] text-secondary">24h High / Low</span>
                  </div>
                  <div class="text-xs font-medium mt-1 flex gap-1">
                    <span class="text-xs text-[#60BC29]">${{ store.coinInfo?.market_data?.high_24h?.usd?.toFixed(6) ||'0.00' }}</span> /
                    <span class="text-xs text-[#EE6161]">${{ store.coinInfo?.market_data?.low_24h?.usd?.toFixed(6) || '0.00' }}</span>
                  </div>
                </div>

                <!-- All Time High -->
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-1 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center">
                    <Icon icon="mdi:trending-up" class=" text-sm mr-1 text-[#64748B]" />
                    <span class="text-[10px] text-secondary">All Time High</span>
                    <span class="text-xs ml-2"
                      :class="{ 'text-[#EE6161]': (store.coinInfo?.market_data?.ath_change_percentage?.usd || 0) < 0, 'text-[#60BC29]': (store.coinInfo?.market_data?.ath_change_percentage?.usd || 0) > 0 }">
                      ({{ store.coinInfo?.market_data?.ath_change_percentage?.usd?.toFixed(2) || '0.00' }}%)
                    </span>
                  </div>
                  <div class="text-xl text-main flex items-center justify-center font-medium">
                    ${{ store.coinInfo?.market_data?.ath?.usd?.toFixed(6) || '0.00' }}
                  </div>
                </div>

                <!-- All Time Low -->
                <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-1 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
                  <div class="flex mb-5 items-center justify-evenly">
                    <Icon icon="mdi:trending-down" class="text-sm mr-1 text-[#64748B]" />
                    <span class="text-[10px] text-secondary">All Time Low</span>
                    <span class="text-xs ml-2"
                      :class="{ 'text-[#EE6161]': (store.coinInfo?.market_data?.atl_change_percentage?.usd || 0) < 0, 'text-[#60BC29]': (store.coinInfo?.market_data?.atl_change_percentage?.usd || 0) > 0 }">
                      ({{ store.coinInfo?.market_data?.atl_change_percentage?.usd?.toFixed(2) || '0.00' }}%)
                    </span>
                  </div>
                  <div class="text-xl text-main flex items-center justify-center font-medium">
                    ${{ store.coinInfo?.market_data?.atl?.usd?.toFixed(6) || '0.00' }}
                  </div>
                </div>

                <!-- Logo + Price + Buy Button -->
                <div class="flex flex-col w-full gap-2 p-3 mt-3 rounded-xl justify-center items-center  bg-gradient-to-br from-[#1f3fbf] via-[#2447d6] to-[#1a2f8f]
                    dark:from-[#1f3fbf] dark:via-[#2447d6] dark:to-[#1a2f8f]
                    shadow-lg hover:shadow-xl transition-all duration-300">
                  <img
                    src="https://pocket.network/wp-content/uploads/2025/01/logo-white.png"
                    alt="Coin logo" class="w-24" 
                  />

                  <div class="text-sm text-center text-[#ffffff]">
                    ${{ store.coinInfo?.market_data?.current_price?.usd?.toFixed(6) || '0.00' }}
                  </div>
                  <div class="text-xs"
                      :class="(store.coinInfo?.market_data?.price_change_percentage_24h || 0) > 0 ? 'text-[#60BC29]' : 'text-[#EE6161]'">
                    {{ (store.coinInfo?.market_data?.price_change_percentage_24h || 0) > 0 ? '+' : '' }}
                    {{ store.coinInfo?.market_data?.price_change_percentage_24h?.toFixed(2) || '0.00' }}%
                  </div>

                  <a class="!text-white btn btn-sm w-full !bg-[#ffd60a] !border-[#ffd60a]"
                    :href="ticker?.trade_url" target="_blank">
                    {{ $t('index.buy') }} {{ store.coinInfo?.symbol?.toUpperCase() || 'COIN' }}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    <!-- Network Statistics Section -->

    <!-- Network Statistics -->
    <div class="bg-base-100 dark:bg-[#1a1f26] pt-3 pb-4 mt-2">
      <div class="flex items-center mb-4">
        <div class="text-lg font-semibold text-main">Network Statistics</div>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-8 gap-4">
        <!-- Total Wallets -->
         <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
          <div class="flex mb-5 items-center">
            <Icon icon="mdi:wallet" class="text-sm mr-1 text-secondary" />
            <span class="text-xs text-secondary">Total Wallets</span>
          </div>
          <div class="text-xl text-main flex items-center justify-center font-medium"> {{ networkStats.wallets.toLocaleString() }}
          </div>
        </div>

        <!-- Applications -->
        <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
          <div class="flex mb-5 items-center">
            <Icon icon="mdi:apps" class="text-sm mr-1 text-secondary" />
            <span class="text-xs text-secondary">Applications</span>
          </div>
          <div class="text-xl text-main flex items-center justify-center font-medium">
            {{ networkStats.applications.toLocaleString() }}
          </div>
        </div>

        <!-- Suppliers -->
        <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
          <div class="flex mb-5 items-center">
            <Icon icon="mdi:package-variant" class="text-sm mr-1 text-secondary" />
            <span class="text-xs text-secondary">Suppliers</span>
          </div>
          <div class="text-xl text-main flex items-center justify-center font-medium">
            {{ networkStats.suppliers.toLocaleString() }}
          </div>
        </div>

        <!-- Gateways -->
        <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
          <div class="flex mb-5 items-center">
            <Icon icon="mdi:gate" class="text-sm mr-1 text-secondary" />
            <span class="text-xs text-secondary">Gateways</span>
          </div>
          <div class="text-xl text-main flex items-center justify-center font-medium">
            {{ networkStats.gateways.toLocaleString() }}
          </div>
        </div>

        <!-- Services -->
        <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
          <div class="flex mb-5 items-center">
            <Icon icon="mdi:handshake" class="text-sm mr-1 text-secondary" />
            <span class="text-xs text-secondary">Services</span>
          </div>
          <div class="text-xl text-main flex items-center justify-center font-medium">
            {{ networkStats.services.toLocaleString() }}
          </div>
        </div>

        <!-- Relays (24h) -->
        <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
          <div class="flex mb-5 items-center">
            <Icon icon="mdi:network" class="text-sm mr-1 text-secondary" />
            <span class="text-xs text-secondary">Relays (24h)</span>
          </div>
          <div class="text-xl text-main flex items-center justify-center font-medium">
            {{ formatWithCommas(totalRelays24h) }}
          </div>
        </div>

        <!-- Compute Units (24h) -->
        <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
          <div class="flex mb-5 items-center">
            <Icon icon="mdi:cpu-64-bit" class="text-sm mr-1 text-secondary" />
            <span class="text-xs text-secondary">Compute Units (24h)</span>
          </div>
          <div class="text-xl text-main flex items-center justify-center font-medium">
            {{ formatCompact(totalComputeUnits24h) }}
          </div>
        </div>

        <!-- Active Validators -->
        <div class="flex flex-col bg-[#ffffff] hover:bg-base-200 w-full px-2 py-4 rounded-xl justify-center items-center shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
          <div class="flex mb-5 items-center">
            <Icon icon="mdi:shield-check" class="text-sm mr-1 text-secondary" />
            <span class="text-xs text-secondary">Active Validators</span>
          </div>
          <div class="text-xl text-main flex items-center justify-center font-medium">
            {{ activeValidatorsCount }}
          </div>
        </div>

      </div>
    </div>

    <!-- Governance Section - Active Proposals -->
    <div v-if="blockchain.supportModule('governance')"
      class="bg-base-100 px-4 pt-3 pb-4 rounded-md shadow-md border-t-4 border-accent">
      <div class="flex items-center mb-4">
        <Icon icon="mdi:gavel" class="text-2xl text-accent mr-2" />
        <div class="text-lg font-semibold text-main">Active Proposals</div>
      </div>

      <div class="pb-4">
        <ProposalListItem :proposals="store?.proposals" />
      </div>
      <div class="py-8 text-center" v-if="store.proposals?.proposals?.length === 0">
        <Icon icon="mdi:vote-outline" class="text-4xl text-accent/40 mb-2" />
        <div class="text-secondary">No active proposals at this time</div>
      </div>
    </div>


    <!-- Charts Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
      <!-- Network Growth Chart -->
      <div class="bg-base-200 pt-3 rounded-lg hover:bg-base-300 shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
        <div class="flex items-center justify-between mb-1 px-5 gap-4">
          <div class="flex flex-1 items-center gap-4 justify-between">
            <div class="flex text-lg font-semibold text-main">Network Growth</div>
            <!-- Tabs -->
            <div class="flex tabs tabs-boxed bg-base-200 dark:bg-base-300">
              <button
                @click="networkGrowthTab = 'performance'"
                :class="[
                  'tab',
                  networkGrowthTab === 'performance' ? 'tab-active bg-[#09279F] text-white' : ''
                ]">
                Performance
              </button>
              <button
                @click="networkGrowthTab = 'core-services'"
                :class="[
                  'tab',
                  networkGrowthTab === 'core-services' ? 'tab-active bg-[#09279F] text-white' : ''
                ]">
                Services
              </button>
            </div>
          </div>
          <!-- Window selector -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-secondary">Window</span>
            <select
              v-model.number="networkGrowthWindow"
              class="select select-xs select-bordered bg-base-100 dark:bg-base-200 text-xs"
            >
              <option :value="7">7d</option>
              <option :value="15">15d</option>
            </select>
          </div>
        </div>
        
        <div class="dark:bg-base-200 bg-base-100 p-4 rounded-md relative">
          <div class="h-80">
            <ApexCharts 
              v-if="chartCategories.length > 0 && activeNetworkGrowthSeries.length > 0"
              :key="`${networkGrowthTab}-${networkGrowthChartType}-${performanceMetric}`"
              :type="networkGrowthChartType" 
              height="280" 
              :options="chartOptions" 
              :series="activeNetworkGrowthSeries" 
            />
            <div v-else class="flex items-center justify-center h-full">
              <div class="loading loading-spinner loading-md"></div>
              <span class="ml-2 text-secondary">Loading chart data...</span>
            </div>
          </div>
          <!-- Performance Metric Selector - Bottom Left (only shown when Performance tab is active) -->
          <div v-if="networkGrowthTab === 'performance'" class="absolute bottom-2 left-2 tabs tabs-boxed bg-base-200 dark:bg-base-300">
            <button
              @click="performanceMetric = 'compute-units'"
              :class="[
                'tab',
                performanceMetric === 'compute-units' 
                  ? 'tab-active bg-[#EF4444] text-white' 
                  : 'hover:bg-base-300'
              ]"
              title="Compute Units">
              <Icon icon="mdi:cpu-64-bit" class="text-sm mr-1" />
              Compute Units
            </button>
            <button
              @click="performanceMetric = 'relays'"
              :class="[
                'tab',
                performanceMetric === 'relays' 
                  ? 'tab-active bg-[#A855F7] text-white' 
                  : 'hover:bg-base-300'
              ]"
              title="Relays">
              <Icon icon="mdi:network" class="text-sm mr-1" />
              Relays
            </button>
          </div>
          <!-- Chart Type Selector - Bottom Right -->
          <div class="absolute bottom-2 right-2 tabs tabs-boxed bg-base-200 dark:bg-base-300">
            <button
              @click="networkGrowthChartType = 'bar'"
              :class="[
                'tab',
                networkGrowthChartType === 'bar' 
                  ? 'tab-active bg-[#09279F] text-white' 
                  : ''
              ]"
              title="Bar Chart">
              <Icon icon="mdi:chart-bar" class="text-sm" />
            </button>
            <button
              @click="networkGrowthChartType = 'area'"
              :class="[
                'tab',
                networkGrowthChartType === 'area' 
                  ? 'tab-active bg-[#09279F] text-white' 
                  : ''
              ]"
              title="Area Chart">
              <Icon icon="mdi:chart-areaspline" class="text-sm" />
            </button>
            <button
              @click="networkGrowthChartType = 'line'"
              :class="[
                'tab',
                networkGrowthChartType === 'line' 
                  ? 'tab-active bg-[#09279F] text-white' 
                  : ''
              ]"
              title="Line Chart">
              <Icon icon="mdi:chart-line" class="text-sm" />
            </button>
          </div>
        </div>
      </div>

      <!-- Transaction History Chart -->
      <div class="bg-base-200 pt-3 rounded-lg hover:bg-base-300 shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
        <div class="flex items-center justify-between mb-4 px-5">
          <div class="flex items-center">
            <!-- <Icon icon="mdi:chart-timeline-variant" class="text-2xl text-warning mr-2" /> -->
            <div class="text-lg font-semibold text-main">Transaction History</div>
          </div>
          <!-- Window selector -->
          <div class="flex items-center gap-2">
            <span class="text-xs text-secondary">Window</span>
            <select
              v-model.number="txHistoryWindow"
              class="select select-xs select-bordered bg-base-100 dark:bg-base-200 text-xs"
            >
              <option :value="7">7d</option>
              <option :value="15">15d</option>
              <option :value="30">1m</option>
            </select>
          </div>
        </div>
        <div class="dark:bg-base-200 bg-base-100 p-4 rounded-md relative">
          <div class="h-80">
            <ApexCharts 
              :type="txChartType" 
              height="280" 
              :options="txChartOptions" 
              :series="txChartSeries" 
              :key="`tx-${txChartType}`"
            />
          </div>
          <!-- Chart Type Selector - Bottom Right -->
          <div class="absolute bottom-2 right-2 tabs tabs-boxed bg-base-200 dark:bg-base-300">
            <button
              @click="txChartType = 'bar'"
              :class="[
                'tab',
                txChartType === 'bar' 
                  ? 'tab-active bg-[#09279F] text-white' 
                  : ''
              ]"
              title="Bar Chart">
              <Icon icon="mdi:chart-bar" class="text-sm" />
            </button>
            <button
              @click="txChartType = 'area'"
              :class="[
                'tab',
                txChartType === 'area' 
                  ? 'tab-active bg-[#09279F] text-white' 
                  : ''
              ]"
              title="Area Chart">
              <Icon icon="mdi:chart-areaspline" class="text-sm" />
            </button>
            <button
              @click="txChartType = 'line'"
              :class="[
                'tab',
                txChartType === 'line' 
                  ? 'tab-active bg-[#09279F] text-white' 
                  : ''
              ]"
              title="Line Chart">
              <Icon icon="mdi:chart-line" class="text-sm" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Tables Section -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
      <!-- Blocks Table -->
      <div class="bg-[#ffffff] hover:bg-base-200 pt-3 mb-5 rounded-lg shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <!-- <Icon icon="mdi:cube-outline" class="text-2xl text-info mr-2" /> -->
            <div class="text-lg font-semibold text-main ml-5">Latest Blocks</div>
          </div>
          <RouterLink :to="`/${chain}/blocks`"
            class="hover:text-info/70 text-sm flex items-center transition-colors duration-200 mr-5">
            View All
            <Icon icon="mdi:arrow-right" class="ml-1" />
          </RouterLink>
        </div>

        <div class="bg-base-200 rounded-md overflow-auto" style="max-height: 30rem;">
          <table class="table table-compact w-full bg-base-200">
            <thead class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200 sticky top-0 border-0">
              <tr class="border-none">
                <th class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200">{{ $t('block.block_header') }}</th>
                <th class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200">{{ $t('account.hash') }}</th>
                <th class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200">{{ $t('block.proposer') }}</th>
                <th class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200">{{ $t('module.tx') }}</th>
                <th class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200">{{ $t('account.time') }}</th>
                <th class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200">{{ $t('account.production_time') }}</th>
              </tr>
            </thead>
            <tbody v-if="loadingBlocks" >
            <tr class="text-center">
              <td colspan="5" class="py-8">
                <div class="flex justify-center items-center">
                  <div class="loading loading-spinner loading-md"></div>
                  <span class="ml-2">Loading blocks...</span>
                </div>
              </td>
            </tr>
            </tbody>
            <tbody  v-if="!loadingBlocks && blocks.length > 0">
              <tr v-for="block in blocks" :key="block.id"
                class="hover:bg-gray-100 dark:hover:bg-[#384059] dark:bg-base-200 bg-white border-0 rounded-xl">
                <td class="font-medium">{{ block.height }}</td>
                <td class="truncate text-[#153cd8] dark:text-warning" style="max-width: 12rem; overflow:hidden;">
                  <RouterLink class="truncate hover:underline" :title="block.hash"
                    :to="`/${chain}/blocks/${block.height}`">{{ block.hash || block.id.split(":")[1] }}
                  </RouterLink>
                </td>
                <td>{{ format.validator(block.proposer) }}</td>
                <td>{{ (block.transaction_count ?? 0).toLocaleString() }}</td>
                <td class="text-sm">{{ format.toDay(block.timestamp, 'from') }}</td>
                <td class="">{{ formatBlockTime(block.block_production_time || '0') }}</td>
              </tr>
            </tbody>
            <tbody v-else-if="!loadingBlocks && blocks.length === 0">
              <tr>
                <td colspan="5" class="text-center">No blocks found</td>
              </tr>
            </tbody>
          </table>
          
        </div>
      </div>

      <!-- Transactions Table -->
      <div class="bg-[#ffffff] hover:bg-base-200 pt-3 mb-5 rounded-lg shadow-md bg-gradient-to-b  dark:bg-[rgba(255,255,255,.03)] dark:hover:bg-[rgba(255,255,255,0.06)] border dark:border-white/10 dark:shadow-[0 solid #e5e7eb] hover:shadow-lg">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center">
            <!-- <Icon icon="mdi:file-document-outline" class="text-2xl text-black mr-2" /> -->
            <div class="text-lg font-semibold text-main ml-5">{{ $t('module.rtx') }}</div>
          </div>
          <RouterLink :to="`/${chain}/tx`"
            class="hover:text-warning/70 text-sm flex items-center transition-colors duration-200 mr-5">
            View All
            <Icon icon="mdi:arrow-right" class="ml-1" />
          </RouterLink>
        </div>

        <div class="bg-base-200 rounded-md overflow-auto" style="height: 30rem;" ref="txTableContainer">
          <table class="table table-compact w-full bg-base-200">
            <thead class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200 sticky top-0 border-0">
              <tr class="border-none">
                <th class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200">{{ $t('tx.tx_hash') }}</th>
                <th class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200">{{ $t('block.block') }}</th>
                <th class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200">{{ $t('staking.status') }}</th>
                <th class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200">{{ $t('account.type') }}</th>
                <th class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200">{{ $t('block.fees') }}</th>
                <th class="dark:bg-[rgba(255,255,255,.03)]  bg-base-200">{{ $t('account.time') }}</th>
              </tr>
            </thead>
            <tbody>
              <!-- Add spacer at the top to push visible content -->
              <tr v-if="visibleTxs.length > 0" class="h-0 m-0 p-0 border-none">
                <td :style="{ height: `${visibleTxs[0].index * itemHeight}px`, padding: 0 }" colspan="6"></td>
              </tr>

              <!-- Render only visible transactions -->
              <tr v-for="item in visibleTxs" :key="item.index"
                class="hover:bg-gray-100 dark:hover:bg-[#384059] dark:bg-base-200 bg-white border-0 rounded-xl">
                <td class="truncate text-[#153cd8]" style="max-width:10rem">
                  <RouterLink class="truncate hover:underline" :to="`/${props.chain}/tx/${item.item.hash}`">{{ item.item.hash }}</RouterLink>
                </td>
                <td class="text-sm text-[#153cd8]">
                  <RouterLink :to="`/${props.chain}/blocks/${item.item.block_height}`" class="hover:underline">{{ item.item.block_height }}</RouterLink>
                </td>
                <td>
                  <span class="text-xs truncate py-1 px-3 rounded-full"
                    :class="item.item.status || item.item.tx_response.code === 0 ? 'bg-[#60BC29]/10 text-[#60BC29]' : 'bg-[#E03834]/10 text-[#E03834]'">
                    {{ item.item.status || item.item.tx_response.code === 0 ? 'Success' : 'Failed' }}
                  </span>
                </td>
                <td>{{ item.item.type }}</td>
                <td>{{ format.formatTokens([{ amount: item.item.fee, denom: 'upokt' }]) }} </td>
                <td class="text-sm">{{ format.toDay(item.item.timestamp, 'from') }}</td>
              </tr>

              <!-- Add spacer at the bottom to maintain scroll height -->
              <tr v-if="visibleTxs.length > 0 && base.allTxs.length > 0" class="h-0 m-0 p-0 border-none">
                <td
                  :style="{ height: `${Math.max(0, base.allTxs.length - (visibleTxs[visibleTxs.length - 1].index + 1)) * itemHeight}px`, padding: 0 }"
                  colspan="6"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Node Information Section - Only shown if coingeckoId is not available -->
    <div v-if="!store.coingeckoId"
      class="bg-base-100 px-4 pt-3 pb-4 rounded-md shadow-md border-t-4 border-accent mt-5">
      <div class="flex items-center mb-4">
        <Icon icon="mdi:server" class="text-2xl text-accent mr-2" />
        <div class="text-lg font-semibold text-main">Node Information</div>
      </div>
      <div class="bg-base-200 rounded-md p-4">
        <ArrayObjectElement :value="paramStore.nodeVersion?.items" :thead="false" />
      </div>
    </div>
  </div>
</template>

<route>
  {
    meta: {
      i18n: 'dashboard',
      order: 1,
    }
  }
</route>

<style scoped>

.desktop-home {
  display: none;
}

.mobile-home {
  display: block;
}

/* Media query for desktop */
@media (min-width: 1024px) {
  .desktop-home {
    display: flex;
  }

  .mobile-home {
    display: none;
  }
}

/* Styles for virtualized tables */
.table tr.h-0 {
  display: table-row;
  line-height: 0;
  height: 0;
}

.table tr.h-0 td {
  padding: 0;
  border: none;
}

/* Optimize table rendering */
.table tbody tr {
  contain: layout style;
}

/* Fix for better scrolling performance */
.bg-base-200 {
  will-change: transform;
  transform: translateZ(0);
}
</style>