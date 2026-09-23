import { createContext, useContext } from "react";
import { frank, type FrankApi } from "./frank";

// Pages get Frank from context so tests can hand them a fake one.
export const FrankContext = createContext<FrankApi>(frank);

export function useFrank(): FrankApi {
  return useContext(FrankContext);
}
