import { useEffect, useMemo, useState, useImperativeHandle, forwardRef } from "react";
import { Plus, Pencil, Trash2, CheckCircle2, PlayCircle, XCircle, CalendarCheck } from "lucide-react";
import { turnosApi, barberosApi, tiposServicioApi } from "../../../lib/resources.js";
import {
  formatDateTime,
  toDateInputValue,
  toTimeInputValue,
  combineDateAndTime,
} from "../../../lib/format.js";
import { fullName } from "../../../lib/barberStatus.js";
import { toast } from "../../../lib/toast.js";
import Badge from "../../ui/Badge.jsx";
import Modal from "../../ui/Modal.jsx";
import ConfirmDialog from "../../ui/ConfirmDialog.jsx";
import { Field, TextInput, SelectInput, TextArea } from "../../ui/Field.jsx";
import { LoadingBlock, EmptyBlock } from "../../ui/StateBlocks.jsx";

const ESTADO_META = {
  pendiente: { label: "Pendiente", variant: "warning" },
  confirmado: { label: "Confirmado", variant: "primary" },
  en_curso: { label: "En curso", variant: "success" },
  completado: { label: "Completado", variant: "neutral" },
  cancelado: { label: "Cancelado", variant: "danger" },
};

// Debe coincidir exactamente con TRANSICIONES_VALIDAS en app/crud/turno.py del
// backend. Si un botón de acción rápida permite un salto que el backend no
// acepta (por ejemplo pendiente -> en_curso, saltándose "confirmado"), el
// backend responde 409 y la acción "no hace nada" a los ojos del usuario.
const TRANSICIONES_VALIDAS = {
  pendiente: ["confirmado", "cancelado"],
  confirmado: ["en_curso", "cancelado"],
  en_curso: ["completado", "cancelado"],
  completado: [],
  cancelado: [],
};

function nowParts() {
  const now = new Date();
  return { fecha: toDateInputValue(now), hora: toTimeInputValue(now) };
}

const EMPTY_FORM = {
  barbero_id: "",
  tipo_servicio_id: "",
  ...nowParts(),
  cliente_nombre: "",
  cliente_telefono: "",
  notas: "",
};

