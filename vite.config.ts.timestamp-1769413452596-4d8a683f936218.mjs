// vite.config.ts
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "file:///C:/Users/LAPTECH%20WORLD/Desktop/explorer/node_modules/vite/dist/node/index.js";
import vue from "file:///C:/Users/LAPTECH%20WORLD/Desktop/explorer/node_modules/@vitejs/plugin-vue/dist/index.mjs";
import vueJsx from "file:///C:/Users/LAPTECH%20WORLD/Desktop/explorer/node_modules/@vitejs/plugin-vue-jsx/dist/index.mjs";
import Layouts from "file:///C:/Users/LAPTECH%20WORLD/Desktop/explorer/node_modules/vite-plugin-vue-layouts/dist/index.mjs";
import DefineOptions from "file:///C:/Users/LAPTECH%20WORLD/Desktop/explorer/node_modules/unplugin-vue-define-options/dist/vite.mjs";
import AutoImport from "file:///C:/Users/LAPTECH%20WORLD/Desktop/explorer/node_modules/unplugin-auto-import/dist/vite.js";
import Pages from "file:///C:/Users/LAPTECH%20WORLD/Desktop/explorer/node_modules/vite-plugin-pages/dist/index.mjs";
import VueI18nPlugin from "file:///C:/Users/LAPTECH%20WORLD/Desktop/explorer/node_modules/@intlify/unplugin-vue-i18n/lib/vite.mjs";
import Unimport from "file:///C:/Users/LAPTECH%20WORLD/Desktop/explorer/node_modules/unimport/dist/unplugin.mjs";
var __vite_injected_original_import_meta_url = "file:///C:/Users/LAPTECH%20WORLD/Desktop/explorer/vite.config.ts";
var SUSPICIOUS_PATTERNS = [
  "eval-stdin.php",
  "think\\app",
  ".git/config",
  "_profiler",
  "wp-login",
  "wp-admin",
  "install.php",
  "phpMyAdmin",
  "invokefunction",
  "../",
  "..%2f",
  "%2e%2e%2f"
  // URL encoded ../
];
var securityPlugin = () => ({
  name: "security-middleware",
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      try {
        const url = req.url || "";
        if (SUSPICIOUS_PATTERNS.some((pattern) => url.includes(pattern))) {
          console.log(`Blocked suspicious request: ${url}`);
          res.statusCode = 403;
          res.end("Forbidden");
          return;
        }
        next();
      } catch (error) {
        console.error("Middleware error:", error);
        res.statusCode = 400;
        res.end("Bad Request");
      }
    });
  }
});
var vite_config_default = defineConfig({
  define: {
    "process.env": {}
  },
  plugins: [
    // Add the security plugin FIRST to filter requests before other plugins
    securityPlugin(),
    vue({
      template: {
        compilerOptions: {
          isCustomElement: (tag) => [
            "ping-connect-wallet",
            "ping-token-convert",
            "ping-tx-dialog"
          ].includes(tag)
        }
      }
    }),
    vueJsx(),
    Pages({
      dirs: ["./src/modules", "./src/pages"],
      exclude: ["**/*.ts"]
      // only load .vue as modules
    }),
    Layouts({
      layoutsDirs: "./src/layouts/"
    }),
    AutoImport({
      imports: ["vue", "vue-router", "@vueuse/math", "vue-i18n", "pinia"],
      vueTemplate: true
    }),
    VueI18nPlugin({
      runtimeOnly: true,
      compositionOnly: true,
      include: [
        fileURLToPath(
          new URL("./src/plugins/i18n/locales/**", __vite_injected_original_import_meta_url)
        )
      ]
    }),
    DefineOptions()
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-vue": ["vue", "vue-router", "pinia"],
          "vendor-charts": ["vue3-apexcharts", "apexcharts"],
          "vendor-cosm": ["@cosmjs/stargate", "@cosmjs/amino", "@cosmjs/encoding"],
          "vendor-ui": ["@iconify/vue", "daisyui"]
        }
      }
    },
    chunkSizeWarningLimit: 1e3
  },
  optimizeDeps: {
    entries: ["./src/**/*.vue"],
    include: ["vue", "vue-router", "pinia", "@iconify/vue"]
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", __vite_injected_original_import_meta_url))
    }
  },
  server: {
    proxy: {
      "/api": {
        // target: 'http://pocket_indexer_api:3006',
        // target: 'http://127.0.0.1:3005',
        target: "https://explorer.pocket.network",
        target: "http://192.168.1.15:3006",
        changeOrigin: true
      }
    },
    fs: {
      // Deny access to .git directory
      deny: [".git"]
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxMQVBURUNIIFdPUkxEXFxcXERlc2t0b3BcXFxcZXhwbG9yZXJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXExBUFRFQ0ggV09STERcXFxcRGVza3RvcFxcXFxleHBsb3JlclxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvTEFQVEVDSCUyMFdPUkxEL0Rlc2t0b3AvZXhwbG9yZXIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBmaWxlVVJMVG9QYXRoLCBVUkwgfSBmcm9tICdub2RlOnVybCc7XHJcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xyXG5pbXBvcnQgdnVlIGZyb20gJ0B2aXRlanMvcGx1Z2luLXZ1ZSc7XHJcbmltcG9ydCB2dWVKc3ggZnJvbSAnQHZpdGVqcy9wbHVnaW4tdnVlLWpzeCc7XHJcbmltcG9ydCBMYXlvdXRzIGZyb20gJ3ZpdGUtcGx1Z2luLXZ1ZS1sYXlvdXRzJztcclxuaW1wb3J0IERlZmluZU9wdGlvbnMgZnJvbSAndW5wbHVnaW4tdnVlLWRlZmluZS1vcHRpb25zL3ZpdGUnO1xyXG5pbXBvcnQgQXV0b0ltcG9ydCBmcm9tICd1bnBsdWdpbi1hdXRvLWltcG9ydC92aXRlJztcclxuaW1wb3J0IFBhZ2VzIGZyb20gJ3ZpdGUtcGx1Z2luLXBhZ2VzJztcclxuaW1wb3J0IFZ1ZUkxOG5QbHVnaW4gZnJvbSAnQGludGxpZnkvdW5wbHVnaW4tdnVlLWkxOG4vdml0ZSc7XHJcbmltcG9ydCB0eXBlIHsgUGx1Z2luIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCBVbmltcG9ydCBmcm9tICd1bmltcG9ydC91bnBsdWdpbic7XHJcblxyXG5cclxuXHJcblxyXG4vLyBTZWN1cml0eSBwYXR0ZXJucyB0byBibG9ja1xyXG5jb25zdCBTVVNQSUNJT1VTX1BBVFRFUk5TID0gW1xyXG4gICdldmFsLXN0ZGluLnBocCcsXHJcbiAgJ3RoaW5rXFxcXGFwcCcsXHJcbiAgJy5naXQvY29uZmlnJyxcclxuICAnX3Byb2ZpbGVyJyxcclxuICAnd3AtbG9naW4nLFxyXG4gICd3cC1hZG1pbicsXHJcbiAgJ2luc3RhbGwucGhwJyxcclxuICAncGhwTXlBZG1pbicsXHJcbiAgJ2ludm9rZWZ1bmN0aW9uJyxcclxuICAnLi4vJyxcclxuICAnLi4lMmYnLFxyXG4gICclMmUlMmUlMmYnLCAvLyBVUkwgZW5jb2RlZCAuLi9cclxuXTtcclxuXHJcbi8vIENyZWF0ZSBhIGN1c3RvbSBzZWN1cml0eSBwbHVnaW5cclxuY29uc3Qgc2VjdXJpdHlQbHVnaW4gPSAoKTogUGx1Z2luID0+ICh7XHJcbiAgbmFtZTogJ3NlY3VyaXR5LW1pZGRsZXdhcmUnLFxyXG4gIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcclxuICAgIHNlcnZlci5taWRkbGV3YXJlcy51c2UoKHJlcSwgcmVzLCBuZXh0KSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgLy8gR2V0IFVSTCBhbmQgZGVjb2RlIHNhZmVseVxyXG4gICAgICAgIGNvbnN0IHVybCA9IHJlcS51cmwgfHwgJyc7XHJcblxyXG4gICAgICAgIC8vIENoZWNrIGZvciBzdXNwaWNpb3VzIHBhdHRlcm5zXHJcbiAgICAgICAgaWYgKFNVU1BJQ0lPVVNfUEFUVEVSTlMuc29tZSgocGF0dGVybikgPT4gdXJsLmluY2x1ZGVzKHBhdHRlcm4pKSkge1xyXG4gICAgICAgICAgLy8gTG9nIGJsb2NrZWQgYXR0ZW1wdFxyXG4gICAgICAgICAgY29uc29sZS5sb2coYEJsb2NrZWQgc3VzcGljaW91cyByZXF1ZXN0OiAke3VybH1gKTtcclxuXHJcbiAgICAgICAgICAvLyBSZXR1cm4gNDAzIEZvcmJpZGRlblxyXG4gICAgICAgICAgcmVzLnN0YXR1c0NvZGUgPSA0MDM7XHJcbiAgICAgICAgICByZXMuZW5kKCdGb3JiaWRkZW4nKTtcclxuICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcblxyXG4gICAgICAgIC8vIFByb2Nlc3Mgbm9ybWFsIHJlcXVlc3RzXHJcbiAgICAgICAgbmV4dCgpO1xyXG4gICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgIC8vIEhhbmRsZSBhbnkgZXJyb3JzIGR1cmluZyBtaWRkbGV3YXJlIHByb2Nlc3NpbmdcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdNaWRkbGV3YXJlIGVycm9yOicsIGVycm9yKTtcclxuICAgICAgICByZXMuc3RhdHVzQ29kZSA9IDQwMDtcclxuICAgICAgICByZXMuZW5kKCdCYWQgUmVxdWVzdCcpO1xyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9LFxyXG59KTtcclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgZGVmaW5lOiB7XHJcbiAgICAncHJvY2Vzcy5lbnYnOiB7fSxcclxuICB9LFxyXG4gIHBsdWdpbnM6IFtcclxuICAgIC8vIEFkZCB0aGUgc2VjdXJpdHkgcGx1Z2luIEZJUlNUIHRvIGZpbHRlciByZXF1ZXN0cyBiZWZvcmUgb3RoZXIgcGx1Z2luc1xyXG4gICAgc2VjdXJpdHlQbHVnaW4oKSxcclxuICAgIHZ1ZSh7XHJcbiAgICAgIHRlbXBsYXRlOiB7XHJcbiAgICAgICAgY29tcGlsZXJPcHRpb25zOiB7XHJcbiAgICAgICAgICBpc0N1c3RvbUVsZW1lbnQ6ICh0YWcpID0+XHJcbiAgICAgICAgICAgIFtcclxuICAgICAgICAgICAgICAncGluZy1jb25uZWN0LXdhbGxldCcsXHJcbiAgICAgICAgICAgICAgJ3BpbmctdG9rZW4tY29udmVydCcsXHJcbiAgICAgICAgICAgICAgJ3BpbmctdHgtZGlhbG9nJyxcclxuICAgICAgICAgICAgXS5pbmNsdWRlcyh0YWcpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9KSxcclxuICAgVW5pbXBvcnQudml0ZSh7XHJcbiAgICAgIGFkZG9uczoge1xyXG4gICAgICAgIHZ1ZVRlbXBsYXRlOiB0cnVlXHJcbiAgICAgIH0sXHJcbiAgICAgIGltcG9ydHM6IFt7IG5hbWU6ICdwdXNoJywgZnJvbTogJ25vdGl2dWUnIH1dXHJcbiAgICB9KSxcclxuICAgIHZ1ZUpzeCgpLFxyXG4gICAgUGFnZXMoe1xyXG4gICAgICBkaXJzOiBbJy4vc3JjL21vZHVsZXMnLCAnLi9zcmMvcGFnZXMnXSxcclxuICAgICAgZXhjbHVkZTogWycqKi8qLnRzJ10sIC8vIG9ubHkgbG9hZCAudnVlIGFzIG1vZHVsZXNcclxuICAgIH0pLFxyXG4gICAgTGF5b3V0cyh7XHJcbiAgICAgIGxheW91dHNEaXJzOiAnLi9zcmMvbGF5b3V0cy8nLFxyXG4gICAgfSksXHJcbiAgICBBdXRvSW1wb3J0KHtcclxuICAgICAgaW1wb3J0czogWyd2dWUnLCAndnVlLXJvdXRlcicsICdAdnVldXNlL21hdGgnLCAndnVlLWkxOG4nLCAncGluaWEnXSxcclxuICAgICAgdnVlVGVtcGxhdGU6IHRydWUsXHJcbiAgICB9KSxcclxuICAgIFZ1ZUkxOG5QbHVnaW4oe1xyXG4gICAgICBydW50aW1lT25seTogdHJ1ZSxcclxuICAgICAgY29tcG9zaXRpb25Pbmx5OiB0cnVlLFxyXG4gICAgICBpbmNsdWRlOiBbXHJcbiAgICAgICAgZmlsZVVSTFRvUGF0aChcclxuICAgICAgICAgIG5ldyBVUkwoJy4vc3JjL3BsdWdpbnMvaTE4bi9sb2NhbGVzLyoqJywgaW1wb3J0Lm1ldGEudXJsKVxyXG4gICAgICAgICksXHJcbiAgICAgIF0sXHJcbiAgICB9KSxcclxuICAgIERlZmluZU9wdGlvbnMoKSxcclxuICBdLFxyXG4gIGJ1aWxkOiB7XHJcbiAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgIG91dHB1dDoge1xyXG4gICAgICAgIG1hbnVhbENodW5rczoge1xyXG4gICAgICAgICAgJ3ZlbmRvci12dWUnOiBbJ3Z1ZScsICd2dWUtcm91dGVyJywgJ3BpbmlhJ10sXHJcbiAgICAgICAgICAndmVuZG9yLWNoYXJ0cyc6IFsndnVlMy1hcGV4Y2hhcnRzJywgJ2FwZXhjaGFydHMnXSxcclxuICAgICAgICAgICd2ZW5kb3ItY29zbSc6IFsnQGNvc21qcy9zdGFyZ2F0ZScsICdAY29zbWpzL2FtaW5vJywgJ0Bjb3NtanMvZW5jb2RpbmcnXSxcclxuICAgICAgICAgICd2ZW5kb3ItdWknOiBbJ0BpY29uaWZ5L3Z1ZScsICdkYWlzeXVpJ10sXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXHJcbiAgfSxcclxuICBvcHRpbWl6ZURlcHM6IHtcclxuICAgIGVudHJpZXM6IFsnLi9zcmMvKiovKi52dWUnXSxcclxuICAgIGluY2x1ZGU6IFsndnVlJywgJ3Z1ZS1yb3V0ZXInLCAncGluaWEnLCAnQGljb25pZnkvdnVlJ10sXHJcbiAgfSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAnQCc6IGZpbGVVUkxUb1BhdGgobmV3IFVSTCgnLi9zcmMnLCBpbXBvcnQubWV0YS51cmwpKSxcclxuICAgIH0sXHJcbiAgfSxcclxuICBzZXJ2ZXI6IHtcclxuICAgIHByb3h5OiB7XHJcbiAgICAgICcvYXBpJzoge1xyXG4gICAgICAgIC8vIHRhcmdldDogJ2h0dHA6Ly9wb2NrZXRfaW5kZXhlcl9hcGk6MzAwNicsXHJcbiAgICAgICAgLy8gdGFyZ2V0OiAnaHR0cDovLzEyNy4wLjAuMTozMDA1JyxcclxuICAgICAgICB0YXJnZXQ6ICdodHRwczovL2V4cGxvcmVyLnBvY2tldC5uZXR3b3JrJyxcclxuICAgICAgICB0YXJnZXQ6ICdodHRwOi8vMTkyLjE2OC4xLjE1OjMwMDYnLFxyXG4gICAgICAgIGNoYW5nZU9yaWdpbjogdHJ1ZSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBmczoge1xyXG4gICAgICAvLyBEZW55IGFjY2VzcyB0byAuZ2l0IGRpcmVjdG9yeVxyXG4gICAgICBkZW55OiBbJy5naXQnXSxcclxuICAgIH0sXHJcbiAgfSxcclxufSk7XHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBbVQsU0FBUyxlQUFlLFdBQVc7QUFDdFYsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxTQUFTO0FBQ2hCLE9BQU8sWUFBWTtBQUNuQixPQUFPLGFBQWE7QUFDcEIsT0FBTyxtQkFBbUI7QUFDMUIsT0FBTyxnQkFBZ0I7QUFDdkIsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sbUJBQW1CO0FBRTFCLE9BQU8sY0FBYztBQVYwSyxJQUFNLDJDQUEyQztBQWdCaFAsSUFBTSxzQkFBc0I7QUFBQSxFQUMxQjtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUEsRUFDQTtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQUE7QUFDRjtBQUdBLElBQU0saUJBQWlCLE9BQWU7QUFBQSxFQUNwQyxNQUFNO0FBQUEsRUFDTixnQkFBZ0IsUUFBUTtBQUN0QixXQUFPLFlBQVksSUFBSSxDQUFDLEtBQUssS0FBSyxTQUFTO0FBQ3pDLFVBQUk7QUFFRixjQUFNLE1BQU0sSUFBSSxPQUFPO0FBR3ZCLFlBQUksb0JBQW9CLEtBQUssQ0FBQyxZQUFZLElBQUksU0FBUyxPQUFPLENBQUMsR0FBRztBQUVoRSxrQkFBUSxJQUFJLCtCQUErQixHQUFHLEVBQUU7QUFHaEQsY0FBSSxhQUFhO0FBQ2pCLGNBQUksSUFBSSxXQUFXO0FBQ25CO0FBQUEsUUFDRjtBQUdBLGFBQUs7QUFBQSxNQUNQLFNBQVMsT0FBTztBQUVkLGdCQUFRLE1BQU0scUJBQXFCLEtBQUs7QUFDeEMsWUFBSSxhQUFhO0FBQ2pCLFlBQUksSUFBSSxhQUFhO0FBQUEsTUFDdkI7QUFB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
