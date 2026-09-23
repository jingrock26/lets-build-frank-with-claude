import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Checkbox from "@cloudscape-design/components/checkbox";
import Form from "@cloudscape-design/components/form";
import FormField from "@cloudscape-design/components/form-field";
import Input from "@cloudscape-design/components/input";
import Select from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Textarea from "@cloudscape-design/components/textarea";
import { useMemo, useState } from "react";
import { buildArguments, fieldsFromSchema, initialValues, type Field, type FormValues } from "../schema";

interface Props {
  schema: unknown;
  submitLabel: string;
  loading: boolean;
  onSubmit: (args: Record<string, unknown>) => void;
}

// Renders a form straight from a tool's input schema (ADR-003).
export function SchemaForm({ schema, submitLabel, loading, onSubmit }: Props) {
  const fields = useMemo(() => fieldsFromSchema(schema), [schema]);
  const [values, setValues] = useState<FormValues>(() => initialValues(fields));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (name: string, value: string | boolean) => setValues((v) => ({ ...v, [name]: value }));

  const submit = () => {
    const result = buildArguments(fields, values);
    if (!result.ok) {
      setErrors(result.errors);
      return;
    }
    setErrors({});
    onSubmit(result.args);
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <Form
        actions={
          <Button variant="primary" formAction="submit" loading={loading}>
            {submitLabel}
          </Button>
        }
      >
        <SpaceBetween size="l">
          {fields.length === 0 && <Box color="text-body-secondary">This tool takes no input.</Box>}
          {fields.map((f) => (
            <FormField
              key={f.name}
              label={f.label}
              description={f.description}
              errorText={errors[f.name]}
              info={f.required ? undefined : <i>optional</i>}
              stretch
            >
              <FieldControl field={f} value={values[f.name]} onChange={(v) => set(f.name, v)} />
            </FormField>
          ))}
        </SpaceBetween>
      </Form>
    </form>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: Field;
  value: string | boolean | undefined;
  onChange: (value: string | boolean) => void;
}) {
  const text = typeof value === "string" ? value : "";
  switch (field.kind) {
    case "boolean":
      return (
        <Checkbox checked={value === true} onChange={({ detail }) => onChange(detail.checked)}>
          {field.label}
        </Checkbox>
      );
    case "enum": {
      const options = [
        ...(field.required ? [] : [{ label: "(none)", value: "" }]),
        ...(field.options ?? []).map((o) => ({ label: o, value: o })),
      ];
      return (
        <Select
          selectedOption={options.find((o) => o.value === text) ?? null}
          options={options}
          placeholder="Choose a value"
          onChange={({ detail }) => onChange(detail.selectedOption.value ?? "")}
        />
      );
    }
    case "number":
    case "integer":
      return <Input type="number" inputMode="decimal" value={text} onChange={({ detail }) => onChange(detail.value)} />;
    case "list":
      return (
        <Textarea value={text} placeholder="One value per line" onChange={({ detail }) => onChange(detail.value)} />
      );
    case "json":
      return <Textarea value={text} placeholder="JSON" onChange={({ detail }) => onChange(detail.value)} />;
    default:
      return <Input value={text} onChange={({ detail }) => onChange(detail.value)} />;
  }
}
