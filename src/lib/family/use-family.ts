import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getFamilySnapshot } from "./server";
import { localToday } from "@/lib/utils";

export function useFamilyQuery() {
  const today = localToday();
  return useQuery({
    queryKey: ["family", today],
    queryFn: () => getFamilySnapshot({ data: { today } }),
  });
}

export function useFamilyToday() {
  return localToday();
}

export function useRefreshFamily() {
  const queryClient = useQueryClient();
  const today = localToday();
  return () => queryClient.invalidateQueries({ queryKey: ["family", today] });
}
