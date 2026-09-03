export function Field({ label, children, hint }) {
  return (
    <div className="mb-4">
      <label className="block mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#9C9488]">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] text-[#6b6459] mt-1">{hint}</p>}
    </div>
  );
}

const baseInput =
  "bf-input w-full rounded-lg py-2.5 px-3.5 text-sm text-[#F2EDE3] bg-inputbg border border-tertiary transition-shadow";

export function TextInput(props) {
  return <input {...props} className={`${baseInput} ${props.className || ""}`} />;
}

export function SelectInput(props) {
  return (
    <select {...props} className={`${baseInput} ${props.className || ""}`}>
      {props.children}
    </select>
  );
}

export function TextArea(props) {
  return <textarea {...props} className={`${baseInput} resize-none ${props.className || ""}`} />;
}
