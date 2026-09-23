import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "../src/App";
import type { FrankApi, Tool } from "../src/frank";
import { FrankContext } from "../src/FrankContext";

const getStatusTool: Tool = {
  name: "get_status",
  title: "Get Frank's status",
  description: "Returns Frank's version, how long he has been running, and a greeting.",
  inputSchema: { type: "object", properties: {} },
  annotations: { readOnlyHint: true },
};

const searchTool: Tool = {
  name: "search_things",
  description: "Finds things.",
  inputSchema: { type: "object", properties: { query: { type: "string", description: "What to find." } }, required: ["query"] },
  annotations: { readOnlyHint: true },
};

function fakeFrank(overrides: Partial<FrankApi> = {}): FrankApi {
  return {
    health: vi.fn(async () => true),
    listTools: vi.fn(async () => [getStatusTool, searchTool]),
    callTool: vi.fn(async (name: string, args: Record<string, unknown>) => ({
      isError: false,
      summary: name === "get_status" ? "Frank v1.2.3 is up and has been running for 5s." : `found ${String(args.query)}`,
      data: { summary: "x", version: "1.2.3", greeting: "Hi, I'm Frank.", startedAt: "2026-09-01T09:00:00.000Z" },
    })),
    ...overrides,
  };
}

function renderApp(api: FrankApi, hash = "#/") {
  window.location.hash = hash;
  return render(
    <FrankContext.Provider value={api}>
      <App />
    </FrankContext.Provider>,
  );
}

describe("Overview page", () => {
  it("shows get_status output and connection health", async () => {
    const api = fakeFrank();
    renderApp(api);
    expect(await screen.findByTestId("status-summary")).toHaveTextContent("Frank v1.2.3 is up");
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("Connected")).toBeInTheDocument();
    expect(screen.getByText("Hi, I'm Frank.")).toBeInTheDocument();
    expect(api.callTool).toHaveBeenCalledWith("get_status", {});
  });

  it("says plainly when Frank can't be reached", async () => {
    renderApp(
      fakeFrank({
        health: vi.fn(async () => false),
        callTool: vi.fn(async () => {
          throw new Error("Failed to fetch");
        }),
      }),
    );
    expect(await screen.findByText("Couldn't get Frank's status")).toBeInTheDocument();
    expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
    expect(screen.getByText("Unreachable")).toBeInTheDocument();
  });
});

describe("Tools page", () => {
  it("lists discovered tools and calls one from its schema-driven form", async () => {
    const api = fakeFrank();
    const user = userEvent.setup();
    renderApp(api, "#/tools");

    expect(await screen.findByText("search_things")).toBeInTheDocument();
    expect(screen.getByText("This tool takes no input.")).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "search_things" }));
    const submit = await screen.findByRole("button", { name: "Call search_things" });

    await user.click(submit);
    expect(await screen.findByText("Required.")).toBeInTheDocument();
    expect(api.callTool).not.toHaveBeenCalled();

    await user.type(screen.getByRole("textbox"), "vms");
    await user.click(submit);
    await waitFor(() => expect(api.callTool).toHaveBeenCalledWith("search_things", { query: "vms" }));
    expect(await screen.findByText("found vms")).toBeInTheDocument();
  });

  it("shows a tool error as an error, not a crash", async () => {
    const user = userEvent.setup();
    renderApp(
      fakeFrank({
        callTool: vi.fn(async () => ({ isError: true, summary: "Frank can't see that yet.", data: [] })),
      }),
      "#/tools",
    );
    await user.click(await screen.findByRole("button", { name: "Call get_status" }));
    expect(await screen.findByText("Frank returned an error")).toBeInTheDocument();
    expect(screen.getByText("Frank can't see that yet.")).toBeInTheDocument();
  });
});
