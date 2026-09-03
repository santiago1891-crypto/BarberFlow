import { useEffect, useMemo, useState } from "react";
import { DollarSign, Scissors, Receipt, ChevronLeft, ChevronRight, CreditCard, Filter } from "lucide-react";
import { serviciosRealizadosApi, barberosApi, tiposServicioApi, turnosApi, pagosApi } from "../../../lib/resources.js";
import { formatMoney, formatDateTime } from "../../../lib/format.js";
import { fullName } from "../../../lib/barberStatus.js";
import { toast } from "../../../lib/toast.js";
import StatCard from "../../ui/StatCard.jsx";
import Modal from "../../ui/Modal.jsx";
import { Field, TextInput, SelectInput } from "../../ui/Field.jsx";
import { LoadingBlock, EmptyBlock } from "../../ui/StateBlocks.jsx";

const PAGE_SIZE = 10;

const METODOS = [
  ["efectivo", "Efectivo"],
  ["tarjeta_debito", "Tarjeta de débito"],
  ["tarjeta_credito", "Tarjeta de crédito"],
  ["transferencia", "Transferencia"],
  ["mercado_pago", "Mercado Pago"],
];

function rangeFor(preset) {
  const now = new Date();
  if (preset === "hoy") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    return { fecha_desde: start.toISOString(), fecha_hasta: now.toISOString() };
  }
  if (preset === "semana") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { fecha_desde: start.toISOString(), fecha_hasta: now.toISOString() };
  }
  if (preset === "mes") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    return { fecha_desde: start.toISOString(), fecha_hasta: now.toISOString() };
  }
  return {};
}

