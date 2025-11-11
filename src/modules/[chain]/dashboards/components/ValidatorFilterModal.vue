<script lang="ts" setup>
import { ref, computed, watch } from 'vue';
import { Icon } from '@iconify/vue';
import { useRouter, useRoute } from 'vue-router';
import { useBlockchain } from '@/stores';
import { useValidatorServiceSearch, type ValidatorSearchResult, type ServiceSearchResult } from '../composables/useValidatorPerformance';

const props = defineProps<{
  modelValue: boolean;
  initial: {
    domain?: string;
    owner_address?: string;
    supplier_address?: string;
    chain?: string;
    start_date: string;
    end_date: string;
  };
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'apply', payload: any): void;
}>();

const open = computed({
  get: () => props.modelValue,
  set: (v: boolean) => emit('update:modelValue', v),
});

const router = useRouter();
const route = useRoute();
const chainStore = useBlockchain();
const searchQuery = ref<string>('');
const ownerAddress = ref<string>(props.initial?.owner_address || '');
const supplierAddress = ref<string>(props.initial?.supplier_address || '');
const start = ref<string>(props.initial?.start_date);
const end = ref<string>(props.initial?.end_date);

// Get chain from route params or fallback to chainStore
const currentChain = computed(() => {
  return (route.params.chain as string) || chainStore?.current?.chainName || 'pocket-beta';
});

const { loading: searchLoading, error: searchError, results: searchResults, search: performSearch } = useValidatorServiceSearch(props.initial?.chain);

// Debounce search
let searchTimeout: ReturnType<typeof setTimeout> | null = null;
watch(searchQuery, (newQuery) => {
  if (searchTimeout) clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    performSearch(newQuery);
  }, 300);
});

// Clear search results when modal closes
watch(open, (isOpen) => {
  if (!isOpen) {
    searchQuery.value = '';
    searchResults.value = null;
  }
});

function selectValidator(result: ValidatorSearchResult) {
  // Navigate to validator page
  // Use operator_address if available (standard validator identifier), otherwise use validator_account_address
  const validatorAddress = result.operator_address || result.validator_account_address;
  
  // Close modal and navigate
  open.value = false;
  router.push(`/${currentChain.value}/staking/${validatorAddress}`);
}

