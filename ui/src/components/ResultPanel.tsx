import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import type { ToolCallOutcome } from "../frank";

// A tool result: Frank's summary up top (ADR-002), the full JSON underneath.
export function ResultPanel({ outcome }: { outcome: ToolCallOutcome }) {
  return (
    <Container header={<Header variant="h2">Result</Header>}>
      <SpaceBetween size="m">
        <Alert type={outcome.isError ? "error" : "success"} header={outcome.isError ? "Frank returned an error" : undefined}>
          {outcome.summary}
        </Alert>
        <Box variant="code">
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }} data-testid="result-json">
            {JSON.stringify(outcome.data, null, 2)}
          </pre>
        </Box>
      </SpaceBetween>
    </Container>
  );
}
