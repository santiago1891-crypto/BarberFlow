import { useEffect, useImperativeHandle, useMemo, useState, forwardRef } from "react";
import { Plus, Pencil, Trash2, Power, Clock } from "lucide-react";
import { tiposServicioApi } from "../../../lib/resources.js";
import { formatMoney } from "../../../lib/format.js";
import { toast } from "../../../lib/toast.js";
import Badge from "../../ui/Badge.jsx";
import Modal from "../../ui/Modal.jsx";
import ConfirmDialog from "../../ui/ConfirmDialog.jsx";
import { Field, TextInput, TextArea } from "../../ui/Field.jsx";
import { LoadingBlock, EmptyBlock } from "../../ui/StateBlocks.jsx";

const EMPTY_FORM = {
  nombre: "",
  descripcion: "",
  precio_base: "",
  duracion_min: "30",
  activo: true,
};

const Servicios = forwardRef(function Servicios({ search }, ref) {
  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos"); // todos | activos | inactivos

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  useImperativeHandle(ref, () => ({
    openCreate: () => openCreate(),
  }));

  async function load() {
    setLoading(true);
    try {
      const data = await tiposServicioApi.list({ limit: 200 });
      setTipos(data);
    } catch (err) {
      toast.error(err.message || "No se pudieron cargar los servicios.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = tipos;
    if (filtro === "activos") list = list.filter((t) => t.activo);
    if (filtro === "inactivos") list = list.filter((t) => !t.activo);
    const q = (search || "").trim().toLowerCase();
    if (q) list = list.filter((t) => t.nombre.toLowerCase().includes(q));
    return list;
  }, [tipos, filtro, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(t) {
    setEditing(t);
    setForm({
      nombre: t.nombre,
      descripcion: t.descripcion || "",
      precio_base: String(t.precio_base),
      duracion_min: String(t.duracion_min),
      activo: t.activo,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!form.nombre.trim()) {
      setFormError("El nombre del servicio es obligatorio.");
      return;
    }
    if (!form.precio_base || Number(form.precio_base) < 0) {
      setFormError("Ingresá un precio válido.");
      return;
    }
    if (!form.duracion_min || Number(form.duracion_min) <= 0) {
      setFormError("La duración tiene que ser mayor a 0 minutos.");
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      descripcion: form.descripcion.trim() || null,
      precio_base: form.precio_base,
      duracion_min: Number(form.duracion_min),
      activo: form.activo,
    };

    setSaving(true);
    try {
      if (editing) {
        await tiposServicioApi.update(editing.id, payload);
        toast.success("Servicio actualizado.");
      } else {
        await tiposServicioApi.create(payload);
        toast.success("Servicio agregado al catálogo.");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err.message || "No se pudo guardar el servicio.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(t) {
    try {
      await tiposServicioApi.update(t.id, { activo: !t.activo });
      toast.success(t.activo ? "Servicio desactivado." : "Servicio reactivado.");
      load();
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar el estado.");
    }
  }

  async function handleDelete() {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      await tiposServicioApi.remove(confirmTarget.id);
      toast.success("Servicio eliminado.");
      setConfirmTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar el servicio.");
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-inputbg border border-tertiary p-1">
          {[
            ["todos", "Todos"],
            ["activos", "Activos"],
            ["inactivos", "Inactivos"],
          ].map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFiltro(key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                filtro === key ? "bg-primary text-neutral" : "text-[#9C9488] hover:text-[#F2EDE3]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-primary text-neutral hover:bg-primary-dark transition-colors"
        >
          <Plus size={16} strokeWidth={2.5} />
          Nuevo servicio
        </button>
      </div>

      {tipos.length === 0 && !loading && (
        <div className="rounded-lg bg-primary-soft border border-primary/30 px-4 py-3 text-sm text-[#F2EDE3]">
          Todavía no cargaste ningún servicio. Sin al menos uno, no vas a poder agendar citas —
          empezá creando el primero con <strong>"Nuevo servicio"</strong>.
        </div>
      )}

      <div className="rounded-2xl bg-card border border-primary/[0.12] p-5">
        {loading ? (
          <LoadingBlock label="Cargando servicios…" />
        ) : filtered.length === 0 ? (
          <EmptyBlock label="No se encontraron servicios con ese filtro." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[640px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-[#6b6459] border-b border-tertiary">
                  <th className="px-2 py-2.5 font-medium">Servicio</th>
                  <th className="px-2 py-2.5 font-medium">Duración</th>
                  <th className="px-2 py-2.5 font-medium">Precio</th>
                  <th className="px-2 py-2.5 font-medium">Estado</th>
                  <th className="px-2 py-2.5 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} className="border-b border-tertiary/60 last:border-0">
                    <td className="px-2 py-3">
                      <p className="text-[#F2EDE3]">{t.nombre}</p>
                      {t.descripcion && <p className="text-[11px] text-[#6b6459] mt-0.5">{t.descripcion}</p>}
                    </td>
                    <td className="px-2 py-3 text-[#9C9488]">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={12} /> {t.duracion_min} min
                      </span>
                    </td>
                    <td className="px-2 py-3 text-primary font-semibold">{formatMoney(t.precio_base)}</td>
                    <td className="px-2 py-3">
                      <Badge variant={t.activo ? "success" : "danger"}>
                        {t.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleActivo(t)}
                          title={t.activo ? "Desactivar" : "Reactivar"}
                          className="p-1.5 rounded-lg text-[#6b6459] hover:text-warning hover:bg-warning-soft transition-colors"
                        >
                          <Power size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(t)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-[#6b6459] hover:text-primary hover:bg-primary-soft transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmTarget(t)}
                          title="Eliminar"
                          className="p-1.5 rounded-lg text-[#6b6459] hover:text-danger hover:bg-danger-soft transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onClose={() => !saving && setModalOpen(false)}
        title={editing ? "Editar servicio" : "Nuevo servicio"}
        subtitle={editing ? editing.nombre : "Se suma al catálogo de BarberFlow"}
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
              form="servicio-form"
              type="submit"
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary text-neutral disabled:opacity-70"
            >
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Crear servicio"}
            </button>
          </>
        }
      >
        <form id="servicio-form" onSubmit={handleSubmit}>
          <Field label="Nombre">
            <TextInput
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              placeholder="Corte clásico"
            />
          </Field>

          <Field label="Descripción" hint="Opcional">
            <TextArea
              rows={2}
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              placeholder="Detalle breve para el equipo"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Precio">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={form.precio_base}
                onChange={(e) => setForm({ ...form, precio_base: e.target.value })}
                placeholder="25.00"
              />
            </Field>
            <Field label="Duración (min)">
              <TextInput
                type="number"
                min="1"
                step="5"
                value={form.duracion_min}
                onChange={(e) => setForm({ ...form, duracion_min: e.target.value })}
              />
            </Field>
          </div>

          {editing && (
            <label className="flex items-center gap-2 cursor-pointer select-none mb-1">
              <input
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                className="w-3.5 h-3.5 accent-primary"
              />
              <span className="text-xs text-[#9C9488]">Servicio activo</span>
            </label>
          )}

          {formError && (
            <p className="text-[13px] text-danger bg-danger-soft border border-danger/40 rounded-lg px-3 py-2 mt-2">
              {formError}
            </p>
          )}
        </form>
      </Modal>

      <ConfirmDialog
        open={!!confirmTarget}
        onClose={() => setConfirmTarget(null)}
        onConfirm={handleDelete}
        loading={confirmLoading}
        title="Eliminar servicio"
        description={
          confirmTarget
            ? `Vas a eliminar "${confirmTarget.nombre}" definitivamente. Si tiene turnos o ventas asociadas, el backend va a rechazar la eliminación — en ese caso, mejor desactivalo.`
            : ""
        }
        confirmLabel="Eliminar"
      />
    </div>
  );
});

export default Servicios;
