import {useState} from 'react';
import {
  FIELD_PREFIX,
  choicesOf,
  isEditable,
  labelOf,
  referenceTypeOf,
  type FieldDef,
} from '~/lib/schema-fields';

type Options = Record<
  string,
  Array<{id: string; label: string; handle?: string}>
>;

function parseList(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/** One control for one schema field, chosen by its type, with its name and help text. */
export function FieldInput({
  field,
  value,
  options,
  error,
  image,
}: {
  field: FieldDef;
  value?: string;
  options: Options;
  error?: string;
  image?: string;
}) {
  const name = FIELD_PREFIX + field.key;
  const id = `field-${field.key}`;
  const editable = isEditable(field);
  const choices = choicesOf(field);
  const refType = referenceTypeOf(field);
  const help = (
    <small className="field-help">
      {field.description}
      {!editable ? ' Set automatically.' : ''}
    </small>
  );
  const label = (
    <label htmlFor={id}>
      {field.name}
      {field.required ? <span className="req"> *</span> : null}
    </label>
  );

  let control: React.ReactNode;
  if (!editable || field.type === 'date_time') {
    control = (
      <output id={id} className="field-readonly">
        {value ? labelOf(value) : '—'}
      </output>
    );
  } else if (field.type === 'boolean') {
    control = (
      <select id={id} name={name} defaultValue={value ?? ''}>
        <option value="">Not stated</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    );
  } else if (choices) {
    control = (
      <select
        id={id}
        name={name}
        defaultValue={value ?? ''}
        required={field.required}
      >
        <option value="">Choose</option>
        {choices.map((choice) => (
          <option key={choice} value={choice}>
            {labelOf(choice)}
          </option>
        ))}
      </select>
    );
  } else if (field.type === 'metaobject_reference' && refType) {
    control = (
      <select
        id={id}
        name={name}
        defaultValue={value ?? ''}
        required={field.required}
      >
        <option value="">Choose</option>
        {(options[refType] ?? []).map((option) => (
          <option key={option.id} value={option.id}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else if (field.type === 'list.metaobject_reference' && refType) {
    return (
      <MultiPick
        field={field}
        name={name}
        selected={parseList(value)}
        options={options[refType] ?? []}
        error={error}
      />
    );
  } else if (field.type === 'list.url') {
    control = (
      <textarea
        id={id}
        name={name}
        rows={3}
        defaultValue={parseList(value).join('\n')}
        placeholder="One link per line"
      />
    );
  } else if (field.type === 'multi_line_text_field') {
    control = (
      <textarea
        id={id}
        name={name}
        rows={4}
        defaultValue={value ?? ''}
        required={field.required}
      />
    );
  } else if (
    field.type === 'number_integer' ||
    field.type === 'number_decimal'
  ) {
    control = (
      <input
        id={id}
        name={name}
        type="number"
        inputMode="decimal"
        step={field.type === 'number_integer' ? 1 : 0.1}
        defaultValue={value ?? ''}
        required={field.required}
      />
    );
  } else if (field.type === 'file_reference') {
    control = (
      <div className="file-field">
        {image ? <img src={image} alt="" className="file-preview" /> : null}
        <input
          id={id}
          name={`file.${field.key}`}
          type="file"
          accept="image/*"
        />
      </div>
    );
  } else {
    control = (
      <input
        id={id}
        name={name}
        type={field.type === 'url' ? 'url' : 'text'}
        defaultValue={value ?? ''}
        required={field.required}
      />
    );
  }

  return (
    <div className={`field${error ? ' field-error' : ''}`}>
      {label}
      {control}
      {error ? <small className="error-text">{error}</small> : help}
    </div>
  );
}

function MultiPick({
  field,
  name,
  selected,
  options,
  error,
}: {
  field: FieldDef;
  name: string;
  selected: string[];
  options: Array<{id: string; label: string; handle?: string}>;
  error?: string;
}) {
  const [filter, setFilter] = useState('');
  const shown = options.filter((option) =>
    option.label.toLowerCase().includes(filter.toLowerCase()),
  );
  return (
    <fieldset
      className={`field multipick${error ? ' field-error' : ''}`}
      data-field={field.key}
      // Once staff choose by hand, nothing chosen for them overwrites it.
      onChange={(event) => {
        if (event.isTrusted) event.currentTarget.dataset.touched = 'true';
      }}
    >
      <legend>{field.name}</legend>
      {options.length > 12 ? (
        <input
          type="search"
          placeholder={`Find a ${field.name.toLowerCase()}`}
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          aria-label={`Filter ${field.name}`}
        />
      ) : null}
      <div className="multipick-options">
        {options.length === 0 ? (
          <span className="muted">None yet. Run pnpm shopify:setup.</span>
        ) : null}
        {options.map((option) => (
          <label key={option.id} hidden={!shown.includes(option)}>
            <input
              type="checkbox"
              name={name}
              value={option.id}
              data-handle={option.handle}
              defaultChecked={selected.includes(option.id)}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error ? (
        <small className="error-text">{error}</small>
      ) : (
        <small className="field-help">{field.description}</small>
      )}
    </fieldset>
  );
}

export function ErrorList({
  error,
}: {
  error?: {message: string; detail: string[]} | null;
}) {
  if (!error) return null;
  return (
    <div className="notice notice-error" role="alert">
      <strong>{error.message}</strong>
      {error.detail.length ? (
        <ul>
          {error.detail.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
