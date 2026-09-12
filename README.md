# 🎟️ MSA - Sistema de Control y Verificación de Asistencia
### Evento Línea Premium

Sistema web optimizado para teléfonos móviles, tablets y computadoras, diseñado para el control de acceso, verificación de invitados y registro en puerta del **Evento Línea Premium MSA**.

---

## 🎨 Características Principales

1. **Identidad Corporativa MSA**:
   - Paleta de colores institucional: **Blanco**, **Rojo Corporativo (`#E50914`)** y **Negro Profundo (`#0A0C10`)**.
   - Logo oficial de MSA integrado.
   - **Cero emojis**: Uso exclusivo de íconos vectoriales SVG limpios (Lucide Icons).

2. **Búsqueda Rápida e Inteligente**:
   - Búsqueda instantánea por **Nombre Completo**, **Apellidos** o **Número de Teléfono**.
   - Normalización automática de tildes/acentos (ej. "Perez" encuentra "Pérez") y dígitos telefónicos.

3. **Gestión de Invitados no Registrados**:
   - Botón directo y visualizador de **Código QR** para el formulario oficial de registro:
     `https://forms.gle/ZMx54sLXi2kvEavt9`
   - El personal en puerta puede mostrar el código QR en pantalla para que el invitado lo escanee desde la cámara de su celular.
   - Opción de **Registro Rápido en Puerta** para registrar e ingresar inmediatamente al invitado.

4. **Control de Acompañantes y Marcación de Ingreso**:
   - Contador dinámico de acompañantes `[-] / [+]` con límite establecido en la lista oficial.
   - Botón de **"Permitir Ingreso"** con hora exacta de entrada registrada y opción para deshacer.
   - Métricas en tiempo real: Total Invitados, Ingresados, Pendientes, Total personas en sala y porcentaje de asistencia.

5. **Exportación de Reportes**:
   - Botón para descargar el reporte actualizado en formato **Excel (.xlsx)** con los estados de asistencia y marcas de tiempo.

6. **100% Adaptable para Móviles (Responsive)**:
   - Diseñado pensando en el personal que opera desde teléfonos celulares en la entrada del evento.
   - Soporte offline con respaldo automático en `LocalStorage`.

---

## 🚀 Cómo Ejecutar Localmente

1. Abre la terminal en esta carpeta:
   ```bash
   cd "c:\xampp\htdocs\Validaciòn_asistencia"
   ```

2. Instala las dependencias (si aún no lo has hecho):
   ```bash
   npm install
   ```

3. Inicia el servidor:
   ```bash
   npm start
   ```

4. Abre tu navegador en:
   ```text
   http://localhost:3000
   ```

---

## ☁️ Cómo Subir a Vercel

El proyecto ya incluye la configuración lista en `vercel.json` y `api/index.js`.

### Opción 1: Con la CLI de Vercel (Recomendada)
1. Instala Vercel CLI globalmente si no lo tienes:
   ```bash
   npm i -g vercel
   ```
2. Ejecuta en la carpeta del proyecto:
   ```bash
   vercel
   ```
3. Sigue las instrucciones interactivas en pantalla (presiona Enter para confirmar las opciones predeterminadas).
4. Para desplegar a producción:
   ```bash
   vercel --prod
   ```

### Opción 2: Desde GitHub a Vercel
1. Sube este proyecto a un repositorio de GitHub.
2. Ingresa a [vercel.com](https://vercel.com) e inicia sesión.
3. Haz clic en **"Add New Project"** e importa el repositorio de GitHub.
4. Vercel detectará la configuración automáticamente con `vercel.json`. Haz clic en **Deploy**.

---

## 📁 Estructura del Proyecto

```text
├── api/
│   └── index.js              # Entrypoint serverless para Vercel
├── data/
│   └── guests.json           # Base de datos inicial de invitados
├── public/
│   ├── app.js                # Lógica del cliente, búsqueda, QR y check-in
│   ├── index.html            # Interfaz de usuario responsive para móviles
│   ├── logo.png              # Logo corporativo MSA
│   └── style.css             # Estilos y animaciones personalizadas
├── scripts/
│   └── import_excel.js       # Script para actualizar invitados desde Excel
├── LISTA DE INVITADOS...xlsx # Archivo Excel original
├── package.json              # Dependencias y scripts
├── server.js                 # Servidor Express Node.js
├── vercel.json               # Configuración de despliegue en Vercel
└── README.md                 # Documentación del sistema
```