function extractDomainFromUrl(jsonRpcUrl: string): string | null {
  let urlString = jsonRpcUrl;
  
  // If json_rpc_url is a JSON string, try to parse it
  if (urlString && (urlString.startsWith('{') || urlString.startsWith('['))) {
    try {
      const parsed = JSON.parse(urlString);
      urlString = parsed.json_rpc_url || parsed.url || parsed.endpoint || urlString;
    } catch {
      // If parsing fails, try to extract URL from the JSON string
      const urlMatch = urlString.match(/https?:\/\/[^\s"',}]+/);
      if (urlMatch) {
        urlString = urlMatch[0];
      }
    }
  }
  
  // Extract domain from URL string
  if (urlString) {
    try {
      const url = new URL(urlString);
      return url.hostname.replace(/^www\./, '');
    } catch {
      const match = urlString.match(/https?:\/\/(?:www\.)?([^\/\s"',}]+)/);
      if (match && match[1]) {
        return match[1].replace(/^www\./, '').split(':')[0]; // Remove port if present
      }
    }
  }
  
  return null;
}

function selectDomain(domain: string) {
  // Find all services that match this domain
  const matchingServices = searchResults.value?.services?.filter(service => {
    const serviceDomain = extractDomainFromUrl(service.json_rpc_url);
    if (!serviceDomain) return false;
    return serviceDomain === domain || serviceDomain.replace('www.', '') === domain.replace('www.', '');
  }) || [];
  
  // Collect all unique supplier addresses from matching services
  const allSuppliers = new Set<string>();
  matchingServices.forEach(service => {
    service.supplier_operator_addresses.forEach(addr => {
      if (addr) allSuppliers.add(addr);
    });
  });
  
  // Set supplier addresses (unique, comma-separated)
  supplierAddress.value = Array.from(allSuppliers).join(',');
  
  // Clear owner filter when selecting domain (per API best practices)
  ownerAddress.value = '';
  searchQuery.value = '';
  searchResults.value = null;
}

// Extract unique domains from services
const uniqueDomains = computed(() => {
  if (!searchResults.value?.services || searchResults.value.services.length === 0) {
    return [];
  }
  
  const domainSet = new Set<string>();
  
  searchResults.value.services.forEach(service => {
    const domain = extractDomainFromUrl(service.json_rpc_url);
    if (domain) {
      domainSet.add(domain);
    }
  });
  
  return Array.from(domainSet).sort();
});

// Get unique supplier count for a domain
function getDomainSupplierCount(domain: string): number {
  if (!searchResults.value?.services) return 0;
  
  // Find all services matching this domain
  const matchingServices = searchResults.value.services.filter(s => {
    const serviceDomain = extractDomainFromUrl(s.json_rpc_url);
    if (!serviceDomain) return false;
    return serviceDomain === domain || serviceDomain.replace('www.', '') === domain.replace('www.', '');
  });
  
  // Collect all unique supplier addresses
  const uniqueSuppliers = new Set<string>();
  matchingServices.forEach(service => {
    service.supplier_operator_addresses.forEach(addr => {
      if (addr) uniqueSuppliers.add(addr);
    });
  });
  
  return uniqueSuppliers.size;
}

function preset(days: number | null) {
  if (days === null) {
    // All time - set to very early date and current date
    start.value = new Date('2020-01-01').toISOString();
    end.value = new Date().toISOString();
  } else {
  const e = new Date();
  const s = new Date(e.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  start.value = s.toISOString();
  end.value = e.toISOString();
  }
}

function apply() {
  emit('apply', {
    owner_address: ownerAddress.value || undefined,
    supplier_address: supplierAddress.value || undefined,
    start_date: start.value,
    end_date: end.value,
  });
  open.value = false;
}

function clearSearch() {
  searchQuery.value = '';
  searchResults.value = null;
}

function isPresetActive(days: number | null): boolean {
  if (!start.value || !end.value) return false;
  
  const now = new Date();
  const endDate = new Date(end.value);
  const startDate = new Date(start.value);
  
  // Check if end date is today (within 1 hour tolerance)
  const isToday = Math.abs(now.getTime() - endDate.getTime()) < 60 * 60 * 1000;
  
  if (days === null) {
    // All time - check if start is very early
    const veryEarly = new Date('2020-01-01');
    return startDate.getTime() <= veryEarly.getTime() && isToday;
  }
  
  if (!isToday) return false;
  
  const expectedStart = new Date(now.getTime() - (days - 1) * 24 * 60 * 60 * 1000);
  const diff = Math.abs(startDate.getTime() - expectedStart.getTime());
  // Allow 1 hour tolerance
  return diff < 60 * 60 * 1000;
}
</script>

<template>
  <dialog class="modal" :open="open">
    <div class="modal-box dark:bg-base-100 bg-base-200 w-11/12 max-w-6xl">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-bold text-lg">Validator Filters</h3>
        <button class="btn btn-sm btn-circle" @click="open=false">
          <Icon icon="mdi:close" />
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="md:col-span-2">
          <label class="label text-xs">Search Validators or Services</label>
          <div class="relative">
            <input 
              v-model="searchQuery" 
              class="input input-bordered w-full shadow-sm" 
              placeholder="Search by validator name, address, or service JSON-RPC URL..."
              @focus="performSearch(searchQuery)"
            />
            <div v-if="searchLoading" class="absolute right-3 top-3">
              <span class="loading loading-spinner loading-xs"></span>
            </div>
            <div v-if="searchError" class="text-error text-xs mt-1">{{ searchError }}</div>
            
            <!-- Search Results Dropdown -->
            <div 
              v-if="searchResults && !searchLoading" 
              class="absolute z-10 w-full mt-1 bg-base-100 dark:bg-base-200 border border-base-300 rounded-lg shadow-lg max-h-64 overflow-y-auto"
            >
              <!-- No Results -->
              <div v-if="(!searchResults.validators || searchResults.validators.length === 0) && uniqueDomains.length === 0" class="p-4 text-center text-sm text-base-content/60">
                No results found
              </div>
              
              <!-- Validator Results -->
              <div v-if="searchResults.validators?.length > 0" class="p-2">
                <div class="text-xs font-semibold text-base-content/70 mb-1 px-2">Validators</div>
                <div 
                  v-for="validator in searchResults.validators" 
                  :key="validator.validator_account_address"
                  class="p-2 hover:bg-base-200 dark:hover:bg-base-300 rounded cursor-pointer transition-colors"
                  @click="selectValidator(validator)"
                >
                  <div class="font-medium">{{ validator.moniker || 'Unknown' }}</div>
                  <div class="text-xs text-base-content/60 font-mono">{{ validator.validator_account_address }}</div>
                  <div v-if="validator.operator_address" class="text-xs text-base-content/50 font-mono">{{ validator.operator_address }}</div>
                </div>
              </div>
              
              <!-- Domain Results (from Services) -->
              <div v-if="uniqueDomains.length > 0" class="p-2" :class="{ 'border-t border-base-300': searchResults.validators?.length > 0 }">
                <div class="text-xs font-semibold text-base-content/70 mb-1 px-2">Domains</div>
                <div 
                  v-for="domain in uniqueDomains" 
                  :key="domain"
                  class="p-2 hover:bg-base-200 dark:hover:bg-base-300 rounded cursor-pointer transition-colors"
                  @click="selectDomain(domain)"
                >
                  <div class="font-medium">{{ domain }}</div>
                  <div class="text-xs text-base-content/50">
                    {{ getDomainSupplierCount(domain) }} supplier(s)
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div>
          <label class="label text-xs">Owner Address</label>
          <div class="flex gap-2">
            <input v-model="ownerAddress" class="input input-bordered w-full font-mono flex-1 shadow-sm" placeholder="pokt1..." />
            <button v-if="ownerAddress" class="btn btn-sm btn-ghost" @click="ownerAddress = ''">
              <Icon icon="mdi:close" />
            </button>
          </div>
        </div>

        <div>
          <label class="label text-xs">Supplier Operator Address(es)</label>
          <div class="flex gap-2">
            <textarea 
              v-model="supplierAddress" 
              class="textarea textarea-bordered w-full font-mono flex-1 min-h-[100px] shadow-sm" 
              placeholder="poktvaloper1... (comma-separated for multiple)"
              rows="4"
            ></textarea>
            <button v-if="supplierAddress" class="btn btn-sm btn-ghost self-start" @click="supplierAddress = ''">
              <Icon icon="mdi:close" />
            </button>
          </div>
          <div class="text-xs text-base-content/60 mt-1">
            <span v-if="supplierAddress && supplierAddress.includes(',')" class="text-warning">
              Multiple suppliers selected - results will be aggregated
            </span>
            <span v-else>Multiple addresses can be comma-separated</span>
          </div>
        </div>

        <div class="grid grid-cols-1 gap-2">
          <label class="label text-xs flex items-center gap-2">
            <Icon icon="mdi:calendar-range" class="text-sm" />
            Date Range (UTC)
          </label>
          <div class="flex gap-2 flex-wrap">
            <button 
              class="btn btn-xs" 
              :class="isPresetActive(7) ? 'btn-primary' : 'btn-outline'"
              @click="preset(7)"
            >
              Last 7 Days
            </button>
            <button 
              class="btn btn-xs" 
              :class="isPresetActive(30) ? 'btn-primary' : 'btn-outline'"
              @click="preset(30)"
            >
              Last 30 Days
            </button>
            <button 
              class="btn btn-xs" 
              :class="isPresetActive(90) ? 'btn-primary' : 'btn-outline'"
              @click="preset(90)"
            >
              Last 90 Days
            </button>
            <button 
              class="btn btn-xs" 
              :class="isPresetActive(null) ? 'btn-primary' : 'btn-outline'"
              @click="preset(null)"
            >
              All Time
            </button>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="label label-text text-xs py-1">Start Date</label>
              <input 
                type="datetime-local" 
                class="input input-bordered input-sm w-full shadow-sm" 
                :value="start ? new Date(start).toISOString().slice(0, 16) : ''"
                @change="(e) => { const target = e.target as HTMLInputElement; if (target?.value) start = new Date(target.value).toISOString(); }"
              />
            </div>
            <div>
              <label class="label label-text text-xs py-1">End Date</label>
              <input 
                type="datetime-local" 
                class="input input-bordered input-sm w-full shadow-sm" 
                :value="end ? new Date(end).toISOString().slice(0, 16) : ''"
                @change="(e) => { const target = e.target as HTMLInputElement; if (target?.value) end = new Date(target.value).toISOString(); }"
              />
            </div>
          </div>
        </div>

        <div>
          <label class="label text-xs">Group By</label>
          <div class="flex items-center gap-3 text-sm">
            <input type="radio" checked disabled /> <span>Day (fixed)</span>
          </div>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn btn-ghost" @click="open=false">Cancel</button>
        <button class="btn btn-primary" @click="apply">Apply</button>
      </div>
    </div>
  </dialog>
</template>


<style scoped>
.modal-box {
  width: 100%;
  max-width: 50vw;
}
</style>