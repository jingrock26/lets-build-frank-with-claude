import Alert from "@cloudscape-design/components/alert";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { useCallback, useEffect, useState } from "react";
import { describeError, type ToolCallOutcome } from "../frank";
import { useFrank } from "../FrankContext";

interface StatusData {
  version?: string;
  startedAt?: string;
  uptimeSeconds?: number;
  greeting?: string;
}

type State =
  | { phase: "loading" }
  | { phase: "done"; healthy: boolean; status?: ToolCallOutcome; error?: string };

// Overview (ADR-003): get_status plus connection health.
export function OverviewPage() {
  const frank = useFrank();
  const [state, setState] = useState<State>({ phase: "loading" });

  const refresh = useCallback(async () => {
    setState({ phase: "loading" });
    const [healthy, status] = await Promise.all([
      frank.health(),
      frank.callTool("get_status", {}).then(
        (outcome) => ({ outcome }),
        (err: unknown) => ({ error: describeError(err) }),
      ),
    ]);
    setState({ phase: "done", healthy, ...("outcome" in status ? { status: status.outcome } : { error: status.error }) });
  }, [frank]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const loading = state.phase === "loading";
  const status = state.phase === "done" ? state.status : undefined;
  const data = (status && !status.isError ? status.data : {}) as StatusData;
  const mcpError = state.phase === "done" ? (state.error ?? (status?.isError ? status.summary : undefined)) : undefined;

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          description="Frank is a read-only MCP server. This console can only see what his tools expose."
          actions={
            <Button iconName="refresh" loading={loading} onClick={() => void refresh()}>
              Refresh
            </Button>
          }
        >
          Overview
        </Header>
      }
    >
      <SpaceBetween size="l">
        {mcpError && (
          <Alert type="error" header="Couldn't get Frank's status">
            {mcpError}
          </Alert>
        )}
        <Container header={<Header variant="h2">Connection</Header>}>
          <KeyValuePairs
            columns={2}
            items={[
              {
                label: "Health (GET /healthz)",
                value: loading ? (
                  <StatusIndicator type="loading">Checking</StatusIndicator>
                ) : state.healthy ? (
                  <StatusIndicator type="success">Healthy</StatusIndicator>
                ) : (
                  <StatusIndicator type="error">Unreachable</StatusIndicator>
                ),
              },
              {
                label: "MCP (POST /mcp)",
                value: loading ? (
                  <StatusIndicator type="loading">Connecting</StatusIndicator>
                ) : mcpError ? (
                  <StatusIndicator type="error">Not responding</StatusIndicator>
                ) : (
                  <StatusIndicator type="success">Connected</StatusIndicator>
                ),
              },
            ]}
          />
        </Container>
        <Container header={<Header variant="h2">Status</Header>}>
          {status && !status.isError ? (
            <SpaceBetween size="m">
              <div data-testid="status-summary">{status.summary}</div>
              <KeyValuePairs
                columns={3}
                items={[
                  { label: "Version", value: data.version ?? "-" },
                  { label: "Started", value: data.startedAt ? new Date(data.startedAt).toLocaleString() : "-" },
                  { label: "Greeting", value: data.greeting ?? "-" },
                ]}
              />
            </SpaceBetween>
          ) : (
            <StatusIndicator type={loading ? "loading" : "stopped"}>{loading ? "Loading" : "No status"}</StatusIndicator>
          )}
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
