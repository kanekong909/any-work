# NexoAdmin — Frontend Angular

## Instalación

```bash
cd nexoadmin-frontend
npm install
npm start   # http://localhost:4200
```

## Configuración

En `src/environments/environment.ts` ajusta `apiUrl` si tu backend corre en otro puerto.
Para producción, edita `src/environments/environment.prod.ts` con la URL de Railway.

## Build para Railway

```bash
npm run build:prod
# Output: dist/nexoadmin-frontend/browser/
```

En Railway crea un **Static Site** apuntando a `dist/nexoadmin-frontend/browser` y agrega:
- Source: `/*` → Destination: `/index.html`

## Flujo de usuario

1. `/auth/register` → crea cuenta + tenant automáticamente con plan Free
2. `/onboarding` → wizard 6 pasos (tipo negocio, datos, módulos, colores, equipo)
3. `/dashboard` → app principal con sidebar adaptado al negocio
4. `/settings` → cambio de colores, datos y solicitud de upgrade de plan
5. `/admin` → solo superadmin (tú): gestión de tenants y activación de pagos

## Estructura

```
src/app/
├── core/
│   ├── models/        # Interfaces TypeScript de todas las entidades
│   ├── services/      # AuthService (signals), ApiService
│   ├── guards/        # authGuard, guestGuard, onboardingGuard, superadminGuard
│   └── interceptors/  # JWT automático + refresh silencioso en 401
├── modules/
│   ├── auth/          # Login + Registro + AuthLayout
│   ├── onboarding/    # Wizard 6 pasos con colores dinámicos
│   ├── dashboard/     # KPIs, ventas recientes, stock bajo
│   ├── inventory/     # CRUD productos + categorías
│   ├── sales/         # POS + historial de ventas
│   ├── expenses/      # Registro y listado de gastos
│   ├── settings/      # Config negocio + colores + planes
│   └── admin/         # Panel superadmin
└── shared/
    └── components/
        └── layout/    # Sidebar colapsable + topbar mobile responsive
```
