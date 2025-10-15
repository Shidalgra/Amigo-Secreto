# 🌐 Guía de Deployment en Netlify

## ✅ Compatibilidad Garantizada

Tu aplicación de **Amigo Secreto** está **100% optimizada** para Netlify. Todos los archivos necesarios están incluidos:

- ✅ `_redirects` - Manejo de URLs con parámetros
- ✅ `netlify.toml` - Configuración automática
- ✅ URLs dinámicas compatibles con `.netlify.app`
- ✅ LocalStorage funcionando correctamente

## 🚀 Pasos para Desplegar

### Opción 1: Drag & Drop (Más Fácil)

1. **Comprimir archivos**: Selecciona todos los archivos del proyecto y créalos en un ZIP
2. **Ir a Netlify**: Visita [netlify.com](https://netlify.com)
3. **Arrastrar ZIP**: Arrastra el archivo ZIP a la zona de "Deploy"
4. **¡Listo!**: Tu sitio estará disponible en segundos

### Opción 2: Conectar con GitHub (Recomendado)

1. **Subir a GitHub**: Push tu código a un repositorio de GitHub
2. **Conectar Netlify**: En Netlify, conecta tu cuenta de GitHub
3. **Seleccionar repo**: Elige tu repositorio de Amigo Secreto
4. **Deploy automático**: Netlify configurará todo automáticamente

## 🔗 URLs de Ejemplo

Una vez desplegado, tus enlaces únicos se verán así:

```
https://tu-sitio-123abc.netlify.app/?participant=María&secret=ABC123&code=XYZ789
```

## ⚙️ Configuración Automática

El archivo `netlify.toml` incluye:

- **Redirects**: Para manejar enlaces únicos
- **Headers de seguridad**: Protección adicional
- **Cache optimizado**: Velocidad máxima

## 🔍 Verificar Funcionamiento

Después del deploy:

1. ✅ **Página principal**: Debe cargar normalmente
2. ✅ **Agregar participantes**: Debe funcionar sin errores
3. ✅ **Generar códigos**: Debe mostrar enlaces con tu dominio .netlify.app
4. ✅ **Enlaces únicos**: Deben abrir el modal de verificación
5. ✅ **LocalStorage**: Los datos deben persistir entre sesiones

## 🛠 Troubleshooting

### Si los enlaces únicos no funcionan:

1. **Verificar archivo `_redirects`**: Debe estar en la raíz del proyecto
2. **Revisar netlify.toml**: Debe tener la configuración de redirects
3. **Check del deploy**: Revisar que no haya errores en el log de Netlify

### Si localStorage no funciona:

- **Verificar HTTPS**: Netlify siempre usa HTTPS, localStorage funciona perfectamente
- **Revisar consola**: F12 → Console para ver errores
- **Fallback activo**: El sistema tiene fallbacks automáticos

## 📱 Compartir Enlaces

Una vez desplegado, puedes:

1. **Usar la app normalmente**: Agregar participantes y generar códigos
2. **Enlaces automáticos**: El sistema generará URLs con tu dominio de Netlify
3. **WhatsApp ready**: Los mensajes incluirán las URLs correctas
4. **Compartir por cualquier medio**: Email, SMS, redes sociales, etc.

## 🎯 Ejemplo Completo

```bash
# 1. Tu sitio en Netlify
https://amigo-secreto-navidad.netlify.app

# 2. Enlace único generado para María
https://amigo-secreto-navidad.netlify.app/?participant=María García&secret=MG2024XYZ&code=ABC123

# 3. María hace clic → Ve modal → Ingresa "ABC123" → Ve su asignación
```

## 🎄 ¡Listo para Usar!

Tu sistema de Amigo Secreto con códigos únicos funcionará perfectamente en Netlify. Los participantes recibirán sus enlaces únicos y podrán acceder de forma segura a sus asignaciones.

---

**💡 Tip**: Revisa la página `demo.html` desplegada para ver ejemplos en vivo del funcionamiento.