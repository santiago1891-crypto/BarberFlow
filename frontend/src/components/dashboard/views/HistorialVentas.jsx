import { useEffect, useMemo, useState, forwardRef, useImperativeHandle, useRef } from "react";
import { DollarSign, Scissors, Receipt, ChevronLeft, ChevronRight, Filter, Plus } from "lucide-react";
import {
  serviciosRealizadosApi,
  barberosApi,
  tiposServicioApi,
  turnosApi,
  fetchAllPages,
} from "../../../lib/resources.js";
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
import { LoadingBlock, EmptyBlock, ErrorBlock } from "../../ui/StateBlocks.jsx";

const PAGE_SIZE = 10;

function rangeFor(preset) {
  const now = new Date();
  // Hasta = fin de hoy (no "ahora"): un servicio registrado hoy con hora
  // posterior a este momento no debía quedar fuera del período.
  const finDeHoy = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
  if (preset === "hoy") {
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    return { fecha_desde: start.toISOString(), fecha_hasta: finDeHoy.toISOString() };
  }
  if (preset === "semana") {
    const start = new Date(now);
    start.setDate(start.getDate() - 7);
    return { fecha_desde: start.toISOString(), fecha_hasta: finDeHoy.toISOString() };
  }
  if (preset === "mes") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
    return { fecha_desde: start.toISOString(), fecha_hasta: finDeHoy.toISOString() };
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
  const [error, setError] = useState("");
  const [preset, setPreset] = useState("mes");
  const [barberoFiltro, setBarberoFiltro] = useState("");
  const [page, setPage] = useState(0);

  const [servicioModalOpen, setServicioModalOpen] = useState(false);
  const [servicioForm, setServicioForm] = useState(EMPTY_SERVICIO_FORM);
  const [savingServicio, setSavingServicio] = useState(false);
  const [servicioError, setServicioError] = useState("");
  // true cuando el usuario escribió el precio a mano: a partir de ahí no se
  // pisa más al cambiar de servicio.
  const [precioEditado, setPrecioEditado] = useState(false);

  // Los catálogos (barberos/servicios) se cargan aparte de las ventas: si
  // alguien pide "Registrar servicio" antes de que lleguen, en vez de
  // fallar con un toast engañoso guardamos el pedido y lo abrimos apenas
  // terminen de cargar.
  const [catalogosListos, setCatalogosListos] = useState(false);
  const [pendienteCrear, setPendienteCrear] = useState(false);
  // Si la carga de catálogos falla, openCreate ofrece reintentar en vez de
  // mostrar "primero cargá un barbero" (que ya existe).
  const [catalogosError, setCatalogosError] = useState("");

  // Número de carga en curso: si responde una vieja, se ignora (así un
  // cambio de filtro lento no pisa al más nuevo).
  const loadIdRef = useRef(0);

  useImperativeHandle(ref, () => ({
    openCreate: () => openCreateServicio(),
  }));

  async function loadCatalogos() {
    try {
      const [b, t] = await Promise.all([
        fetchAllPages(barberosApi.list),
        fetchAllPages(tiposServicioApi.list),
      ]);
      setBarberos(b);
      setTipos(t);
      setCatalogosError("");
      // Solo si la carga salió bien: marcarlo en el finally hacía que
      // openCreate mostrara "cargá un barbero" con la lista rota.
      setCatalogosListos(true);
    } catch (err) {
      setCatalogosError(err.message || "No se pudieron cargar los catálogos.");
    }
  }

  async function loadServicios() {
    const loadId = (loadIdRef.current += 1);
    setLoading(true);
    setError("");
    try {
      const params = { ...rangeFor(preset) };
      if (barberoFiltro) params.barbero_id = barberoFiltro;
      const [data, turnos] = await Promise.all([
        fetchAllPages(serviciosRealizadosApi.list, params),
        // Turnos del MISMO rango que los servicios: antes se cargaban una
        // sola vez (hasta 2000, del más viejo al más nuevo) y con el tiempo
        // los turnos recientes quedaban fuera del mapa → servicios con
        // turno_id aparecían como "Walk-in". El mapa se usa para mostrar y
        // buscar el cliente de cada fila.
        fetchAllPages(turnosApi.list, { fecha_desde: params.fecha_desde, fecha_hasta: params.fecha_hasta }),
      ]);
      if (loadId !== loadIdRef.current) return;
      setTurnosMap(new Map(turnos.map((tu) => [tu.id, tu])));
      setServicios([...data].sort((a, b) => new Date(b.fecha_hora) - new Date(a.fecha_hora)));
      setPage(0);
    } catch (err) {
      if (loadId !== loadIdRef.current) return;
      setError(err.message || "No se pudo cargar el historial de ventas.");
    } finally {
      if (loadId === loadIdRef.current) setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalogos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadServicios();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, barberoFiltro]);

  // El buscador global no recarga la lista, solo filtra el resultado: si la
  // página no vuelve a 0 quedaban tablas vacías ("Mostrando 11-5 de 5").
  useEffect(() => {
    setPage(0);
  }, [search, preset, barberoFiltro]);

  useEffect(() => {
    if (!pendienteCrear || !catalogosListos) return;
    setPendienteCrear(false);
    openCreateServicio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendienteCrear, catalogosListos]);

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
  // Si el filtro encoge la lista, la página pedida puede quedar fuera de
  // rango: clamp acá para no mostrar un tbody vacío con un rango imposible.
  const pagina = Math.min(page, totalPages - 1);
  const pageItems = filtered.slice(pagina * PAGE_SIZE, pagina * PAGE_SIZE + PAGE_SIZE);

  function openCreateServicio() {
    if (catalogosError) {
      // Falló la carga: reintentamos y abrimos apenas esté lista, en vez
      // de culpar al usuario por no tener barberos cargados.
      setCatalogosError("");
      setPendienteCrear(true);
      loadCatalogos();
      return;
    }
    if (!catalogosListos) {
      // Todavía están cargando los catálogos: guardamos el pedido y lo
      // abrimos apenas terminen (ver useEffect de pendienteCrear).
      setPendienteCrear(true);
      return;
    }
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
    setPrecioEditado(false);
    setServicioModalOpen(true);
  }

  function handleBarberoChange(barberoId) {
    setServicioForm((f) => ({ ...f, barbero_id: barberoId }));
  }

  function handleTipoChange(tipoId) {
    const tipo = tiposById.get(tipoId) || tiposActivos.find((t) => t.id === tipoId);
    // Si el tipo no trae comisión (dato viejo, por ejemplo), dejamos "" en
    // vez de mandar 0: al guardar se resuelve con la del barbero. Mandar 0
    // hacía que todos los servicios manuales quedaran con comisión $0 y la
    // ganancia de la barbería se inflaba en los reportes.
    const comisionDelTipo =
      tipo && tipo.comision_pct != null && Number.isFinite(Number(tipo.comision_pct))
        ? String(tipo.comision_pct)
        : "";
    setServicioForm((f) => ({
      ...f,
      tipo_servicio_id: tipoId,
      // Precio: se prellena con la lista del servicio elegido salvo que el
      // usuario ya lo haya editado a mano (descuentos, combos, etc.).
      // La comisión no se edita: es la que está configurada en "Servicios".
      precio_cobrado:
        precioEditado || !tipo || tipo.precio_base == null
          ? f.precio_cobrado
          : String(tipo.precio_base),
      comision_pct: tipo ? comisionDelTipo : f.comision_pct,
    }));
  }

  /** % de comisión a registrar, en orden: formulario (lo del tipo de
   *  servicio) → tipo de servicio → porcentaje del barbero → 0. */
  function comisionARegistrar() {
    const tipo = tiposById.get(servicioForm.tipo_servicio_id);
    const barbero = barberosById.get(Number(servicioForm.barbero_id));
    if (servicioForm.comision_pct !== "") return servicioForm.comision_pct;
    if (tipo?.comision_pct != null && Number.isFinite(Number(tipo.comision_pct))) {
      return String(tipo.comision_pct);
    }
    if (barbero?.porcentaje_comision != null && Number.isFinite(Number(barbero.porcentaje_comision))) {
      return String(barbero.porcentaje_comision);
    }
    return "0";
  }

  async function handleServicioSubmit(e) {
    e.preventDefault();
    setServicioError("");

    if (!servicioForm.barbero_id) {
      setServicioError("Elegí un barbero.");
      return;
    }
    if (!servicioForm.tipo_servicio_id) {
      setServicioError("Elegí un servicio para determinar la comisión.");
      return;
    }
    // Sin esta validación se mandaba fecha_hora: null (columna NOT NULL):
    // el backend respondía 409 con un mensaje de "valor duplicado".
    if (!servicioForm.fecha || !servicioForm.hora) {
      setServicioError("La fecha y la hora son obligatorias.");
      return;
    }
    if (!servicioForm.precio_cobrado || Number(servicioForm.precio_cobrado) < 0) {
      setServicioError("Ingresá un precio válido.");
      return;
    }

    setSavingServicio(true);
    try {
      await serviciosRealizadosApi.create({
        barbero_id: Number(servicioForm.barbero_id),
        tipo_servicio_id: servicioForm.tipo_servicio_id,
        fecha_hora: combineDateAndTime(servicioForm.fecha, servicioForm.hora),
        precio_cobrado: servicioForm.precio_cobrado,
        comision_pct: comisionARegistrar(),
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
      {/* Sin datos reales no se muestran montos: $0.00 durante una carga
          fallida se leía como "hoy no vendí nada". */}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard icon={DollarSign} label="Ventas totales" value={formatMoney(stats.total)} accent="primary" />
          <StatCard icon={Scissors} label="Servicios realizados" value={stats.count} accent="secondary" />
          <StatCard icon={Receipt} label="Ticket promedio" value={formatMoney(stats.ticketPromedio)} accent="success" />
        </div>
      )}

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
        ) : error ? (
          <ErrorBlock label={error} onRetry={loadServicios} />
        ) : filtered.length === 0 ? (
          <EmptyBlock label="No hay ventas para este filtro." />
        ) : (
          <>
            <div className="overflow-x-auto -mx-2">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-[#6b6459] border-b border-tertiary">
                    <th className="px-2 py-2.5 font-medium">ID</th>
                    <th className="px-2 py-2.5 font-medium">Fecha / hora</th>
                    <th className="px-2 py-2.5 font-medium">Cliente</th>
                    <th className="px-2 py-2.5 font-medium">Servicio</th>
                    <th className="px-2 py-2.5 font-medium">Barbero</th>
                    <th className="px-2 py-2.5 font-medium text-right">Monto</th>
                    <th className="px-2 py-2.5 font-medium text-right">Comisión</th>
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
                        <td className="px-2 py-3 text-[#F2EDE3]">
                          {/* "Walk-in" solo si el servicio no vino de turno:
                              si el turno no está en el mapa (borrado o fuera
                              del rango) se muestra "—" en vez de mentir. */}
                          {s.turno_id ? turno?.cliente_nombre || "—" : "Walk-in"}
                        </td>
                        <td className="px-2 py-3 text-[#9C9488]">{tipo?.nombre || "—"}</td>
                        <td className="px-2 py-3 text-[#9C9488]">{barbero ? fullName(barbero) : "—"}</td>
                        <td className="px-2 py-3 text-right text-primary font-semibold">
                          {formatMoney(s.precio_cobrado)}
                        </td>
                        <td className="px-2 py-3 text-right text-[#9C9488]">
                          {formatMoney(s.comision_monto)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-4 mt-1 border-t border-tertiary/60">
              <p className="text-xs text-[#6b6459]">
                Mostrando {pagina * PAGE_SIZE + 1}-{Math.min((pagina + 1) * PAGE_SIZE, filtered.length)} de{" "}
                {filtered.length}
              </p>
              <div className="flex items-center gap-1.5">
                <button
                  disabled={pagina === 0}
                  onClick={() => setPage(Math.max(0, pagina - 1))}
                  className="p-1.5 rounded-lg border border-tertiary text-[#9C9488] disabled:opacity-40 hover:text-[#F2EDE3] transition-colors"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-xs text-[#9C9488] px-2 font-mono">
                  {pagina + 1}/{totalPages}
                </span>
                <button
                  disabled={pagina >= totalPages - 1}
                  onClick={() => setPage(Math.min(totalPages - 1, pagina + 1))}
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

          <Field label="Precio cobrado" hint="Se prellena con el precio de lista del servicio">
            <TextInput
              type="number"
              min="0"
              step="0.01"
              value={servicioForm.precio_cobrado}
              onChange={(e) => {
                setPrecioEditado(true);
                setServicioForm({ ...servicioForm, precio_cobrado: e.target.value });
              }}
            />
          </Field>

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
    </div>
  );
});

export default HistorialVentas;
