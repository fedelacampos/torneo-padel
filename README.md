# PadelTorneos

Web y app de celular (PWA) para que los complejos de pádel organicen sus torneos.

## Qué incluye

**Para los jugadores y el público**
- Página de cada complejo con sus torneos, con su logo y su color.
- Torneo en vivo: zonas con tabla de posiciones, cuadro de eliminación y resultados por set.
  El tiebreak se ve en chiquito (7-6⁵) y el supertiebreak aparece resaltado. La página se actualiza sola cada 20 segundos.
- Inscripción online: nombre, dirección, teléfono, Instagram y categoría de los dos jugadores, más la disponibilidad
  horaria y la confirmación obligatoria de que pueden jugar sábado y domingo.
- Pago: botón a Mercado Pago, alias para copiar y botón "Ya pagué", que le avisa al organizador.
- Ranking anual por categoría.
- Se instala en el celular con "Agregar a pantalla de inicio".

**Estructura de la web de cada complejo**
- `/<complejo>`: portada con foto de fondo y botón INGRESAR.
- `/<complejo>/inicio`: menú con Reservá tu cancha (link externo), Mirá tu partido (próximamente), Torneos y Restobar.
- `/<complejo>/restobar`: tienda con carrito. El pedido se envía por WhatsApp con el detalle y el total, y ofrece pagar por Mercado Pago.

**Para el organizador** (`/<complejo>/admin`)
- Torneos con varias categorías en simultáneo. Cada categoría tiene su formato:
  - Zonas + eliminación directa (tamaño de zona y clasificados por zona configurables)
  - Eliminación directa
  - Americano (todos contra todos)
- Formato de partido: al mejor de 3 sets con tiebreak, o 2 sets + supertiebreak a 10 con diferencia de 2.
- Sorteo automático: cabezas de serie, zonas parejas y cuadro con pases directos (byes),
  evitando que dos parejas de la misma zona se crucen en la primera ronda.
- Carga de resultados set por set, que se valida en el momento, y W.O.
- Día, hora y cancha de cada partido.
- Inscripción manual de parejas y confirmación o rechazo de las que se anotan por la web.
- Pagos: cada jugador se marca como pagado en efectivo, por transferencia o por Mercado Pago, y se ven los totales.
- WhatsApp: el mensaje con los horarios de cada jugador y los recordatorios de la próxima hora salen listos para enviar.
- Restobar: productos con foto, precio, categoría y disponibilidad.
- Ajustes: nombre, logo, foto de portada (se suben desde el celular), color, link de reservas,
  WhatsApp del organizador y del restobar, Mercado Pago, alias y puntos del ranking.

## Puntos del ranking (por defecto, editables)
Perdedor de zona o 32avos: 25 · 16avos: 37 · Octavos: 50 · Cuartos: 75 · Semifinal: 100 · Finalista: 150 · Campeón: 200.
En el formato americano cuenta la posición final: 1° campeón, 2° finalista, 3°-4° semifinal, 5°-8° cuartos.
Los jugadores se identifican por el teléfono, así los puntos se suman aunque cambien de pareja.

## Cómo correrlo

```bash
npm install
cp .env.example .env     # y poner DATABASE_URL="file:./dev.db"
npm run local:setup      # base SQLite local + complejo de demo: /demo (admin: demo1234)
npm run dev              # http://localhost:3000
npm test             # tests de reglas de puntuación, sorteo y ranking
```

## Recordatorios automáticos por WhatsApp
Sin configurar nada, el organizador envía cada mensaje con un toque: WhatsApp se abre con el texto ya escrito.
Para que los recordatorios salgan solos 1 hora antes:
1. Crear una cuenta de WhatsApp Business Platform (Meta) y aprobar una plantilla con 5 variables
   (nombre, hora, cancha, rival, complejo).
2. Completar `WHATSAPP_TOKEN`, `WHATSAPP_PHONE_ID`, `WHATSAPP_TEMPLATE` y `CRON_SECRET` en `.env`.
3. Llamar a `GET /api/recordatorios` cada 5 o 10 minutos (header `Authorization: Bearer <CRON_SECRET>`),
   o ejecutar `npm run reminders` desde un cron.

## Publicar (Supabase + Vercel)
1. Supabase: crear proyecto y copiar las dos "connection strings" (pooler 6543 y directa 5432).
2. Vercel: importar el repositorio de GitHub y cargar las variables de `.env.example`.
3. Cada publicación crea o actualiza las tablas y crea el complejo inicial si no existe.