export default function HistorialVentas({ search }) {
  const [servicios, setServicios] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [turnosMap, setTurnosMap] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [preset, setPreset] = useState("mes");
  const [barberoFiltro, setBarberoFiltro] = useState("");
  const [page, setPage] = useState(0);

  const [pagoModal, setPagoModal] = useState(null); // servicio
  const [pagoForm, setPagoForm] = useState({ metodo: "efectivo", monto: "", estado: "pagado", referencia_externa: "" });
  const [savingPago, setSavingPago] = useState(false);
  const [pagoError, setPagoError] = useState("");

  async function loadCatalogos() {
    try {
      const [b, t, turnos] = await Promise.all([
        barberosApi.list({ limit: 200 }),
        tiposServicioApi.list({ limit: 200 }),
        turnosApi.list({ limit: 500 }),
      ]);
      setBarberos(b);
      setTipos(t);
      setTurnosMap(new Map(turnos.map((tu) => [tu.id, tu])));
    } catch (err) {
      toast.error(err.message || "No se pudieron cargar los catálogos.");
    }
  }

  async function loadServicios() {
    setLoading(true);
    try {
      const params = { limit: 200, ...rangeFor(preset) };
      if (barberoFiltro) params.barbero_id = barberoFiltro;
      const data = await serviciosRealizadosApi.list(params);
      setServicios(data.sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)));
      setPage(0);
    } catch (err) {
      toast.error(err.message || "No se pudo cargar el historial de ventas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    loadServicios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, barberoFiltro]);

  const barberosById = useMemo(() => new Map(barberos.map((b) => [b.id, b])), [barberos]);
  const tiposById = useMemo(() => new Map(tipos.map((t) => [t.id, t])), [tipos]);

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return servicios;
    return servicios.filter((s) => {
      const barbero = barberosById.get(s.barbero_id);
      const tipo = tiposById.get(s.tipo_servicio_id);
      const turno = s.turno_id ? turnosMap.get(s.turno_id) : null;
      const haystack = `${barbero ? fullName(barbero) : ""} ${tipo?.nombre || ""} ${
        turno?.cliente_nombre || ""
      }`.toLowerCase();
      return haystack.includes(q);
    });
  }, [servicios, search, barberosById, tiposById, turnosMap]);

  const stats = useMemo(() => {
    const total = filtered.reduce((acc, s) => acc + Number(s.precio_cobrado), 0);
    const count = filtered.length;
    return {
      total,
      count,
      ticketPromedio: count > 0 ? total / count : 0,
    };
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageItems = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function openPago(servicio) {
    setPagoModal(servicio);
    setPagoForm({
      metodo: "efectivo",
      monto: String(servicio.precio_cobrado),
      estado: "pagado",
      referencia_externa: "",
    });
    setPagoError("");
  }

  async function handlePagoSubmit(e) {
    e.preventDefault();
    setPagoError("");
    if (!pagoForm.monto || Number(pagoForm.monto) <= 0) {
      setPagoError("Ingresá un monto válido.");
      return;
    }
    setSavingPago(true);
    try {
      await pagosApi.create({
        servicio_realizado_id: pagoModal.id,
        metodo: pagoForm.metodo,
        monto: pagoForm.monto,
        estado: pagoForm.estado,
        referencia_externa: pagoForm.referencia_externa.trim() || null,
      });
      toast.success("Pago registrado.");
      setPagoModal(null);
    } catch (err) {
      setPagoError(err.message || "No se pudo registrar el pago.");
    } finally {
      setSavingPago(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard icon={DollarSign} label="Ventas totales" value={formatMoney(stats.total)} accent="primary" />
        <StatCard icon={Scissors} label="Servicios realizados" value={stats.count} accent="secondary" />
        <StatCard icon={Receipt} label="Ticket promedio" value={formatMoney(stats.ticketPromedio)} accent="success" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-inputbg border border-tertiary p-1">
            {[
              ["hoy", "Hoy"],
              ["semana", "7 días"],
              ["mes", "Este mes"],
              ["todo", "Todo"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setPreset(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  preset === key ? "bg-primary text-neutral" : "text-[#9C9488] hover:text-[#F2EDE3]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5 text-[#6b6459]">
            <Filter size={13} />
          </div>
          <SelectInput
            value={barberoFiltro}
            onChange={(e) => setBarberoFiltro(e.target.value)}
            className="!py-1.5 !text-xs w-auto"
          >
            <option value="">Todos los barberos</option>
            {barberos.map((b) => (
              <option key={b.id} value={b.id}>
                {fullName(b)}
              </option>
            ))}
          </SelectInput>
        </div>
      </div>

      <div className="rounded-2xl bg-card border border-primary/[0.12] p-5">
        {loading ? (
          <LoadingBlock label="Cargando historial…" />
        ) : filtered.length === 0 ? (
          <EmptyBlock label="No hay ventas para este filtro." />
        ) : (
          <>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[760px]">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-[#6b6459] border-b border-tertiary">
                    <th className="px-2 py-2.5 font-medium">ID</th>
                    <th className="px-2 py-2.5 font-medium">Fecha / hora</th>
                    <th className="px-2 py-2.5 font-medium">Cliente</th>
                    <th className="px-2 py-2.5 font-medium">Servicio</th>
                    <th className="px-2 py-2.5 font-medium">Barbero</th>
                    <th className="px-2 py-2.5 font-medium text-right">Monto</th>
                    <th className="px-2 py-2.5 font-medium text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((s) => {
                    const barbero = barberosById.get(s.barbero_id);
                    const tipo = tiposById.get(s.tipo_servicio_id);
                    const turno = s.turno_id ? turnosMap.get(s.turno_id) : null;
                    return (
                      <tr key={s.id} className="border-b border-tertiary/60 last:border-0">
                        <td className="px-2 py-3 text-[#6b6459] font-mono text-[11px]">
                          #{s.id.slice(0, 8)}
                        </td>
                        <td className="px-2 py-3 text-[#9C9488] whitespace-nowrap">
                          {formatDateTime(s.fecha_hora)}
                        </td>
                        <td className="px-2 py-3 text-[#F2EDE3]">{turno?.cliente_nombre || "Walk-in"}</td>
                        <td className="px-2 py-3 text-[#9C9488]">{tipo?.nombre || "—"}</td>
                        <td className="px-2 py-3 text-[#9C9488]">{barbero ? fullName(barbero) : "—"}</td>
                        <td className="px-2 py-3 text-right text-primary font-semibold">
                          {formatMoney(s.precio_cobrado)}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <button
                            onClick={() => openPago(s)}
                            title="Registrar pago"
                            className="p-1.5 rounded-lg text-[#6b6459] hover:text-success hover:bg-success-soft transition-colors inline-flex"
                          >
                            <CreditCard size={14} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 mt-1 border-t border-tertiary/60">
              <p className="text-xs text-[#6b6459]">
                Mostrando {page * PAGE_SIZE + 1}-{Math.min((page + 1) * PAGE_SIZE, filtered.length)} de{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="p-1.5 rounded-lg border border-tertiary text-[#9C9488] disabled:opacity-40 hover:text-[#F2EDE3] transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-[#9C9488] px-2 font-mono">
                  {page + 1}/{totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  className="p-1.5 rounded-lg border border-tertiary text-[#9C9488] disabled:opacity-40 hover:text-[#F2EDE3] transition-colors"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <Modal
        open={!!pagoModal}
        onClose={() => !savingPago && setPagoModal(null)}
        title="Registrar pago"
        subtitle={pagoModal ? `Servicio #${pagoModal.id.slice(0, 8)}` : ""}
        footer={
          <>
            <button
              onClick={() => setPagoModal(null)}
              disabled={savingPago}
              className="text-sm px-4 py-2 rounded-lg border border-tertiary text-[#9C9488] hover:text-[#F2EDE3] hover:border-primary/30 transition-colors"
            >
              Cancelar
            </button>
            <button
              form="pago-form"
              type="submit"
              disabled={savingPago}
              className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary text-neutral disabled:opacity-70"
            >
              {savingPago ? "Guardando…" : "Registrar pago"}
            </button>
          </>
        }
      >
        <form id="pago-form" onSubmit={handlePagoSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Método">
              <SelectInput
                value={pagoForm.metodo}
                onChange={(e) => setPagoForm({ ...pagoForm, metodo: e.target.value })}
              >
                {METODOS.map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Monto">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={pagoForm.monto}
                onChange={(e) => setPagoForm({ ...pagoForm, monto: e.target.value })}
              />
            </Field>
          </div>
          <Field label="Estado">
            <SelectInput
              value={pagoForm.estado}
              onChange={(e) => setPagoForm({ ...pagoForm, estado: e.target.value })}
            >
              <option value="pagado">Pagado</option>
              <option value="pendiente">Pendiente</option>
              <option value="reembolsado">Reembolsado</option>
            </SelectInput>
          </Field>
          <Field label="Referencia" hint="Opcional — Nº de operación, últimos 4 dígitos, etc.">
            <TextInput
              value={pagoForm.referencia_externa}
              onChange={(e) => setPagoForm({ ...pagoForm, referencia_externa: e.target.value })}
            />
          </Field>
          {pagoError && (
            <p className="text-[13px] text-danger bg-danger-soft border border-danger/40 rounded-lg px-3 py-2 mt-1">
              {pagoError}
            </p>
          )}
        </form>
      </Modal>
    </div>
  );
}
