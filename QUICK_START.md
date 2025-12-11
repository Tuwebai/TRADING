# Quick Start Guide

## 🚀 Inicio Rápido

### 1. Instalación

```bash
npm install
```

### 2. Ejecutar en Desarrollo

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

### 3. Construir para Producción

```bash
npm run build
```

Los archivos compilados estarán en la carpeta `dist/`

## 📋 Características Principales

### ✅ Sistema de Trades Completo
- **Agregar Trade**: Click en "Add Trade" en la página de Trades
- **Editar Trade**: Click en el ícono de editar en cualquier trade
- **Cerrar Trade**: Click en el ícono X para cerrar una posición abierta
- **Filtrar**: Usa los filtros en la parte superior para buscar trades específicos
- **Eliminar**: Click en el ícono de basura para eliminar un trade

### ✅ Rutinas y Checklists
- Navega a "Routines" para gestionar tus checklists diarias
- Agrega items personalizados a cada checklist
- Marca items como completados
- Edita o elimina items según necesites

### ✅ Analytics en Tiempo Real
- Todas las métricas se calculan automáticamente desde tus trades
- Visualiza tu curva de equity
- Monitorea tu win rate, profit factor, y más

### ✅ Configuración
- Ajusta el tamaño de tu cuenta
- Selecciona tu moneda base
- Configura el riesgo por trade
- Cambia entre tema claro/oscuro

## 💾 Almacenamiento

Todos los datos se guardan automáticamente en `localStorage` del navegador. Para migrar a una base de datos real, solo necesitas modificar el archivo `/src/lib/storage.ts`.

## 🎨 Personalización

- **Tema**: Cambia entre claro/oscuro en Settings
- **Colores**: Edita las variables CSS en `/src/index.css`
- **Componentes**: Todos los componentes UI están en `/src/components/ui/`

## 📁 Estructura del Proyecto

```
src/
 ├─ components/     # Componentes reutilizables
 ├─ pages/          # Páginas principales
 ├─ lib/            # Utilidades y cálculos
 ├─ store/          # Estado global (Zustand)
 └─ types/          # Definiciones TypeScript
```

## 🔧 Scripts Disponibles

- `npm run dev` - Servidor de desarrollo
- `npm run build` - Construir para producción
- `npm run preview` - Previsualizar build de producción
- `npm run lint` - Ejecutar linter

## ⚠️ Notas Importantes

- **Sin datos de prueba**: El sistema no incluye datos dummy. Todo es generado por el usuario.
- **Validación completa**: Todos los formularios tienen validación
- **Cálculos automáticos**: PnL y R/R se calculan automáticamente
- **Responsive**: La interfaz se adapta a diferentes tamaños de pantalla

## 🐛 Solución de Problemas

### Error de importación con `@/`
Asegúrate de que `vite.config.ts` tenga configurado el alias correctamente.

### Los datos no se guardan
Verifica que el navegador permita localStorage. Algunos navegadores en modo privado pueden bloquearlo.

### El tema no cambia
Asegúrate de que el componente Settings esté cargando correctamente. Recarga la página después de cambiar el tema.

## 📚 Próximos Pasos

1. Agrega tu primer trade
2. Configura tus rutinas diarias
3. Revisa tus analytics regularmente
4. Ajusta la configuración según tus necesidades

¡Listo para empezar a trackear tus trades! 🎯

