import { useEffect, useMemo, useState, forwardRef, useImperativeHandle } from "react";
import {
  DollarSign,
  Scissors,
  Receipt,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  Filter,
  Plus,
} from "lucide-react";
import { serviciosRealizadosApi, barberosApi, tiposServicioApi, turnosApi, pagosApi } from "../../../lib/resources.js";
import {
  formatMoney,
  formatDateTime,
  toDateInputValue,
  toTimeInputValue,
  combineDateAndTime,
} from "../../../lib/format.js";
import { fullName } from "../../../lib/barberStatus.js";
import { toast } from "../../../lib/toast.js";
import StatCard from "../../ui/StatCard.jsx";
import Modal from "../../ui/Modal.jsx";
import { Field, TextInput, SelectInput, TextArea } from "../../ui/Field.jsx";
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

function nowParts() {
  const now = new Date();
  return { fecha: toDateInputValue(now), hora: toTimeInputValue(now) };
}

const EMPTY_SERVICIO_FORM = {
  barbero_id: "",
  tipo_servicio_id: "",
  ...nowParts(),
  precio_cobrado: "",
  comision_pct: "",
  notas: "",
};

const HistorialVentas = forwardRef(function HistorialVentas({ search }, ref) {
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

  const [servicioModalOpen, setServicioModalOpen] = useState(false);
  const [servicioForm, setServicioForm] = useState(EMPTY_SERVICIO_FORM);
  const [savingServicio, setSavingServicio] = useState(false);
  const [servicioError, setServicioError] = useState("");

  useImperativeHandle(ref, () => ({
    openCreate: () => openCreateServicio(),
  }));

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
  const barberosActivos = useMemo(() => barberos.filter((b) => b.activo), [barberos]);
  const tiposActivos = useMemo(() => tipos.filter((t) => t.activo), [tipos]);

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

  function openCreateServicio() {
    if (barberosActivos.length === 0) {
      toast.error('Primero cargá al menos un barbero activo en "Personal".');
      return;
    }
    if (tiposActivos.length === 0) {
      toast.error('Primero cargá al menos un servicio en "Servicios".');
      return;
    }
    setServicioForm({ ...EMPTY_SERVICIO_FORM, ...nowParts() });
    setServicioError("");
    setServicioModalOpen(true);
  }

  function handleBarberoChange(barberoId) {
    const barbero = barberosById.get(Number(barberoId)) || barberosActivos.find((b) => String(b.id) === barberoId);
    setServicioForm((f) => ({
      ...f,
      barbero_id: barberoId,
      // Prellena con la comisión pactada del barbero; queda editable por si
      // este servicio puntual tiene un acuerdo distinto.
      comision_pct: f.comision_pct || (barbero ? String(barbero.porcentaje_comision) : f.comision_pct),
    }));
  }

  function handleTipoChange(tipoId) {
    const tipo = tiposById.get(tipoId) || tiposActivos.find((t) => t.id === tipoId);
    setServicioForm((f) => ({
      ...f,
      tipo_servicio_id: tipoId,
      // Prellena con el precio de lista; queda editable (descuentos, combos, etc.).
      precio_cobrado: f.precio_cobrado || (tipo ? String(tipo.precio_base) : f.precio_cobrado),
    }));
  }

  async function handleServicioSubmit(e) {
    e.preventDefault();
    setServicioError("");

    if (!servicioForm.barbero_id || !servicioForm.tipo_servicio_id) {
      setServicioError("Elegí barbero y servicio.");
      return;
    }
    if (!servicioForm.precio_cobrado || Number(servicioForm.precio_cobrado) < 0) {
      setServicioError("Ingresá un precio válido.");
      return;
    }
    if (servicioForm.comision_pct === "" || Number(servicioForm.comision_pct) < 0) {
      setServicioError("Ingresá un porcentaje de comisión válido.");
      return;
    }

    setSavingServicio(true);
    try {
      await serviciosRealizadosApi.create({
        barbero_id: Number(servicioForm.barbero_id),
        tipo_servicio_id: servicioForm.tipo_servicio_id,
        fecha_hora: combineDateAndTime(servicioForm.fecha, servicioForm.hora),
        precio_cobrado: servicioForm.precio_cobrado,
        comision_pct: servicioForm.comision_pct,
        notas: servicioForm.notas.trim() || null,
      });
      toast.success("Servicio registrado.");
      setServicioModalOpen(false);
      loadServicios();
    } catch (err) {
      setServicioError(err.message || "No se pudo registrar el servicio.");
    } finally {
      setSavingServicio(false);
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

        <button
          onClick={openCreateServicio}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-neutral hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Registrar servicio
        </button>
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
                    <th className="px-2 py-2.5 font-medium text-right">Comisión</th>
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
                        <td className="px-2 py-3 text-right text-[#9C9488]">
                          {formatMoney(s.comision_monto)}
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

      {/* Registrar un servicio realizado directamente (walk-in, sin turno previo) */}
      <Modal
        open={servicioModalOpen}
        onClose={() => !savingServicio && setServicioModalOpen(false)}
        title="Registrar servicio realizado"
        subtitle="Para clientes walk-in, sin cita previa"
        footer={
          <>
            <button
              onClick={() => setServicioModalOpen(false)}
              disabled={savingServicio}
              className="text-sm px-4 py-2 rounded-lg border border-tertiary text-[#9C9488] hover:text-[#F2EDE3] hover:border-primary/30 transition-colors"
            >
              Cancelar
            </button>
            <button
              form="servicio-realizado-form"
              type="submit"
              disabled={savingServicio}
              className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary text-neutral disabled:opacity-70"
            >
              {savingServicio ? "Guardando…" : "Registrar servicio"}
            </button>
          </>
        }
      >
        <form id="servicio-realizado-form" onSubmit={handleServicioSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Barbero">
              <SelectInput
                value={servicioForm.barbero_id}
                onChange={(e) => handleBarberoChange(e.target.value)}
              >
                <option value="">Elegir…</option>
                {barberosActivos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {fullName(b)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Servicio">
              <SelectInput
                value={servicioForm.tipo_servicio_id}
                onChange={(e) => handleTipoChange(e.target.value)}
              >
                <option value="">Elegir…</option>
                {tiposActivos.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha">
              <TextInput
                type="date"
                value={servicioForm.fecha}
                onChange={(e) => setServicioForm({ ...servicioForm, fecha: e.target.value })}
              />
            </Field>
            <Field label="Hora">
              <TextInput
                type="time"
                value={servicioForm.hora}
                onChange={(e) => setServicioForm({ ...servicioForm, hora: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio cobrado" hint="Se prellena con el precio de lista del servicio">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={servicioForm.precio_cobrado}
                onChange={(e) => setServicioForm({ ...servicioForm, precio_cobrado: e.target.value })}
              />
            </Field>
            <Field label="Comisión (%)" hint="Se prellena con la del barbero">
              <TextInput
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={servicioForm.comision_pct}
                onChange={(e) => setServicioForm({ ...servicioForm, comision_pct: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Notas" hint="Opcional">
            <TextArea
              rows={2}
              value={servicioForm.notas}
              onChange={(e) => setServicioForm({ ...servicioForm, notas: e.target.value })}
            />
          </Field>

          {servicioError && (
            <p className="text-[13px] text-danger bg-danger-soft border border-danger/40 rounded-lg px-3 py-2 mt-1">
              {servicioError}
            </p>
          )}
        </form>
      </Modal>

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
});

export default HistorialVentas;
