import { useHead } from '@vueuse/head';
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const baseUrl = 'https://explorer.pocket.network';
const defaultImage = 'https://pocket.network/wp-content/uploads/2024/12/logo.png';
const siteName = 'Pocket Network Explorer';

export function useSEO(options: {
  title?: string | (() => string);
  description?: string | (() => string);
  image?: string | (() => string);
  keywords?: string | (() => string);
  canonical?: string | (() => string);
  type?: string;
}) {
  const route = useRoute();
  
  const getTitle = () => {
    const title = typeof options.title === 'function' ? options.title() : options.title;
    if (title) {
      return `${title} | ${siteName}`;
    }
    return siteName;
  };

  const getDescription = () => {
    const desc = typeof options.description === 'function' ? options.description() : options.description;
    return desc || 'Explore the Pocket Network blockchain. View blocks, transactions, validators, and network statistics on the official Pocket Network Explorer.';
  };

  const getCanonical = () => {
    const canonical = typeof options.canonical === 'function' ? options.canonical() : options.canonical;
    if (canonical) {
      return canonical;
    }
    return `${baseUrl}${route.fullPath}`;
  };

  const getImage = () => {
    const image = typeof options.image === 'function' ? options.image() : options.image;
    return image || defaultImage;
  };

  const getKeywords = () => {
    const baseKeywords = 'Pocket Network, Pocket, Pocket Explorer, Pocket Network Explorer, blockchain explorer, POKT, validator, node runner';
    const keywords = typeof options.keywords === 'function' ? options.keywords() : options.keywords;
    if (keywords) {
      return `${baseKeywords}, ${keywords}`;
    }
    return baseKeywords;
  };

  const fullTitle = computed(() => getTitle());
  const fullDescription = computed(() => getDescription());
  const canonicalUrl = computed(() => getCanonical());
  const ogImage = computed(() => getImage());
  const metaKeywords = computed(() => getKeywords());

  useHead({
    title: fullTitle,
    meta: [
      {
        name: 'description',
        content: fullDescription,
      },
      {
        name: 'keywords',
        content: metaKeywords,
      },
      // Open Graph
      {
        property: 'og:title',
        content: fullTitle,
      },
      {
        property: 'og:description',
        content: fullDescription,
      },
      {
        property: 'og:image',
        content: ogImage,
      },
      {
        property: 'og:url',
        content: canonicalUrl,
      },
      {
        property: 'og:type',
        content: options.type || 'website',
      },
      {
        property: 'og:site_name',
        content: siteName,
      },
      // Twitter Card
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: fullTitle,
      },
      {
        name: 'twitter:description',
        content: fullDescription,
      },
      {
        name: 'twitter:image',
        content: ogImage,
      },
    ],
    link: [
      {
        rel: 'canonical',
        href: canonicalUrl,
      },
    ],
  });
}

