import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Power, Phone, Mail as MailIcon } from "lucide-react";
import { barberosApi } from "../../../lib/resources.js";
import { formatMoney, initials } from "../../../lib/format.js";
import { fullName } from "../../../lib/barberStatus.js";
import { toast } from "../../../lib/toast.js";
import Badge from "../../ui/Badge.jsx";
import Modal from "../../ui/Modal.jsx";
import ConfirmDialog from "../../ui/ConfirmDialog.jsx";
import { Field, TextInput } from "../../ui/Field.jsx";
import { LoadingBlock, EmptyBlock } from "../../ui/StateBlocks.jsx";

const EMPTY_FORM = {
  nombre: "",
  apellido: "",
  telefono: "",
  email: "",
  sueldo_fijo: "0",
  porcentaje_comision: "0",
  activo: true,
};

export default function Personal({ search }) {
  const [barberos, setBarberos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos"); // todos | activos | inactivos

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [confirmTarget, setConfirmTarget] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const data = await barberosApi.list({ limit: 200 });
      setBarberos(data);
    } catch (err) {
      toast.error(err.message || "No se pudieron cargar los barberos.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    let list = barberos;
    if (filtro === "activos") list = list.filter((b) => b.activo);
    if (filtro === "inactivos") list = list.filter((b) => !b.activo);
    const q = (search || "").trim().toLowerCase();
    if (q)
      list = list.filter(
        (b) => fullName(b).toLowerCase().includes(q) || (b.email || "").toLowerCase().includes(q)
      );
    return list;
  }, [barberos, filtro, search]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(b) {
    setEditing(b);
    setForm({
      nombre: b.nombre,
      apellido: b.apellido,
      telefono: b.telefono || "",
      email: b.email || "",
      sueldo_fijo: String(b.sueldo_fijo),
      porcentaje_comision: String(b.porcentaje_comision),
      activo: b.activo,
    });
    setFormError("");
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!form.nombre.trim() || !form.apellido.trim()) {
      setFormError("Nombre y apellido son obligatorios.");
      return;
    }

    const payload = {
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      telefono: form.telefono.trim() || null,
      email: form.email.trim() || null,
      sueldo_fijo: form.sueldo_fijo || "0",
      porcentaje_comision: form.porcentaje_comision || "0",
      activo: form.activo,
    };

    setSaving(true);
    try {
      if (editing) {
        await barberosApi.update(editing.id, payload);
        toast.success("Barbero actualizado.");
      } else {
        await barberosApi.create(payload);
        toast.success("Barbero agregado al equipo.");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setFormError(err.message || "No se pudo guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActivo(b) {
    try {
      await barberosApi.update(b.id, { activo: !b.activo });
      toast.success(b.activo ? "Barbero desactivado." : "Barbero reactivado.");
      load();
    } catch (err) {
      toast.error(err.message || "No se pudo actualizar el estado.");
    }
  }

  async function handleDelete() {
    if (!confirmTarget) return;
    setConfirmLoading(true);
    try {
      await barberosApi.remove(confirmTarget.id);
      toast.success("Barbero eliminado.");
      setConfirmTarget(null);
      load();
    } catch (err) {
      toast.error(err.message || "No se pudo eliminar (puede tener turnos o servicios asociados).");
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
          Añadir barbero
        </button>
      </div>

      <div className="rounded-2xl bg-card border border-primary/[0.12] p-5">
        {loading ? (
          <LoadingBlock label="Cargando personal…" />
        ) : filtered.length === 0 ? (
          <EmptyBlock label="No se encontraron barberos con ese filtro." />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <table className="w-full text-sm min-w-[720px]">
              <thead>
                <tr className="text-left font-mono text-[10px] uppercase tracking-wide text-[#6b6459] border-b border-tertiary">
                  <th className="px-2 py-2.5 font-medium">Barbero</th>
                  <th className="px-2 py-2.5 font-medium">Contacto</th>
                  <th className="px-2 py-2.5 font-medium">Comisión</th>
                  <th className="px-2 py-2.5 font-medium">Sueldo fijo</th>
                  <th className="px-2 py-2.5 font-medium">Estado</th>
                  <th className="px-2 py-2.5 font-medium text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr key={b.id} className="border-b border-tertiary/60 last:border-0">
                    <td className="px-2 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-[10px] font-mono font-bold text-[#F2EDE3] shrink-0">
                          {initials(b.nombre, b.apellido)}
                        </div>
                        <span className="text-[#F2EDE3]">{fullName(b)}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3 text-[#9C9488]">
                      <div className="flex flex-col gap-0.5 text-xs">
                        {b.telefono && (
                          <span className="flex items-center gap-1.5">
                            <Phone size={11} /> {b.telefono}
                          </span>
                        )}
                        {b.email && (
                          <span className="flex items-center gap-1.5">
                            <MailIcon size={11} /> {b.email}
                          </span>
                        )}
                        {!b.telefono && !b.email && "—"}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-[#9C9488]">{Number(b.porcentaje_comision)}%</td>
                    <td className="px-2 py-3 text-[#9C9488]">{formatMoney(b.sueldo_fijo)}</td>
                    <td className="px-2 py-3">
                      <Badge variant={b.activo ? "success" : "danger"}>
                        {b.activo ? "Activo" : "Inactivo"}
                      </Badge>
                    </td>
                    <td className="px-2 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleActivo(b)}
                          title={b.activo ? "Desactivar" : "Reactivar"}
                          className="p-1.5 rounded-lg text-[#6b6459] hover:text-warning hover:bg-warning-soft transition-colors"
                        >
                          <Power size={14} />
                        </button>
                        <button
                          onClick={() => openEdit(b)}
                          title="Editar"
                          className="p-1.5 rounded-lg text-[#6b6459] hover:text-primary hover:bg-primary-soft transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setConfirmTarget(b)}
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
        title={editing ? "Editar barbero" : "Añadir barbero"}
        subtitle={editing ? fullName(editing) : "Se suma al equipo de BarberFlow"}
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
              form="barbero-form"
              type="submit"
              disabled={saving}
              className="text-sm px-4 py-2 rounded-lg font-semibold bg-primary text-neutral disabled:opacity-70 flex items-center gap-2"
            >
              {saving ? "Guardando…" : editing ? "Guardar cambios" : "Añadir barbero"}
            </button>
          </>
        }
      >
        <form id="barbero-form" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nombre">
              <TextInput
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Alejandro"
              />
            </Field>
            <Field label="Apellido">
              <TextInput
                value={form.apellido}
                onChange={(e) => setForm({ ...form, apellido: e.target.value })}
                placeholder="Silva"
              />
            </Field>
          </div>

          <Field label="Teléfono">
            <TextInput
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              placeholder="+598 99 123 456"
            />
          </Field>

          <Field label="Email">
            <TextInput
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="alejandro@barberflow.com"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Sueldo fijo">
              <TextInput
                type="number"
                min="0"
                step="0.01"
                value={form.sueldo_fijo}
                onChange={(e) => setForm({ ...form, sueldo_fijo: e.target.value })}
              />
            </Field>
            <Field label="Comisión (%)">
              <TextInput
                type="number"
                min="0"
                max="100"
                step="0.01"
                value={form.porcentaje_comision}
                onChange={(e) => setForm({ ...form, porcentaje_comision: e.target.value })}
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
              <span className="text-xs text-[#9C9488]">Barbero activo</span>
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
        title="Eliminar barbero"
        description={
          confirmTarget
            ? `Vas a eliminar a ${fullName(confirmTarget)} definitivamente. Si tiene turnos o servicios asociados, el backend puede rechazar esta acción — en ese caso, mejor desactivalo.`
            : ""
        }
        confirmLabel="Eliminar"
      />
    </div>
  );
}
