import './FormField.css';

/**
 * Input genérico con label, validación y mensaje de error.
 * Soporta: text, email, password, number, tel, date, color, textarea, select, checkbox
 */
export default function FormField({
  label,
  type = 'text',
  name,
  value,
  onChange,
  error,
  required = false,
  options = [],
  rows = 3,
  helpText,
  ...props
}) {
  const inputId = `campo-${name}`;

  function renderInput() {
    if (type === 'textarea') {
      return (
        <textarea
          id={inputId}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          rows={rows}
          className={`form-field__input ${error ? 'form-field__input--error' : ''}`}
          {...props}
        />
      );
    }

    if (type === 'select') {
      return (
        <select
          id={inputId}
          name={name}
          value={value ?? ''}
          onChange={onChange}
          className={`form-field__input ${error ? 'form-field__input--error' : ''}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      );
    }

    if (type === 'checkbox') {
      return (
        <input
          id={inputId}
          name={name}
          type="checkbox"
          checked={!!value}
          onChange={onChange}
          className="form-field__checkbox"
          {...props}
        />
      );
    }

    return (
      <input
        id={inputId}
        name={name}
        type={type}
        value={value ?? ''}
        onChange={onChange}
        className={`form-field__input ${type === 'color' ? 'form-field__input--color' : ''} ${error ? 'form-field__input--error' : ''}`}
        {...props}
      />
    );
  }

  if (type === 'checkbox') {
    return (
      <div className="form-field form-field--checkbox">
        {renderInput()}
        <label htmlFor={inputId}>{label}{required && ' *'}</label>
        {error && <span className="form-field__error">{error}</span>}
      </div>
    );
  }

  return (
    <div className="form-field">
      {label && (
        <label htmlFor={inputId} className="form-field__label">
          {label}{required && <span className="form-field__required"> *</span>}
        </label>
      )}
      {renderInput()}
      {helpText && !error && <span className="form-field__help">{helpText}</span>}
      {error && <span className="form-field__error">{error}</span>}
    </div>
  );
}
