export default function StatusFilter({ options, value, onChange }) {
  return (
    <div className="no-scrollbar -mx-4 mb-4 flex gap-2 overflow-x-auto px-4">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={`chip capitalize ${value === o ? 'chip-active' : 'chip-idle'}`}
        >
          {o}
        </button>
      ))}
    </div>
  );
}
