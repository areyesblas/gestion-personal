---
name: arkeyone-ui-design
description: Design system y guía de UI/UX de ARKEYONE (branding, colores, tipografía, layout, componentes, estados, responsive, checklist de pantalla nueva). Úsalo antes de diseñar o construir cualquier pantalla o componente nuevo de la app, o al tocar branding/logo, para que todo se sienta parte del mismo producto.
---

# ARKEYONE UI Design System

## 1. Regla principal

ARKEYONE debe sentirse como un centro de control personal premium: ordenado, sereno, inteligente y fácil de leer. La interfaz debe priorizar la información importante, reducir ruido visual y permitir que cada usuario configure su panel.

No inventes otra identidad visual para una pantalla nueva. Todas las pantallas deben parecer parte del mismo producto.

## 2. Branding oficial

Usa SIEMPRE el logo oficial proporcionado en:

`references/LogoARKEY-ONE.png`

No redibujes, deformes, simplifiques ni cambies los colores del logotipo.

Identidad:

- Nombre: ARKEY·ONE
- Slogan: "Ordena tu mundo, mejora tu vida."
- Azul marino principal: `#0B2348` / `#102B55`
- Azul ARKEYONE brillante: `#087CF5` / `#1296FF`
- Fondo general: `#F5F7FB`
- Superficie: `#FFFFFF`
- Texto principal: `#14213D`
- Texto secundario: `#667085`
- Bordes: `#DDE3EC`
- Éxito: `#16A36A`
- Advertencia: `#F4A51C`
- Error: `#E5484D`

Los colores pueden variar ligeramente por contexto, pero la identidad azul marino + azul brillante debe permanecer reconocible.

## 3. Principios UX

- Primero la información, después la decoración.
- Una pantalla debe responder rápidamente: "¿Qué necesita mi atención?"
- Usa jerarquía visual clara: título > sección > dato > acción.
- Evita saturar el dashboard.
- Mantén mucho espacio en blanco.
- Las acciones primarias deben ser evidentes.
- Los estados deben poder entenderse sin depender únicamente del color.
- Usa iconos sencillos y consistentes.
- No conviertas cada módulo en una tarjeta innecesaria.
- La interfaz debe funcionar igual de bien para usuarios nuevos y avanzados.

## 4. Panel principal configurable

El Centro de mando / Inicio es configurable por usuario.

### Primera experiencia

Al crear una cuenta, muestra un dashboard por defecto equilibrado con:

- Saludo y contexto del día.
- Atención prioritaria / tareas de hoy.
- Agenda próxima.
- Proyectos activos.
- Resumen financiero protegido.
- Hábitos o progreso personal.
- Accesos rápidos.
- Asistente ARKEYONE.

El dashboard inicial debe verse completo y premium, pero no abrumador.

### Personalización

Incluye una acción visible como: "Personalizar panel"

El usuario puede:

- Mostrar u ocultar widgets.
- Cambiar el orden mediante drag & drop.
- Elegir entre tamaños disponibles cuando tenga sentido.
- Guardar su configuración.
- Restaurar el panel recomendado por ARKEYONE.

Los widgets deben ser modulares y reutilizables.

## 5. Estructura desktop

Usa preferentemente:

### Sidebar izquierda

- Logo oficial.
- Navegación principal.
- Separadores por grupos.
- Estado activo claramente visible.
- Configuración y cerrar sesión al final.
- Fondo navy profundo.

Navegación base: Inicio, Agenda, Proyectos, Tareas, Notas, Citas, Trabajo, Dinero, Negocio, Personal, Configuración.

No es obligatorio mostrar todos en cada breakpoint.

### Header

- Buscador global ARKEYONE.
- Notificaciones.
- Avatar/perfil.
- Acciones contextuales si son necesarias.

### Main

- Fondo claro.
- Contenedor amplio.
- Grid responsive.
- Cards blancas con bordes suaves.
- Sombras muy discretas.

## 6. Cards y componentes

Características:

- Border radius aproximado: 12–18 px.
- Border sutil `#DDE3EC`.
- Shadow suave, nunca pesada.
- Padding generoso.
- Encabezado con icono + título + acción secundaria.
- Números importantes grandes.
- Texto secundario pequeño y gris.

Evita: bordes gruesos, gradientes fuertes, sombras oscuras, neumorfismo, glassmorphism excesivo, animaciones innecesarias.

