<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Inventory rules (low stock, expiry warnings, price formatting) live as pure functions in `src/lib/inventario.ts` with tests beside them — keeps business rules testable without the database.
- Staff-only screens live under `src/routes/_authenticated/` and read data with the browser client so row-level security applies to the signed-in user.
- Stock changes only inside the `registrar_venta` database function (one transaction: ventas + detalle_ventas + stock); the browser has no UPDATE on `productos.stock` — keeps inventory consistent and tamper-proof.
- Role checks for RLS live in the non-exposed `private` schema (`private.es_personal`, `private.es_gerente`); screens for staff sit under the `_authenticated/_personal` layout, which blocks accounts without a cajero/gerente row in `usuario_roles`.
