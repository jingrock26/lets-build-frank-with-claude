import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import { useCallback, useEffect, useState } from "react";
import { ResultPanel } from "../components/ResultPanel";
import { SchemaForm } from "../components/SchemaForm";
import { describeError, type Tool, type ToolCallOutcome } from "../frank";
import { useFrank } from "../FrankContext";

// Tools (ADR-003): everything MCP discovery returns; pick one, fill in the
// form its schema describes, read the result.
export function ToolsPage() {
  const frank = useFrank();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>();
  const [selected, setSelected] = useState<Tool>();
  const [calling, setCalling] = useState(false);
  const [outcome, setOutcome] = useState<ToolCallOutcome>();

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(undefined);
    try {
      const list = await frank.listTools();
      setTools(list);
      setSelected((s) => list.find((t) => t.name === s?.name) ?? list[0]);
    } catch (err) {
      setLoadError(describeError(err));
    } finally {
      setLoading(false);
    }
  }, [frank]);

  useEffect(() => {
    void load();
  }, [load]);

  const call = async (args: Record<string, unknown>) => {
    if (!selected) return;
    setCalling(true);
    setOutcome(undefined);
    try {
      setOutcome(await frank.callTool(selected.name, args));
    } catch (err) {
      setOutcome({ isError: true, summary: describeError(err), data: null });
    } finally {
      setCalling(false);
    }
  };

  return (
    <ContentLayout
      header={
        <Header variant="h1" description="Frank's tools, as any MCP client discovers them. Every one of them is read-only.">
          Tools
        </Header>
      }
    >
      <SpaceBetween size="l">
        {loadError && (
          <Alert type="error" header="Couldn't list Frank's tools">
            {loadError}
          </Alert>
        )}
        <Table
          header={
            <Header
              counter={loading ? undefined : `(${tools.length})`}
              actions={<Button iconName="refresh" loading={loading} onClick={() => void load()} ariaLabel="Refresh tools" />}
            >
              Available tools
            </Header>
          }
          items={tools}
          loading={loading}
          loadingText="Discovering tools"
          trackBy="name"
          selectionType="single"
          selectedItems={selected ? [selected] : []}
          onSelectionChange={({ detail }) => {
            setSelected(detail.selectedItems[0]);
            setOutcome(undefined);
          }}
          ariaLabels={{ itemSelectionLabel: (_d, t) => t.name, selectionGroupLabel: "Tools" }}
          columnDefinitions={[
            { id: "name", header: "Name", cell: (t) => <Box variant="code">{t.name}</Box>, isRowHeader: true },
            { id: "title", header: "Title", cell: (t) => t.title ?? t.annotations?.title ?? "-" },
            { id: "description", header: "Description", cell: (t) => t.description ?? "-" },
            {
              id: "readOnly",
              header: "Read-only",
              cell: (t) =>
                t.annotations?.readOnlyHint ? (
                  <StatusIndicator type="success">Yes</StatusIndicator>
                ) : (
                  <StatusIndicator type="warning">Not declared</StatusIndicator>
                ),
            },
          ]}
          wrapLines
          empty={<Box textAlign="center">Frank exposes no tools.</Box>}
        />
        {selected && (
          <Container header={<Header variant="h2" description={selected.description}>{`Call ${selected.name}`}</Header>}>
            <SchemaForm
              key={selected.name}
              schema={selected.inputSchema}
              submitLabel={`Call ${selected.name}`}
              loading={calling}
              onSubmit={(args) => void call(args)}
            />
          </Container>
        )}
        {outcome && <ResultPanel outcome={outcome} />}
      </SpaceBetween>
    </ContentLayout>
  );
}
