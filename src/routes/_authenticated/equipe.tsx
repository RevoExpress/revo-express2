import { createFileRoute, Navigate } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/equipe")({
  head: () => ({ meta: [{ title: "Équipe — REVO EXPRESS" }] }),
  component: () => <Navigate to="/comptes" />,
});
