
/**
 * Types des `routeRules` de nuxt.config.ts. Le schéma Nuxt installé attend que le serveur (Nitro) déclare
 * ses propres options de route via `NitroTypes.routeRuleConfig`, ce que @nuxt/nitro-server ne fait pas
 * encore : sans cette déclaration, `headers` (CSP, cache…) est refusé à tort par `nuxt typecheck`.
 */
declare module '@nuxt/schema' {
  interface NitroTypes {
    routeRuleConfig: import('nitropack/types').NitroRouteConfig & { ssr?: boolean }
  }
}

export {}
