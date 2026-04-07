export default function Modal({ title, children, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose} role="presentation">
      <div className="modal" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true">
        {title ? <h2 className="modal__title">{title}</h2> : null}
        {children}
      </div>
    </div>
  );
}