## 7. Atención prioritaria

Las tareas deben organizarse por contexto, por ejemplo: Vencidas, Hoy, Próximas, Sin fecha.

Las tareas vencidas deben ser claramente reconocibles, pero sin convertir toda la interfaz en una pantalla de alerta.

Usa checkbox, título, proyecto/contexto, fecha/estado y menú contextual.

## 8. Información protegida

Finanzas y otra información sensible pueden aparecer bloqueadas.

Patrón recomendado:

- Icono de candado.
- Mensaje breve: "Tu información está protegida".
- Explicación corta.
- Botón "Desbloquear".
- Nunca mostrar datos sensibles accidentalmente.

## 9. Finanzas

Cuando se muestran ingresos/gastos:

- Usa verde para ingresos y rojo para egresos con moderación.
- Mantén cifras legibles.
- Permite ocultar el importe.
- No hagas gráficos complejos en el dashboard principal.
- Los detalles deben abrirse en el módulo correspondiente.

## 10. Asistente ARKEYONE

El asistente debe sentirse integrado, no como publicidad.

Preferencia:

- Botón flotante discreto en la esquina inferior derecha.
- Icono limpio.
- Tooltip contextual: "Asistente ARKEYONE".
- Puede abrir chat, comandos rápidos o acciones inteligentes.

No uses un botón gigante que cubra contenido.

## 11. Responsive

- **Desktop:** sidebar completa + grid de múltiples columnas.
- **Tablet:** sidebar reducida o colapsable + grid de 2 columnas.
- **Mobile:** navegación inferior o menú compacto, una columna, cards apiladas, acciones principales accesibles con una mano, evita tablas anchas.

No simplemente reduzcas el desktop: reorganiza la jerarquía.

## 12. Tipografía

- Preferencia: Inter, SF Pro Display, SF Pro Text o equivalente sans-serif moderna.
- Títulos semibold/bold.
- Texto regular.
- Números destacados con peso alto.
- Evita tipografías decorativas.

## 13. Iconografía

Usa una sola familia de iconos en toda la aplicación: Lucide (web/Android), SF Symbols cuando corresponda a iOS, o equivalente consistente.

Los iconos deben comunicar función, no decorar.

## 14. Estados

Cada componente importante debe contemplar: normal, hover, focus, active, disabled, loading, empty, error, success.

Los estados vacíos deben explicar qué puede hacer el usuario.

## 15. Microinteracciones

Usa animaciones rápidas y discretas: 150–250 ms, ease-out, cambios suaves de color, sombra o posición.

No uses animaciones que distraigan de productividad.

## 16. Accesibilidad

Siempre: contraste suficiente, focus visible, áreas táctiles adecuadas, labels claros, no depender solamente del color, texto legible, navegación por teclado en web.

## 17. Regla para nuevas pantallas

Antes de diseñar una nueva pantalla, identifica:

1. Objetivo principal del usuario.
2. Acción principal.
3. Información crítica.
4. Información secundaria.
5. Estado vacío.
6. Estados de error/loading.
7. Cómo encaja con la navegación ARKEYONE.

Después reutiliza componentes existentes antes de crear otros nuevos.

## 18. Regla para código

Si el proyecto ya tiene componentes, estilos, tokens o variables:

- reutilízalos;
- no dupliques CSS;
- no cambies globalmente la identidad para resolver una sola pantalla;
- crea componentes reutilizables;
- mantén responsive behavior;
- conserva accesibilidad.

Si existe un design system en el repositorio, intégrate a él en vez de reemplazarlo.

## 19. Criterio visual final

Antes de considerar terminada una pantalla, verifica:

- ¿Se reconoce inmediatamente como ARKEYONE?
- ¿El logo oficial está intacto?
- ¿La jerarquía visual es clara?
- ¿Hay suficiente espacio en blanco?
- ¿La pantalla se entiende en menos de unos segundos?
- ¿Las acciones importantes destacan?
- ¿Los datos sensibles están protegidos?
- ¿Funciona en desktop, tablet y móvil?
- ¿Los componentes pueden reutilizarse?
- ¿El usuario puede personalizar Inicio cuando corresponda?

El resultado debe sentirse como un producto SaaS profesional de alto nivel: sobrio, moderno, humano, confiable y extremadamente claro.
