type Props = {
  text: string;
  isError: boolean;
  length: number;
  maxLength: number;
};

// Rule under a form field with a live character counter, e.g. "12/50".
// The rule turns red when the field has an error.
function FieldHint({ text, isError, length, maxLength }: Props) {
  const atLimit = length >= maxLength;
  return (
    <div className="field-hint">
      <small className={isError ? "field-error" : "hint"}>{text}</small>
      <small className={`char-count${atLimit ? " at-limit" : ""}`} aria-label={`${length} de ${maxLength}`}>
        {length}/{maxLength}
      </small>
    </div>
  );
}

export default FieldHint;
