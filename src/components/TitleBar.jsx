

/**
 * Reusable Windows 98 TitleBar component.
 * @param {object} props
 * @param {string} props.title Title text
 * @param {Function} props.onClose Close handler
 * @param {Function} [props.onMinimize] Minimize handler
 * @param {Function} [props.onMaximize] Maximize handler
 * @param {boolean} [props.active=true] Whether the window has active focus
 */
export default function TitleBar({ title, onClose, onMinimize, onMaximize, active = true }) {
  return (
    <div className="title-bar" style={{ backgroundColor: active ? "#000080" : "#808080" }}>
      <div className="title-bar-text" style={{ cursor: "default" }}>
        {title}
      </div>
      <div className="title-bar-controls">
        {onMinimize && (
          <button 
            aria-label="Minimize" 
            onClick={(e) => {
              e.stopPropagation();
              onMinimize();
            }} 
          />
        )}
        {onMaximize && (
          <button 
            aria-label="Maximize" 
            onClick={(e) => {
              e.stopPropagation();
              onMaximize();
            }} 
          />
        )}
        {onClose && (
          <button 
            aria-label="Close" 
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }} 
          />
        )}
      </div>
    </div>
  );
}
