# WhatsApp Business: aviso automático de inscripciones

Cuando alguien se inscribe en la web, el WhatsApp Business del complejo le manda al
organizador un mensaje con la pareja y dos botones: **Confirmar inscripción** y **Cancelar inscripción**.

Meta solo permite que una empresa inicie conversaciones con **plantillas aprobadas**, por eso hay
que crear la plantilla una vez (paso 5).

## 1. Cuenta comercial de Meta
Entrar a https://business.facebook.com y crear la cuenta del complejo (si ya tienen una para
Instagram/Facebook, sirve la misma). Recomendado: verificar el negocio (Configuración → Centro de seguridad).

## 2. App de WhatsApp
1. https://developers.facebook.com → **Mis apps** → **Crear app** → tipo **Empresa** (Business).
2. Dentro de la app, agregar el producto **WhatsApp** y vincular la cuenta comercial.

## 3. Número del complejo
En **WhatsApp → Configuración de la API** (API Setup) → **Agregar número de teléfono**.
- Tiene que ser un número que reciba SMS o llamada para verificarlo.
- Si ese número ya se usa en la app de WhatsApp, Meta puede pedir migrarlo; lo más simple es usar un chip nuevo
  solo para el complejo.
- El número del organizador (el que recibe los avisos) tiene que ser **otro** número.

## 4. Medio de pago
En **WhatsApp Manager → Facturación**, agregar una tarjeta. Meta cobra un monto bajo por cada mensaje de plantilla
(categoría "Utilidad"); las tarifas por país están en la web de Meta.

## 5. Crear la plantilla
**WhatsApp Manager → Plantillas de mensajes → Crear plantilla**
- Categoría: **Utilidad**
- Nombre: `nueva_inscripcion`
- Idioma: **Español (ARG)**

**Cuerpo** (copiar tal cual):
```
🎾 Nueva inscripción
{{1}} · {{2}}

Jugador 1: {{3}}
Jugador 2: {{4}}
Disponibilidad: {{5}}

Revisá la categoría y confirmá o cancelá la inscripción.
```
Ejemplos que pide Meta para las variables: `Torneo Fin de Año`, `7ma Damas`,
`Laura Gómez · +5491144441111`, `Ana Ruiz · +5491144442222`, `Viernes desde las 19`.

**Botones** → *Llamada a la acción* → *Visitar sitio web*, dos botones, los dos con URL **dinámica**:

| Texto del botón | URL |
|---|---|
| Confirmar inscripción | `https://torneo-padel-sooty.vercel.app/r/ok/{{1}}` |
| Cancelar inscripción | `https://torneo-padel-sooty.vercel.app/r/no/{{1}}` |

Ejemplo de URL que pide Meta: `https://torneo-padel-sooty.vercel.app/r/ok/abc123`.
(Si la web tiene otro dominio, usar ese.) Enviar a revisión: suele aprobarse en minutos u horas.

## 6. Token permanente
**Configuración del negocio → Usuarios → Usuarios del sistema → Agregar** (rol Administrador).
Asignarle la app y la cuenta de WhatsApp, y **Generar token** con los permisos
`whatsapp_business_messaging` y `whatsapp_business_management`, vencimiento **Nunca**. Guardarlo en un lugar seguro.

## 7. Cargar los datos en Vercel
**Settings → Environment Variables**:

| Variable | Valor |
|---|---|
| `WHATSAPP_TOKEN` | el token del paso 6 |
| `WHATSAPP_PHONE_ID` | el **Identificador del número de teléfono** (WhatsApp → Configuración de la API) |
| `WHATSAPP_TEMPLATE_INSCRIPCION` | `nueva_inscripcion` |
| `WHATSAPP_LANG` | `es_AR` |

Después **Deployments → ⋯ → Redeploy**.

## 8. Probar
1. En **Ajustes del complejo**, verificar el **WhatsApp del organizador** (con código de país, ej. `5491123456789`).
2. Hacer una inscripción de prueba desde la web.
3. Debe llegar el mensaje al organizador. En el panel, al abrir la inscripción, figura
   "Aviso por WhatsApp Business: ✅ enviado" o el motivo por el que no salió.