const Citas = forwardRef(function Citas({ search }, ref) {
  const [turnos, setTurnos] = useState([]);
  const [barberos, setBarberos] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rango, setRango] = useState("hoy"); // hoy | todos
  const [estadoFiltro, setEstadoFiltro] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmAction, setConfirmAction] = useState(null); // { type: 'completar'|'cancelar'|'eliminar', turno }
  const [confirmLoading, setConfirmLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    openCreate: () => openCreate(),
  }));

  async function loadCatalogos() {
    try {
      const [b, t] = await Promise.all([
        barberosApi.list({ activo: true, limit: 200 }),
        tiposServicioApi.list({ activo: true, limit: 200 }),
      ]);
      setBarberos(b);
      setTipos(t);
    } catch (err) {
      toast.error(err.message || "No se pudieron cargar barberos/servicios.");
    }
  }

  async function loadTurnos() {
    setLoading(true);
    try {
      const params = { limit: 200 };
      if (rango === "hoy") {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
        const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
        params.fecha_desde = start.toISOString();
        params.fecha_hasta = end.toISOString();
      }
      if (estadoFiltro) params.estado = estadoFiltro;
      const data = await turnosApi.list(params);
      setTurnos(data.sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora)));
    } catch (err) {
      toast.error(err.message || "No se pudieron cargar los turnos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadCatalogos();
  }, []);

  useEffect(() => {
    loadTurnos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rango, estadoFiltro]);

  const barberosById = useMemo(() => new Map(barberos.map((b) => [b.id, b])), [barberos]);
  const tiposById = useMemo(() => new Map(tipos.map((t) => [t.id, t])), [tipos]);

  const filtered = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return turnos;
    return turnos.filter((t) => {
      const barbero = barberosById.get(t.barbero_id);
      const tipo = tiposById.get(t.tipo_servicio_id);
      const haystack = `${t.cliente_nombre || ""} ${barbero ? fullName(barbero) : ""} ${
        tipo?.nombre || ""
      }`.toLowerCase();
      return haystack.includes(q);
    });
  }, [turnos, search, barberosById, tiposById]);

  function openCreate() {
    if (tipos.length === 0) {
      toast.error('Primero cargá al menos un servicio en "Servicios" — sin eso no se puede agendar.');
      return;
    }
    setEditing(null);
    setForm({ ...EMPTY_FORM, ...nowParts() });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({
      barbero_id: String(t.barbero_id),
      tipo_servicio_id: t.tipo_servicio_id,
      fecha: toDateInputValue(t.fecha_hora),
      hora: toTimeInputValue(t.fecha_hora),
      cliente_nombre: t.cliente_nombre || "",
      cliente_telefono: t.cliente_telefono || "",
      notas: t.notas || "",
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!form.barbero_id || !form.tipo_servicio_id || !form.fecha || !form.hora) {
      setFormError("Barbero, servicio y fecha/hora son obligatorios.");
      return;
    }

    const payload = {
      barbero_id: Number(form.barbero_id),
      tipo_servicio_id: form.tipo_servicio_id,
      fecha_hora: combineDateAndTime(form.fecha, form.hora),
      cliente_nombre: form.cliente_nombre.trim() || null,
      cliente_telefono: form.cliente_telefono.trim() || null,
      notas: form.notas.trim() || null,
    };

    setSaving(true);
    try {
      if (editing) {
        await turnosApi.update(editing.id, payload);
        toast.success("Turno actualizado.");
      } else {
        await turnosApi.create(payload);
        toast.success("Turno agendado.");
      }
      setModalOpen(false);
      await loadTurnos();
    } catch (err) {
      // Ej: superposición de horario con otro turno del mismo barbero,
      // o transición de estado inválida — el backend manda el detalle.
      setFormError(err.message || "No se pudo guardar el turno.");
    } finally {
      setSaving(false);
    }
  }

  async function quickUpdateEstado(turno, estado) {
    if (!TRANSICIONES_VALIDAS[turno.estado]?.includes(estado)) {
      toast.error(
        `No se puede pasar de "${ESTADO_META[turno.estado]?.label}" a "${ESTADO_META[estado]?.label}" directamente.`
      );
      return;
    }
    try {
      await turnosApi.update(turno.id, { estado });
      toast.success("Estado del turno actualizado.");
      loadTurnos();
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar el turno.");
    }
  }

  async function handleConfirmAction() {
    if (!confirmAction) return;
    setConfirmLoading(true);
    try {
      if (confirmAction.type === "completar") {
        await turnosApi.completar(confirmAction.turno.id, {});
        toast.success("Turno completado y registrado como servicio.");
      } else if (confirmAction.type === "cancelar") {
        await turnosApi.update(confirmAction.turno.id, { estado: "cancelado" });
        toast.success("Turno cancelado.");
      } else if (confirmAction.type === "eliminar") {
        await turnosApi.remove(confirmAction.turno.id);
        toast.success("Turno eliminado.");
      }
      setConfirmAction(null);
      loadTurnos();
    } catch (err) {
      toast.error(err.message || "No se pudo completar la acción.");
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-lg bg-inputbg border border-tertiary p-1">
            {[
              ["hoy", "Hoy"],
              ["todos", "Todos"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setRango(key)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  rango === key ? "bg-primary text-neutral" : "text-[#9C9488] hover:text-[#F2EDE3]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <SelectInput
            value={estadoFiltro}
            onChange={(e) => setEstadoFiltro(e.target.value)}
            className="!py-1.5 !text-xs w-auto"
          >
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_META).map(([key, meta]) => (
              <option key={key} value={key}>
                {meta.label}
              </option>
            ))}
          </SelectInput>
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-neutral hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nueva cita
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-primary/[0.12] p-5">
        {loading ? (
          <LoadingBlock label="Cargando citas…" />
        ) : filtered.length === 0 ? (
          <EmptyBlock label="No hay turnos para este filtro." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-[#6b6459] border-b border-tertiary">
                  <th className="px-2 py-2.5 font-medium">Fecha / hora</th>
                  <th className="px-2 py-2.5 font-medium">Cliente</th>
                  <th className="px-2 py-2.5 font-medium">Servicio</th>
                  <th className="px-2 py-2.5 font-medium">Barbero</th>
                  <th className="px-2 py-2.5 font-medium">Estado</th>
                  <th className="px-2 py-2.5 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  const barbero = barberosById.get(t.barbero_id);
                  const tipo = tiposById.get(t.tipo_servicio_id);
                  const meta = ESTADO_META[t.estado] || ESTADO_META.pendiente;
                  const permitidos = TRANSICIONES_VALIDAS[t.estado] || [];
                  const finalizado = permitidos.length === 0;
                  return (
                    <tr key={t.id} className="border-b border-tertiary/60 last:border-0 align-top">
                      <td className="px-2 py-3 text-[#9C9488] whitespace-nowrap">
                        {formatDateTime(t.fecha_hora)}
                      </td>
                      <td className="px-2 py-3">
                        <p className="text-[#F2EDE3]">{t.cliente_nombre || "Walk-in"}</p>
                        {t.cliente_telefono && (
                          <p className="text-[11px] text-[#6b6459]">{t.cliente_telefono}</p>
                        )}
                      </td>
                      <td className="px-2 py-3 text-[#9C9488]">{tipo?.nombre || "—"}</td>
                      <td className="px-2 py-3 text-[#9C9488]">{barbero ? fullName(barbero) : "—"}</td>
                      <td className="px-2 py-3">
                        <Badge variant={meta.variant} pulse={t.estado === "en_curso"}>
                          {meta.label}
                        </Badge>
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {permitidos.includes("confirmado") && (
                            <button
                              onClick={() => quickUpdateEstado(t, "confirmado")}
                              title="Confirmar"
                              className="p-1.5 rounded-lg text-[#6b6459] hover:text-primary hover:bg-primary-soft transition-colors"
                            >
                              <CalendarCheck size={14} />
                            </button>
                          )}
                          {permitidos.includes("en_curso") && (
                            <button
                              onClick={() => quickUpdateEstado(t, "en_curso")}
                              title="Iniciar"
                              className="p-1.5 rounded-lg text-[#6b6459] hover:text-warning hover:bg-warning-soft transition-colors"
                            >
                              <PlayCircle size={14} />
                            </button>
                          )}
                          {permitidos.includes("completado") && (
                            <button
                              onClick={() => setConfirmAction({ type: "completar", turno: t })}
                              title="Completar (genera el servicio realizado)"
                              className="p-1.5 rounded-lg text-[#6b6459] hover:text-success hover:bg-success-soft transition-colors"
                            >
                              <CheckCircle2 size={14} />
                            </button>
                          )}
                          {!finalizado && (
                            <button
                              onClick={() => openEdit(t)}
                              title="Editar"
                              className="p-1.5 rounded-lg text-[#6b6459] hover:text-primary hover:bg-primary-soft transition-colors"
                            >
                              <Pencil size={14} />
                            </button>
                          )}
                          {permitidos.includes("cancelado") && (
                            <button
                              onClick={() => setConfirmAction({ type: "cancelar", turno: t })}
                              title="Cancelar"
                              className="p-1.5 rounded-lg text-[#6b6459] hover:text-danger hover:bg-danger-soft transition-colors"
                            >
                              <XCircle size={14} />
                            </button>
                          )}
                          <button
                            onClick={() => setConfirmAction({ type: "eliminar", turno: t })}
                            title="Eliminar"
                            className="p-1.5 rounded-lg text-[#6b6459] hover:text-danger hover:bg-danger-soft transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Editar cita" : "Nueva cita"}
        footer={
          <>
            <button
              onClick={() => setModalOpen(false)}
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg border border-tertiary text-[#9C9488] hover:text-[#F2EDE3] hover:border-primary/30 transition-colors"
            >
              Cancelar
            </button>
            <button
              form="turno-form"
              type="submit"
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary text-neutral disabled:opacity-70"
            >
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Agendar cita"}
            </button>
          </>
        }
      >
        <form id="turno-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Barbero">
              <SelectInput
                value={form.barbero_id}
                onChange={(e) => setForm({ ...form, barbero_id: e.target.value })}
              >
                <option value="">Elegir…</option>
                {barberos.map((b) => (
                  <option key={b.id} value={b.id}>
                    {fullName(b)}
                  </option>
                ))}
              </SelectInput>
            </Field>
            <Field label="Servicio">
              <SelectInput
                value={form.tipo_servicio_id}
                onChange={(e) => setForm({ ...form, tipo_servicio_id: e.target.value })}
              >
                <option value="">Elegir…</option>
                {tipos.map((t) => (
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
                value={form.fecha}
                onChange={(e) => setForm({ ...form, fecha: e.target.value })}
              />
            </Field>
            <Field label="Hora">
              <TextInput
                type="time"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Cliente">
              <TextInput
                value={form.cliente_nombre}
                onChange={(e) => setForm({ ...form, cliente_nombre: e.target.value })}
                placeholder="Nombre del cliente"
              />
            </Field>
            <Field label="Teléfono">
              <TextInput
                value={form.cliente_telefono}
                onChange={(e) => setForm({ ...form, cliente_telefono: e.target.value })}
                placeholder="+598 99 123 456"
              />
            </Field>
          </div>

          <Field label="Notas">
            <TextArea
              rows={2}
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
              placeholder="Opcional"
            />
          </Field>

          {formError && (
            <p className="text-[13px] text-danger bg-danger-soft border border-danger/40 rounded-lg px-3 py-2 mt-1">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        onConfirm={handleConfirmAction}
        loading={confirmLoading}
        danger={confirmAction?.type !== "completar"}
        confirmLabel={
          confirmAction?.type === "completar"
            ? "Completar"
            : confirmAction?.type === "cancelar"
              ? "Cancelar cita"
              : "Eliminar"
        }
        title={
          confirmAction?.type === "completar"
            ? "Completar turno"
            : confirmAction?.type === "cancelar"
              ? "Cancelar turno"
              : "Eliminar turno"
        }
        description={
          confirmAction?.type === "completar"
            ? "Se va a registrar como servicio realizado, tomando el precio y la comisión configurados. Esta acción no se puede deshacer."
            : confirmAction?.type === "cancelar"
              ? "El turno va a quedar marcado como cancelado."
              : "Esta acción borra el turno definitivamente."
        }
      />
    </div>
  );
});

export default Citas;
