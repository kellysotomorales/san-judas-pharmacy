# Roadmap — Farmacia San Judas SIG

- [x] Productos: alertas (rojo stock ≤ mínimo, naranja < 30 días, vencido aparte)
- [x] Productos: listar, buscar, crear y editar (solo gerente)
- [x] Seguridad: solo cajero/gerente en usuario_roles; nadie se asigna rol
- [x] Comprobar los 15 productos por rol en la base de datos
- [x] Ventas: cliente, búsqueda de productos, varias líneas, cantidades, subtotal, total, quitar líneas, confirmar
- [x] Ventas: registro transaccional en la base de datos (ventas + detalle_ventas + descuento de stock, "Stock insuficiente")
- [x] Ventas: el navegador no modifica el inventario directamente; cajero y gerente pueden vender
- [x] Comprobar ventas en la base de datos (simulación cajero/gerente/sin rol)
- [ ] Probar ventas y productos en pantalla con sesión — bloqueado: no puedo iniciar sesión en este proyecto; lo prueba Kelly
- [x] Ventas: bloquear productos vencidos (pantalla y base de datos)
- [ ] Ejecutar exclusivamente el SQL definitivo corregido mediante autorización y comprobar 10 ventas en septiembre, octubre y noviembre de 2026
- [ ] Activar consultas del dashboard preparado (KPI, gráfico, rotación) — pendiente de autorización de Supabase
- [ ] Comprobar gráfico con datos reales y permisos gerente/cajero — requiere consultas instaladas y sesión; acceso anónimo comprobado
- [x] Corregir SQL para resolver códigos e IDs reales, precios de productos y vencimiento < 30 días; presentar para autorización sin ejecutarlo
