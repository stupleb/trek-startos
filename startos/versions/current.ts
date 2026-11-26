import { IMPOSSIBLE, VersionInfo } from '@start9labs/start-sdk'

export const current = VersionInfo.of({
  version: '5.2.1:0',
  releaseNotes: {
    en_US:
      'Updated TREK to 5.2.1, which closes a security hole in passkey registration and fixes blank Mapbox maps, the Atlas city count, and hotel bookings in AI imports and wallet passes. Full release notes: https://github.com/liketrek/TREK/releases/tag/v5.2.1',
    es_ES:
      'TREK se actualizó a 5.2.1, que cierra un fallo de seguridad en el registro de llaves de acceso y corrige los mapas de Mapbox en blanco, el recuento de ciudades del Atlas y las reservas de hotel en las importaciones con IA y en los pases de cartera. Notas completas: https://github.com/liketrek/TREK/releases/tag/v5.2.1',
    de_DE:
      'TREK wurde auf 5.2.1 aktualisiert. Die Version schließt eine Sicherheitslücke bei der Registrierung von Passkeys und behebt leere Mapbox-Karten, die Städtezählung im Atlas sowie Hotelbuchungen bei KI-Importen und in Wallet-Pässen. Vollständige Versionshinweise: https://github.com/liketrek/TREK/releases/tag/v5.2.1',
    pl_PL:
      'Zaktualizowano TREK do 5.2.1, które usuwa lukę bezpieczeństwa przy rejestracji kluczy dostępu i naprawia puste mapy Mapbox, liczbę miast w Atlasie oraz rezerwacje hoteli w importach AI i kartach do portfela. Pełne informacje o wydaniu: https://github.com/liketrek/TREK/releases/tag/v5.2.1',
    fr_FR:
      "TREK passe en 5.2.1, qui corrige une faille de sécurité lors de l'enregistrement des clés d'accès, ainsi que les cartes Mapbox vides, le décompte des villes de l'Atlas et les réservations d'hôtel dans les imports par IA et les cartes de portefeuille. Notes de version complètes : https://github.com/liketrek/TREK/releases/tag/v5.2.1",
  },
  migrations: {
    up: async ({ effects }) => {},
    down: IMPOSSIBLE,
  },
})
